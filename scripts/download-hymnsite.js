#!/usr/bin/env node
/**
 * HymnSite.com MIDI Downloader
 * 
 * Downloads SATB MIDI files from HymnSite.com's Baptist Hymnal collection.
 * Skips hymns that are already in the library.
 * 
 * Requirements:
 *   npm install cheerio node-fetch
 * 
 * Usage:
 *   node scripts/download-hymnsite.js [--limit 50] [--output ./downloaded-midis]
 */

const fs = require('fs');
const path = require('path');

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
Usage: node scripts/download-hymnsite.js [options]

Options:
  --limit <number>    Maximum number of MIDI files to download (default: 100)
  --output <dir>      Output directory for downloaded files (default: ./downloaded-midis)
  --help, -h          Show this help message

Example:
  node scripts/download-hymnsite.js --limit 50 --output ./downloaded-midis
    `);
    process.exit(0);
  }
}

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`Created output directory: ${outputDir}`);
}

// Load existing metadata to check for duplicates
function loadExistingMetadata() {
  const metadataPath = path.join(__dirname, '..', 'midi', 'metadata.json');
  if (!fs.existsSync(metadataPath)) {
    return {};
  }
  try {
    const content = fs.readFileSync(metadataPath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.warn(`Warning: Could not load existing metadata: ${e.message}`);
    return {};
  }
}

// Check if we already have this hymn
function alreadyHaveHymn(hymnName, existingMetadata) {
  const normalizedName = hymnName.toLowerCase().trim();
  for (const [filename, metadata] of Object.entries(existingMetadata)) {
    if (metadata.hymnName && metadata.hymnName.toLowerCase().trim() === normalizedName) {
      return true;
    }
    // Also check if the filename contains the hymn name
    const filenameLower = filename.toLowerCase();
    if (filenameLower.includes(normalizedName.replace(/\s+/g, '_'))) {
      return true;
    }
  }
  return false;
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

// Extract hymn list from contents page
async function getHymnList(maxHymns = 100) {
  // Try both URLs - the user mentioned tbhTBHnumber-title.shtml has all 600
  const contentsUrls = [
    'https://www.hymnsite.com/baptist/tbhTBHnumber-title.shtml',
    'https://www.hymnsite.com/baptist/contents.cgi'
  ];
  
  let allHymns = [];
  
  for (const contentsUrl of contentsUrls) {
    console.log(`Fetching hymn list from: ${contentsUrl}`);
    try {
      await delay(DELAY_BETWEEN_REQUESTS);
      const response = await fetchWithRetry(contentsUrl);
      const html = await response.text();
      const $ = cheerio.load(html);
      
      const hymns = [];
      
      // Parse hymn list - format: "002. Holy, Holy, Holy" or "* 002. Holy, Holy, Holy"
      // Look in all elements for the pattern
      $('*').each((i, elem) => {
        const text = $(elem).text().trim();
        // Match pattern: "002. Hymn Title" or "* 002. Hymn Title" or "002\. Holy, Holy, Holy"
        const match = text.match(/[*_]?\s*(\d{3})[\.\s]+\s*(.+?)(?:\s*$|\s*[|]|\s*\*)/);
        if (match) {
          const number = match[1];
          let title = match[2].trim();
          // Clean up title - remove trailing asterisks, etc.
          title = title.replace(/\*+$/, '').trim();
          if (title && parseInt(number) > 0 && parseInt(number) <= 700) {
            hymns.push({ number, title, url: `https://www.hymnsite.com/baptist/${number}.shtml` });
          }
        }
      });
      
      // Also try parsing links more aggressively
      $('a[href*=".shtml"], a[href*="/"]').each((i, elem) => {
        const href = $(elem).attr('href');
        const text = $(elem).text().trim();
        // Match href like "002.shtml" or "/baptist/002.shtml"
        const match = href.match(/(\d{3})\.shtml/);
        if (match && text && text.length > 1) {
          const number = match[1];
          const title = text.replace(/[*_]/g, '').trim();
          if (title && parseInt(number) > 0 && parseInt(number) <= 700) {
            const existing = hymns.find(h => h.number === number);
            if (!existing) {
              hymns.push({ number, title, url: `https://www.hymnsite.com/baptist/${number}.shtml` });
            } else if (!existing.title || existing.title === number || existing.title.length < title.length) {
              existing.title = title;
            }
          }
        }
      });
      
      // Also try parsing text content more broadly
      const bodyText = $('body').text();
      const lines = bodyText.split('\n');
      for (const line of lines) {
        const match = line.match(/[*_]?\s*(\d{3})[\.\s]+\s*(.+?)(?:\s*$|\s*[|])/);
        if (match) {
          const number = match[1];
          let title = match[2].trim().replace(/\*+$/, '').trim();
          if (title && parseInt(number) > 0 && parseInt(number) <= 700) {
            const existing = hymns.find(h => h.number === number);
            if (!existing) {
              hymns.push({ number, title, url: `https://www.hymnsite.com/baptist/${number}.shtml` });
            }
          }
        }
      }
      
      // Merge with existing hymns (keep better titles)
      hymns.forEach(hymn => {
        const existing = allHymns.find(h => h.number === hymn.number);
        if (!existing) {
          allHymns.push(hymn);
        } else if (hymn.title.length > existing.title.length) {
          existing.title = hymn.title;
        }
      });
      
      if (allHymns.length >= maxHymns) {
        break; // Got enough from this URL
      }
    } catch (error) {
      console.warn(`Warning: Could not fetch from ${contentsUrl}: ${error.message}`);
      continue;
    }
  }
  
  // Remove duplicates and sort by number
  const uniqueHymns = [];
  const seen = new Set();
  allHymns.forEach(hymn => {
    if (!seen.has(hymn.number)) {
      seen.add(hymn.number);
      uniqueHymns.push(hymn);
    }
  });
  
  uniqueHymns.sort((a, b) => parseInt(a.number) - parseInt(b.number));
  
  console.log(`✓ Found ${uniqueHymns.length} hymns in list`);
  return uniqueHymns.slice(0, maxHymns);
}

// Extract MIDI link from hymn page
// Pattern: Look for "Links for Downloading" section, then find "Plain MIDI" link
async function extractMidiLink(hymnUrl, hymnNumber, hymnTitle) {
  try {
    await delay(DELAY_BETWEEN_REQUESTS);
    const response = await fetchWithRetry(hymnUrl);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Strategy 1: Find "Links for Downloading" section, then look for "Plain MIDI"
    let midiUrl = null;
    
    // Find section with "Links for Downloading"
    $('*').each((i, elem) => {
      const text = $(elem).text();
      if (text && text.includes('Links for Downloading')) {
        // Look for "Plain MIDI" link in this section or nearby
        $(elem).find('a').each((j, link) => {
          const linkText = $(link).text().trim();
          if (linkText === 'Plain MIDI' || linkText === 'plain MIDI' || linkText === 'MIDI') {
            const href = $(link).attr('href');
            if (href) {
              midiUrl = href.startsWith('http') 
                ? href 
                : new URL(href, 'https://www.hymnsite.com').toString();
              return false; // Stop searching
            }
          }
        });
        
        // Also check siblings and children for MIDI links
        if (!midiUrl) {
          $(elem).siblings().find('a, a[href*="midi"], a[href*=".mid"]').each((j, link) => {
            const linkText = $(link).text().trim().toUpperCase();
            const href = $(link).attr('href');
            if (href && (linkText.includes('MIDI') || href.includes('.mid'))) {
              midiUrl = href.startsWith('http') 
                ? href 
                : new URL(href, 'https://www.hymnsite.com').toString();
              return false;
            }
          });
        }
        
        if (midiUrl) return false; // Stop outer loop
      }
    });
    
    // Strategy 2: Construct URL based on known pattern
    // Pattern: https://www.hymnsite.com/baptist/midi/tbh002-holy-holy-holy.mid
    if (!midiUrl && hymnNumber && hymnTitle) {
      const slug = hymnTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const constructedUrl = `https://www.hymnsite.com/baptist/midi/tbh${hymnNumber.padStart(3, '0')}-${slug}.mid`;
      
      // Verify the URL exists by trying a HEAD request
      try {
        await delay(500);
        const testResponse = await fetch(constructedUrl, { method: 'HEAD' });
        if (testResponse.ok) {
          midiUrl = constructedUrl;
          console.log(`  Constructed MIDI URL: ${midiUrl}`);
        }
      } catch (e) {
        // URL doesn't exist, continue to next strategy
      }
    }
    
    // Strategy 3: Fallback - look for any "Plain MIDI" or "MIDI" links
    if (!midiUrl) {
      $('a').each((i, elem) => {
        const linkText = $(elem).text().trim();
        const href = $(elem).attr('href');
        
        if (href && (linkText === 'Plain MIDI' || linkText === 'plain MIDI' || 
                     linkText.toLowerCase().includes('plain midi'))) {
          midiUrl = href.startsWith('http') 
            ? href 
            : new URL(href, 'https://www.hymnsite.com').toString();
          return false;
        }
      });
    }
    
    // Strategy 4: Look for any .mid files in /baptist/midi/ path
    if (!midiUrl) {
      $('a[href*="/baptist/midi/"], a[href*="tbh"]').each((i, elem) => {
        const href = $(elem).attr('href');
        if (href && href.includes('.mid')) {
          midiUrl = href.startsWith('http') 
            ? href 
            : new URL(href, 'https://www.hymnsite.com').toString();
          return false;
        }
      });
    }
    
    return midiUrl;
  } catch (error) {
    console.error(`  Error extracting MIDI link from ${hymnUrl}:`, error.message);
    return null;
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
        contentType.includes('text/html')) {
      throw new Error(`Wrong content type: ${contentType}`);
    }
    
    const buffer = await response.buffer();
    
    // Validate it's actually a MIDI file (starts with "MThd" - MIDI header)
    if (buffer.length < 14) {
      throw new Error('File too small to be a valid MIDI file');
    }
    
    // MIDI files start with "MThd" (4D 54 68 64 in hex)
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

// Generate safe filename
function generateFilename(hymnNumber, hymnTitle) {
  const sanitize = (str) => str.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
  const number = hymnNumber;
  const title = sanitize(hymnTitle);
  return `${number}_${title}.mid`;
}

// Main download function
async function downloadHymns() {
  console.log(`\n=== HymnSite.com MIDI Downloader ===\n`);
  console.log(`Target: ${limit} MIDI files`);
  console.log(`Output: ${outputDir}\n`);
  
  // Load existing metadata to check for duplicates
  console.log('Loading existing hymn library...');
  const existingMetadata = loadExistingMetadata();
  const existingCount = Object.keys(existingMetadata).length;
  console.log(`✓ Found ${existingCount} existing hymns in library\n`);
  
  // Step 1: Get hymn list
  const hymns = await getHymnList(limit * 2); // Get more than limit to account for duplicates
  
  if (hymns.length === 0) {
    console.error('\nNo hymns found. The page structure may have changed.');
    process.exit(1);
  }
  
  // Step 2: Filter out hymns we already have and extract MIDI links
  console.log(`\n=== Extracting MIDI links from hymn pages ===\n`);
  const hymnsToDownload = [];
  let skippedCount = 0;
  
  for (let i = 0; i < hymns.length && hymnsToDownload.length < limit; i++) {
    const hymn = hymns[i];
    console.log(`[${i + 1}/${hymns.length}] ${hymn.number}. ${hymn.title}`);
    
    // Check if we already have this hymn
    if (alreadyHaveHymn(hymn.title, existingMetadata)) {
      console.log(`  Already have "${hymn.title}", skipping`);
      skippedCount++;
      continue;
    }
    
    // Construct MIDI URL directly based on known pattern:
    // https://www.hymnsite.com/baptist/midi/tbh002-holy-holy-holy.mid
    const slug = hymn.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const midiUrl = `https://www.hymnsite.com/baptist/midi/tbh${hymn.number.padStart(3, '0')}-${slug}.mid`;
    
    // Verify the URL exists by trying a HEAD request
    let urlExists = false;
    try {
      await delay(500);
      const testResponse = await fetch(midiUrl, { method: 'HEAD', timeout: 10000 });
      urlExists = testResponse.ok;
    } catch (e) {
      // URL doesn't exist or timed out
    }
    
    if (urlExists) {
      console.log(`  Found MIDI: ${midiUrl}`);
      hymnsToDownload.push({ ...hymn, midiUrl });
    } else {
      console.log(`  MIDI not found at: ${midiUrl}`);
    }
  }
  
  console.log(`\n✓ Found ${hymnsToDownload.length} new hymns to download`);
  console.log(`✓ Skipped ${skippedCount} hymns already in library`);
  
  if (hymnsToDownload.length === 0) {
    console.log(`\nAll hymns are already in the library!`);
    process.exit(0);
  }
  
  // Step 3: Download MIDI files
  console.log(`\n=== Downloading MIDI files ===\n`);
  let successCount = 0;
  let failCount = 0;
  const mappings = {};
  
  for (let i = 0; i < hymnsToDownload.length; i++) {
    const hymn = hymnsToDownload[i];
    const filename = generateFilename(hymn.number, hymn.title);
    const outputPath = path.join(outputDir, filename);
    
    // Skip if already exists
    if (fs.existsSync(outputPath)) {
      console.log(`[${i + 1}/${hymnsToDownload.length}] ${filename} (already exists, skipping)`);
      successCount++;
      mappings[filename] = {
        hymnName: hymn.title,
        hymnNumber: hymn.number
      };
      continue;
    }
    
    console.log(`[${i + 1}/${hymnsToDownload.length}] Downloading ${filename}...`);
    const success = await downloadMidiFile(hymn.midiUrl, outputPath);
    
    if (success) {
      successCount++;
      console.log(`  ✓ Downloaded ${filename}`);
      mappings[filename] = {
        hymnName: hymn.title,
        hymnNumber: hymn.number
      };
    } else {
      failCount++;
    }
  }
  
  // Step 4: Generate mapping file
  const mappingsPath = path.join(outputDir, 'hymnsite-mappings.json');
  if (Object.keys(mappings).length > 0) {
    fs.writeFileSync(mappingsPath, JSON.stringify(mappings, null, 2));
    console.log(`\n✓ Generated mappings file: ${mappingsPath} (${Object.keys(mappings).length} entries)`);
  }
  
  console.log(`\n=== Download Complete ===\n`);
  console.log(`Successfully downloaded: ${successCount} files`);
  console.log(`Failed: ${failCount} files`);
  console.log(`Skipped (already in library): ${skippedCount} hymns`);
  console.log(`Output directory: ${outputDir}`);
  
  if (successCount > 0) {
    console.log(`\nNext step: Run the build script to process these files:`);
    console.log(`  node scripts/build-midi-library.js --input ${outputDir} --output ./midi --mappings ${mappingsPath}\n`);
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
