#!/usr/bin/env node
/**
 * Hymnary.org MIDI Downloader
 * 
 * Safely downloads MIDI files from Hymnary.org's popular tunes page.
 * Includes rate limiting and respectful scraping practices.
 * 
 * Requirements:
 *   npm install node-fetch cheerio
 * 
 * Usage:
 *   node scripts/download-hymns.js [--limit 50] [--output ./downloaded-midis]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Try to load cheerio and node-fetch
let cheerio, fetch;
try {
  cheerio = require('cheerio');
  fetch = require('node-fetch');
} catch (e) {
  console.error('Error: Missing dependencies. Please install them with:');
  console.error('  npm install cheerio node-fetch');
  process.exit(1);
}

// Rate limiting: wait between requests (milliseconds)
const DELAY_BETWEEN_REQUESTS = 1000; // 1 second
const DELAY_BETWEEN_PAGES = 2000; // 2 seconds between pages

// Parse command line arguments
const args = process.argv.slice(2);
let limit = 100; // Default limit
let outputDir = path.join(__dirname, '..', 'downloaded-midis');

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--limit' && i + 1 < args.length) {
    limit = parseInt(args[++i], 10);
  } else if (args[i] === '--output' && i + 1 < args.length) {
    outputDir = args[++i];
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
Usage: node scripts/download-hymns.js [options]

Options:
  --limit <number>    Maximum number of MIDI files to download (default: 100)
  --output <dir>      Output directory for downloaded files (default: ./downloaded-midis)
  --help, -h          Show this help message

Example:
  node scripts/download-hymns.js --limit 50 --output ./downloaded-midis
    `);
    process.exit(0);
  }
}

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`Created output directory: ${outputDir}`);
}

// Helper: delay function
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: fetch with proper headers and error handling
async function fetchWithRetry(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        },
        timeout: 30000 // 30 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      console.warn(`  Attempt ${attempt} failed, retrying in ${attempt * 2}s...`);
      await delay(attempt * 2000);
    }
  }
}

// Extract MIDI links from a tune page
// Hymnary.org pattern: "Audio Files: MIDI, RECORDING" where MIDI is a link
async function extractMidiLinksFromTunePage(tuneUrl) {
  try {
    await delay(DELAY_BETWEEN_REQUESTS);
    const response = await fetchWithRetry(tuneUrl);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const midiLinks = [];
    
    // Strategy 1: Find links with text exactly "MIDI" (most precise)
    // Only get the first one per page - there should only be one MIDI link in "Audio Files:"
    $('a').each((i, elem) => {
      const linkText = $(elem).text().trim();
      // Only match exact "MIDI" text (case insensitive)
      if (linkText.toUpperCase() === 'MIDI') {
        const href = $(elem).attr('href');
        if (href) {
          // Skip MP3 files and other non-MIDI extensions
          if (href.includes('.mp3') || href.includes('.wav') || href.includes('.ogg')) {
            return;
          }
          
          const absoluteUrl = href.startsWith('http') 
            ? href 
            : new URL(href, 'https://hymnary.org').toString();
          
          // Only add /media/fetch/ URLs (Hymnary.org MIDI pattern) or .mid/.midi files
          if (absoluteUrl.includes('/media/fetch/') || absoluteUrl.match(/\.mid(?:i)?$/i)) {
            midiLinks.push(absoluteUrl);
            return false; // Stop after finding the first valid MIDI link
          }
        }
      }
    });
    
    // Strategy 4: Fallback - direct .mid/.midi file links
    $('a[href$=".mid"], a[href$=".midi"]').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href) {
        const absoluteUrl = href.startsWith('http') 
          ? href 
          : new URL(href, 'https://hymnary.org').toString();
        midiLinks.push(absoluteUrl);
      }
    });
    
    return [...new Set(midiLinks)]; // Remove duplicates
  } catch (error) {
    console.error(`  Error extracting MIDI links from ${tuneUrl}:`, error.message);
    return [];
  }
}

// Download a MIDI file
async function downloadMidiFile(url, outputPath) {
  try {
    await delay(DELAY_BETWEEN_REQUESTS);
    const response = await fetchWithRetry(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    // Check content type if available
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('midi') && !contentType.includes('mid') && 
        contentType.includes('text/html') || contentType.includes('audio/mpeg')) {
      throw new Error(`Wrong content type: ${contentType}`);
    }
    
    const buffer = await response.buffer();
    
    // Validate it's actually a MIDI file (starts with "MThd" - MIDI header)
    if (buffer.length < 14) {
      throw new Error('File too small to be a valid MIDI file');
    }
    
    // MIDI files start with "MThd" (4D 54 68 64 in hex)
    // Check first 14 bytes for "MThd" (some files might have extra bytes)
    const headerBytes = buffer.slice(0, 14);
    const headerStr = headerBytes.toString('ascii', 0, 4);
    const headerStrFull = headerBytes.toString('ascii');
    
    if (headerStr !== 'MThd' && !headerStrFull.includes('MThd')) {
      // Also check if it's HTML (redirect or error page)
      const textStart = buffer.slice(0, 100).toString('ascii').toLowerCase();
      if (textStart.includes('<html') || textStart.includes('<!doctype')) {
        throw new Error('Received HTML instead of MIDI file (likely redirect or error)');
      }
      throw new Error('File does not appear to be a valid MIDI file (missing MThd header)');
    }
    
    fs.writeFileSync(outputPath, buffer);
    return true;
  } catch (error) {
    console.error(`  Error downloading ${url}:`, error.message);
    return false;
  }
}

// Get popular tunes from Hymnary.org browse page
async function getPopularTuneLinks(maxLinks = 100) {
  console.log('Fetching popular tunes page from Hymnary.org...');
  
  const baseUrl = 'https://hymnary.org/browse/popular/tunes';
  const tuneLinks = [];
  let page = 1;
  let hasMorePages = true;
  
  // The popular tunes page lists all 250 tunes on a single page with anchor links
  // We just need to fetch the main page once and extract all /tune/ links
  try {
    await delay(DELAY_BETWEEN_PAGES);
    console.log(`\nFetching popular tunes page: ${baseUrl}`);
    
    const response = await fetchWithRetry(baseUrl);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Find all links to individual tune pages - they're in format /tune/[tune-name]
    $('a[href*="/tune/"]').each((i, elem) => {
      if (tuneLinks.length >= maxLinks) return false; // Stop if we hit limit
      
      const href = $(elem).attr('href');
      if (href && href.includes('/tune/')) {
        const absoluteUrl = href.startsWith('http') 
          ? href 
          : new URL(href, 'https://hymnary.org').toString();
        
        // Avoid duplicates and ensure it's a hymnary.org tune link
        if (!tuneLinks.includes(absoluteUrl) && absoluteUrl.includes('hymnary.org/tune/')) {
          tuneLinks.push(absoluteUrl);
        }
      }
    });
    
    console.log(`  Found ${tuneLinks.length} tune links on the page`);
  } catch (error) {
    console.error(`Error fetching popular tunes page:`, error.message);
  }
  
  console.log(`\n✓ Found ${tuneLinks.length} total tune pages`);
  return tuneLinks.slice(0, maxLinks);
}

// Main download function
async function downloadHymns() {
  console.log(`\n=== Hymnary.org MIDI Downloader ===\n`);
  console.log(`Target: ${limit} MIDI files`);
  console.log(`Output: ${outputDir}\n`);
  
  // Step 1: Get popular tune page links
  const tuneLinks = await getPopularTuneLinks(limit * 2); // Get more links since not all will have MIDI
  
  if (tuneLinks.length === 0) {
    console.error('\nNo tune links found. The page structure may have changed.');
    console.error('You may need to manually download MIDI files from Hymnary.org.');
    process.exit(1);
  }
  
  // Step 2: Extract MIDI links from each tune page and track tune names
  console.log(`\n=== Extracting MIDI links from tune pages ===\n`);
  const allMidiUrls = [];
  const midiToTuneMap = {}; // Map MIDI URL to tune name for creating mappings
  
  for (let i = 0; i < Math.min(tuneLinks.length, limit * 3); i++) {
    const tuneUrl = tuneLinks[i];
    console.log(`[${i + 1}/${Math.min(tuneLinks.length, limit * 3)}] ${tuneUrl}`);
    
    // Extract tune name from URL and page title
    const tuneMatch = tuneUrl.match(/\/tune\/([^\/]+)/);
    let tuneNameFromUrl = null;
    if (tuneMatch) {
      // Get the tune page title to extract the actual tune name
      try {
        await delay(500); // Small delay before fetching
        const response = await fetchWithRetry(tuneUrl);
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Get the main heading which is usually the tune name
        const tuneTitle = $('h1').first().text().trim().toUpperCase();
        if (tuneTitle && tuneTitle.length > 0 && tuneTitle.length < 100) {
          tuneNameFromUrl = tuneTitle;
        }
      } catch (e) {
        // Fall back to URL-based extraction
      }
      
      // Fallback: extract from URL slug
      if (!tuneNameFromUrl) {
        const slug = tuneMatch[1];
        // Remove composer names and convert to tune name
        const parts = slug.split('_');
        // Common pattern: tune_name_composer -> TUNE NAME
        if (parts.length > 1) {
          // Skip last part if it looks like a composer name
          const potentialTuneParts = parts.slice(0, -1);
          tuneNameFromUrl = potentialTuneParts.join(' ').toUpperCase();
        } else {
          tuneNameFromUrl = slug.replace(/_/g, ' ').toUpperCase();
        }
      }
    }
    
    const midiLinks = await extractMidiLinksFromTunePage(tuneUrl);
    
    if (midiLinks.length > 0) {
      console.log(`  Found ${midiLinks.length} MIDI link(s)`);
      // Associate first MIDI link with tune name
      if (tuneNameFromUrl && midiLinks[0]) {
        midiToTuneMap[midiLinks[0]] = tuneNameFromUrl;
        console.log(`  Associated with tune: ${tuneNameFromUrl}`);
      }
      allMidiUrls.push(...midiLinks);
      
      if (allMidiUrls.length >= limit) {
        console.log(`\nReached target of ${limit} MIDI files, stopping extraction...`);
        break;
      }
    } else {
      console.log(`  No MIDI links found`);
    }
  }
  
  // Remove duplicates
  const uniqueMidiUrls = [...new Set(allMidiUrls)];
  console.log(`\n✓ Found ${uniqueMidiUrls.length} unique MIDI URLs`);
  
  if (uniqueMidiUrls.length === 0) {
    console.error('\nNo MIDI files found. The page structure may have changed.');
    console.error('You may need to manually download MIDI files from Hymnary.org.');
    process.exit(1);
  }
  
  // Step 3: Download MIDI files
  console.log(`\n=== Downloading MIDI files ===\n`);
  const downloadCount = Math.min(uniqueMidiUrls.length, limit);
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < downloadCount; i++) {
    const midiUrl = uniqueMidiUrls[i];
    const urlObj = new URL(midiUrl);
    let filename = path.basename(urlObj.pathname) || `midi_${i + 1}`;
    // Ensure .mid extension
    if (!filename.toLowerCase().endsWith('.mid') && !filename.toLowerCase().endsWith('.midi')) {
      filename = filename + '.mid';
    }
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const outputPath = path.join(outputDir, safeFilename);
    
    // Skip if already exists
    if (fs.existsSync(outputPath)) {
      console.log(`[${i + 1}/${downloadCount}] ${safeFilename} (already exists, skipping)`);
      successCount++;
      continue;
    }
    
    console.log(`[${i + 1}/${downloadCount}] Downloading ${safeFilename}...`);
    const success = await downloadMidiFile(midiUrl, outputPath);
    
    if (success) {
      successCount++;
      console.log(`  ✓ Downloaded ${safeFilename}`);
    } else {
      failCount++;
    }
  }
  
  // Step 4: Generate mapping file from tune names we extracted
  const mappingsPath = path.join(outputDir, 'tune-mappings.json');
  const mappings = {};
  let mappingsCount = 0;
  
  // Create mappings for successfully downloaded files
  for (let i = 0; i < downloadCount; i++) {
    const midiUrl = uniqueMidiUrls[i];
    const urlObj = new URL(midiUrl);
    let filename = path.basename(urlObj.pathname) || `midi_${i + 1}`;
    if (!filename.toLowerCase().endsWith('.mid') && !filename.toLowerCase().endsWith('.midi')) {
      filename = filename + '.mid';
    }
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(outputDir, safeFilename);
    
    if (fs.existsSync(filePath) && midiToTuneMap[midiUrl]) {
      const tuneName = midiToTuneMap[midiUrl];
      mappings[safeFilename] = {
        tuneName: tuneName
      };
      mappingsCount++;
    }
  }
  
  if (mappingsCount > 0) {
    fs.writeFileSync(mappingsPath, JSON.stringify(mappings, null, 2));
    console.log(`\n✓ Generated tune mappings file: ${mappingsPath} (${mappingsCount} entries)`);
    console.log(`  Note: You may need to manually add hymn names to complete the mappings.`);
  }
  
  console.log(`\n=== Download Complete ===\n`);
  console.log(`Successfully downloaded: ${successCount} files`);
  console.log(`Failed: ${failCount} files`);
  console.log(`Output directory: ${outputDir}`);
  if (mappingsCount > 0) {
    console.log(`\nNext step: Review and complete ${mappingsPath}, then run:`);
    console.log(`  node scripts/build-midi-library.js --input ${outputDir} --output ./midi --mappings ${mappingsPath}`);
  } else {
    console.log(`\nNext step: Run the build script to process these files:`);
    console.log(`  node scripts/build-midi-library.js --input ${outputDir} --output ./midi --interactive\n`);
  }
}

// Run if called directly
if (require.main === module) {
  downloadHymns().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
  });
}

module.exports = { downloadHymns };
