#!/usr/bin/env node
/**
 * MIDI Library Builder Script
 * 
 * Processes downloaded MIDI files from Hymnary.org (with numbered filenames)
 * and organizes them with proper naming and metadata.
 * 
 * Requirements:
 *   npm install @tonejs/midi
 * 
 * Usage:
 *   node scripts/build-midi-library.js --input ./downloaded-midis --output ./midi [--mappings ./mappings.json] [--interactive]
 */

const fs = require('fs');
const path = require('path');

// Try to load @tonejs/midi - user must install it first
let Midi;
try {
  Midi = require('@tonejs/midi').Midi;
} catch (e) {
  console.error('Error: @tonejs/midi not found. Please install it with:');
  console.error('  npm install @tonejs/midi');
  process.exit(1);
}

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Load hymn mappings
function loadHymnMappings() {
  const mappingsPath = path.join(__dirname, 'hymn-mappings.json');
  try {
    const content = fs.readFileSync(mappingsPath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.error(`Error loading hymn mappings from ${mappingsPath}:`, e.message);
    return {};
  }
}

// Extract tune name from MIDI file metadata
function extractTuneNameFromMidi(midiData, mappings) {
  const tuneNames = Object.keys(mappings);
  
  // Check track names
  for (const track of midiData.tracks || []) {
    if (track.name) {
      const trackNameUpper = track.name.toUpperCase();
      for (const tuneName of tuneNames) {
        if (trackNameUpper.includes(tuneName) || tuneName.includes(trackNameUpper)) {
          return tuneName;
        }
      }
    }
  }
  
  // Check file metadata if available (some MIDI files have title in header)
  // Note: @tonejs/midi may not expose all metadata, but we can check what's available
  
  return null;
}

// Detect key from MIDI file (same logic as app)
function detectKeyFromMidi(midiData) {
  const keySignature = midiData.header.keySignatures?.[0];
  if (!keySignature || !Number.isFinite(keySignature.key)) {
    return null;
  }
  
  const circleOfFifthsMap = [
    0,   // -7: Cb -> B (11)
    11,  // -6: Gb -> F# (6)
    1,   // -5: Db -> C# (1)
    8,   // -4: Ab (8)
    3,   // -3: Eb (3)
    10,  // -2: Bb (10)
    5,   // -1: F (5)
    0,   // 0: C (0)
    7,   // 1: G (7)
    2,   // 2: D (2)
    9,   // 3: A (9)
    4,   // 4: E (4)
    11,  // 5: B (11)
    6,   // 6: F# (6)
    1    // 7: C# (1)
  ];
  
  const keyValue = keySignature.key;
  const index = keyValue + 7;
  
  if (index >= 0 && index < circleOfFifthsMap.length) {
    return {
      tonic: circleOfFifthsMap[index],
      mode: keySignature.scale === 1 ? 'minor' : 'major'
    };
  }
  
  return null;
}

// Generate safe filename
function generateFilename(hymnName, tuneName) {
  const sanitize = (str) => str.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
  const hymn = sanitize(hymnName);
  const tune = sanitize(tuneName.toUpperCase());
  return `${hymn}_${tune}.mid`;
}

// Process a single MIDI file
async function processMidiFile(filePath, mappings, manualMappings, interactive) {
  const fileName = path.basename(filePath);
  console.log(`\nProcessing: ${fileName}`);
  
  // Try to parse MIDI file first (needed for key detection even with manual mappings)
  let midiData;
  try {
    const buffer = fs.readFileSync(filePath);
    midiData = new Midi(buffer);
  } catch (e) {
    console.error(`  Error parsing MIDI file: ${e.message}`);
    return null;
  }
  
  // Check manual mappings first
  if (manualMappings && manualMappings[fileName]) {
    const mapping = manualMappings[fileName];
    
    // Handle HymnSite.com format (hymnName and hymnNumber, no tuneName)
    if (mapping.hymnName && !mapping.tuneName) {
      // For HymnSite files, we need to extract tune name from MIDI metadata or lookup
      const detectedKey = detectKeyFromMidi(midiData);
      
      // Try to extract tune name from MIDI metadata
      let tuneName = extractTuneNameFromMidi(midiData, mappings);
      
      // If not found in MIDI, try looking up by hymn name in our mappings
      if (!tuneName && mapping.hymnName) {
        const hymnNameLower = mapping.hymnName.toLowerCase().trim();
        for (const [tuneNameKey, tuneMapping] of Object.entries(mappings)) {
          if (tuneMapping.hymnName && tuneMapping.hymnName.toLowerCase().trim() === hymnNameLower) {
            tuneName = tuneNameKey;
            break;
          }
        }
      }
      
      return {
        originalFilename: fileName,
        tuneName: tuneName, // May be null, will handle in processing
        hymnName: mapping.hymnName,
        hymnNumber: mapping.hymnNumber,
        detectedKey: detectedKey,
        filePath: filePath
      };
    }
    
    // Handle mappings with tune names (Hymnary.org format)
    if (mapping.tuneName) {
      // Normalize tune name - remove parentheses and extra words
      let tuneName = mapping.tuneName.toUpperCase().trim();
      // Remove parenthetical information like "(HASSLER)" or "(FRENCH)"
      tuneName = tuneName.replace(/\s*\([^)]+\)\s*/g, '').trim();
      // Remove common suffixes
      tuneName = tuneName.replace(/\s+\(.*\)\s*$/g, '').trim();
      
      // Look up hymn name from mappings
      let hymnName = null;
      if (mapping.hymnName) {
        hymnName = mapping.hymnName;
      } else if (mappings && mappings[tuneName]) {
        hymnName = mappings[tuneName].hymnName;
      }
      
      // Still detect key even when using manual mappings
      const detectedKey = detectKeyFromMidi(midiData);
      
      if (!tuneName || !hymnName) {
        console.log(`  Missing tune/hymn name. Tune: ${tuneName || 'none'}, Hymn: ${hymnName || 'none'}`);
        return null;
      }
      
      return {
        originalFilename: fileName,
        tuneName: tuneName,
        hymnName: hymnName,
        detectedKey: detectedKey,
        filePath: filePath
      };
    }
    
    // Fallback: just hymn name
    const detectedKey = detectKeyFromMidi(midiData);
    return {
      originalFilename: fileName,
      tuneName: null,
      hymnName: mapping.hymnName,
      hymnNumber: mapping.hymnNumber,
      detectedKey: detectedKey,
      filePath: filePath
    };
  }
  
  // Try to extract tune name from MIDI metadata
  let tuneName = extractTuneNameFromMidi(midiData, mappings);
  let hymnName = null;
  
  if (tuneName && mappings[tuneName]) {
    hymnName = mappings[tuneName].hymnName;
    console.log(`  Found tune: ${tuneName} -> ${hymnName}`);
  } else if (interactive) {
    // Interactive mode: prompt user
    console.log(`  Could not auto-detect tune name.`);
    const tuneInput = await question(`  Enter tune name (or press Enter to skip): `);
    if (tuneInput.trim()) {
      tuneName = tuneInput.trim().toUpperCase();
      if (mappings[tuneName]) {
        hymnName = mappings[tuneName].hymnName;
      } else {
        const hymnInput = await question(`  Enter hymn name: `);
        hymnName = hymnInput.trim();
      }
    }
  } else {
    console.log(`  Could not determine tune/hymn name. Skipping (use --mappings or --interactive)`);
    return null;
  }
  
  if (!tuneName || !hymnName) {
    return null;
  }
  
  // Detect key
  const detectedKey = detectKeyFromMidi(midiData);
  
  return {
    originalFilename: fileName,
    tuneName: tuneName,
    hymnName: hymnName,
    detectedKey: detectedKey,
    filePath: filePath
  };
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  let inputDir = null;
  let outputDir = null;
  let mappingsFile = null;
  let interactive = false;
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && i + 1 < args.length) {
      inputDir = args[++i];
    } else if (args[i] === '--output' && i + 1 < args.length) {
      outputDir = args[++i];
    } else if (args[i] === '--mappings' && i + 1 < args.length) {
      mappingsFile = args[++i];
    } else if (args[i] === '--interactive') {
      interactive = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Usage: node scripts/build-midi-library.js [options]

Options:
  --input <dir>       Input directory containing downloaded MIDI files
  --output <dir>      Output directory (usually ./midi)
  --mappings <file>   Optional: JSON file with manual mappings:
                      { "330.mid": { "tuneName": "NEW BRITAIN", "hymnName": "Amazing Grace" } }
  --interactive       Interactive mode: prompt for tune/hymn names when not found
  --help, -h          Show this help message

Example:
  node scripts/build-midi-library.js --input ./downloaded-midis --output ./midi --interactive
      `);
      process.exit(0);
    }
  }
  
  if (!inputDir || !outputDir) {
    console.error('Error: --input and --output are required');
    console.error('Run with --help for usage information');
    process.exit(1);
  }
  
  // Validate directories
  if (!fs.existsSync(inputDir)) {
    console.error(`Error: Input directory does not exist: ${inputDir}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(outputDir)) {
    console.log(`Creating output directory: ${outputDir}`);
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Load mappings
  const hymnMappings = loadHymnMappings();
  console.log(`Loaded ${Object.keys(hymnMappings).length} hymn mappings`);
  
  // Load manual mappings if provided
  let manualMappings = {};
  if (mappingsFile) {
    try {
      const content = fs.readFileSync(mappingsFile, 'utf8');
      manualMappings = JSON.parse(content);
      console.log(`Loaded ${Object.keys(manualMappings).length} manual mappings`);
    } catch (e) {
      console.error(`Error loading manual mappings: ${e.message}`);
    }
  }
  
  // Find all MIDI files
  const files = fs.readdirSync(inputDir).filter(f => 
    f.toLowerCase().endsWith('.mid') || f.toLowerCase().endsWith('.midi')
  );
  
  console.log(`\nFound ${files.length} MIDI files to process`);
  
  // Load existing metadata.json if it exists (for incremental updates)
  const metadataPath = path.join(outputDir, 'metadata.json');
  let existingMetadata = {};
  if (fs.existsSync(metadataPath)) {
    try {
      const existingContent = fs.readFileSync(metadataPath, 'utf8');
      existingMetadata = JSON.parse(existingContent);
      console.log(`Found existing metadata.json with ${Object.keys(existingMetadata).length} entries`);
    } catch (e) {
      console.warn(`Warning: Could not read existing metadata.json: ${e.message}`);
      existingMetadata = {};
    }
  }
  
  // Process each file
  const metadata = { ...existingMetadata }; // Start with existing metadata
  const processed = [];
  const skipped = [];
  
  for (const file of files) {
    const filePath = path.join(inputDir, file);
    const result = await processMidiFile(filePath, hymnMappings, manualMappings, interactive);
    
    // Handle HymnSite.com files that might not have tune name yet
    if (result && result.hymnName) {
      // If no tune name, re-parse MIDI and try to extract
      if (!result.tuneName) {
        try {
          const buffer = fs.readFileSync(filePath);
          const Midi = require('@tonejs/midi').Midi;
          const midiData = new Midi(buffer);
          
          // Try extracting tune name from MIDI metadata
          const extractedTune = extractTuneNameFromMidi(midiData, hymnMappings);
          if (extractedTune && hymnMappings[extractedTune]) {
            result.tuneName = extractedTune;
            result.hymnName = hymnMappings[extractedTune].hymnName || result.hymnName;
            console.log(`  Found tune in MIDI: ${extractedTune}`);
          }
          
          // If still not found, try track names
          if (!result.tuneName) {
            for (const track of midiData.tracks || []) {
              if (track.name) {
                const trackNameUpper = track.name.toUpperCase().trim();
                for (const tuneName of Object.keys(hymnMappings)) {
                  if (trackNameUpper.includes(tuneName) || tuneName.includes(trackNameUpper)) {
                    result.tuneName = tuneName;
                    result.hymnName = hymnMappings[tuneName].hymnName || result.hymnName;
                    console.log(`  Found tune in track name: ${tuneName}`);
                    break;
                  }
                }
                if (result.tuneName) break;
              }
            }
          }
        } catch (e) {
          // Couldn't re-parse, continue without tune name
        }
      }
      
      // If still no tune name, try looking up by hymn name in our mappings
      if (!result.tuneName) {
        const hymnNameLower = result.hymnName.toLowerCase().trim();
        for (const [tuneName, mapping] of Object.entries(hymnMappings)) {
          if (mapping.hymnName && mapping.hymnName.toLowerCase().trim() === hymnNameLower) {
            result.tuneName = tuneName;
            console.log(`  Matched hymn name to tune: ${tuneName}`);
            break;
          }
        }
      }
      
      // If still no tune name, we'll process it without tune name
      // The app can handle this, but we'll use a simpler filename
      if (!result.tuneName) {
        console.log(`  Warning: No tune name found for "${result.hymnName}", will use hymn name only`);
        const sanitize = (str) => str.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
        const newFilename = `${sanitize(result.hymnName)}.mid`;
        const outputPath = path.join(outputDir, newFilename);
        
        if (fs.existsSync(outputPath) && metadata[newFilename]) {
          console.log(`  -> ${newFilename} (already exists, skipping)`);
          skipped.push(newFilename);
          continue;
        }
        
        fs.copyFileSync(filePath, outputPath);
        console.log(`  -> ${newFilename}`);
        
        metadata[newFilename] = {
          hymnName: result.hymnName,
          hymnNumber: result.hymnNumber,
          label: result.hymnName,
          originalFilename: result.originalFilename,
          detectedKey: result.detectedKey
        };
        
        processed.push(newFilename);
        continue;
      }
      
      const newFilename = generateFilename(result.hymnName, result.tuneName);
      const outputPath = path.join(outputDir, newFilename);
      
      // Check if file already exists (skip if already processed)
      if (fs.existsSync(outputPath) && metadata[newFilename]) {
        console.log(`  -> ${newFilename} (already exists, skipping)`);
        skipped.push(newFilename);
        continue;
      }
      
      // Copy file
      fs.copyFileSync(filePath, outputPath);
      console.log(`  -> ${newFilename}`);
      
      // Build metadata entry (will overwrite if updating existing entry)
      metadata[newFilename] = {
        hymnName: result.hymnName,
        tuneName: result.tuneName,
        label: `${result.hymnName} (${result.tuneName})`,
        originalFilename: result.originalFilename,
        detectedKey: result.detectedKey
      };
      
      processed.push(newFilename);
    }
  }
  
  // Write merged metadata.json
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`\n✓ Processed ${processed.length} new files`);
  if (skipped.length > 0) {
    console.log(`✓ Skipped ${skipped.length} existing files`);
  }
  console.log(`✓ Updated metadata.json with ${Object.keys(metadata).length} total entries`);
  console.log(`✓ Metadata written to: ${metadataPath}`);
  
  rl.close();
}

// Run if called directly
if (require.main === module) {
  main().catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });
}

module.exports = { processMidiFile, generateFilename, detectKeyFromMidi };
