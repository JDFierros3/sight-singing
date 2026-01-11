# Shape‑Note Ear Trainer (V2)

A lightweight, one-page **shape‑note / solfege ear trainer** aimed at singers who read shape‑note hymnals and want to practice **movable‑Do**, **drones**, **intervals**, warmups, and basic **SATB** hymn practice.

## Run locally

This is a static site. You just need any local web server (recommended so ES modules load correctly).

### Option A: Python (installed on most machines)

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

### Option B: Node

```bash
npx --yes serve .
```

## Project structure

- `index.html`: single-page UI
- `styles/` + `styles.css`: styling
- `js/`: app code
  - `js/state/`: state management (`appState.js`)
  - `js/rendering/`: staff + shapes rendering
  - `js/audio/`: WebAudio (drones, mic, oscillators)
  - `js/exercises/`: warmups / intervals / cluster / SATB
  - `js/utils/`: music theory, MIDI parsing, math, DOM helpers
  - `js/tests/`: simple in-browser test runner
- `midi/`: MIDI files used for SATB practice (e.g. `330-Amazing_Grace.mid`)

## MIDI Library

The app supports loading MIDI files for SATB hymn practice. MIDI files are stored in the `/midi` folder and automatically discovered on startup.

### Building the MIDI Library

**Note for End Users**: The MIDI library (files in `/midi` folder and `metadata.json`) is already included in the repository. You don't need to run the build script to use the app - just clone and run!

**For Developers/Maintainers**: The build script is used to expand the library with new hymns:

1. **Install dependencies** (required for build script):
   ```bash
   npm install @tonejs/midi
   ```

2. **Download MIDI files** from Hymnary.org into a temporary folder (e.g., `./downloaded-midis`). Files will have numbered filenames (e.g., `330.mid`, `1234.mid`).

3. **Run the build script** to organize and rename files:
   ```bash
   node scripts/build-midi-library.js --input ./downloaded-midis --output ./midi --interactive
   ```
   
   The script will:
   - Extract tune names from MIDI metadata when possible
   - Prompt you to map numbered files to hymn/tune names (in interactive mode)
   - Rename files to `{HymnName}_{TUNE_NAME}.mid` format
   - Merge into existing `midi/metadata.json` (won't overwrite existing entries)
   - Detect keys from MIDI file content (stored for reference only)
   - Skip files that already exist (safe to run incrementally)

4. **Alternative: Manual mapping file**
   
   Create a `mappings.json` file:
   ```json
   {
     "330.mid": { "tuneName": "NEW BRITAIN", "hymnName": "Amazing Grace" },
     "1234.mid": { "tuneName": "OLD HUNDREDTH", "hymnName": "Doxology" }
   }
   ```
   
   Then run:
   ```bash
   node scripts/build-midi-library.js --input ./downloaded-midis --output ./midi --mappings ./mappings.json
   ```

5. **Commit the results**: After running the script, commit both:
   - The processed MIDI files in `/midi` folder (renamed with proper names)
   - The updated `midi/metadata.json` file
   
   This ensures end users can use the app without needing to run the build script themselves.

**Workflow Summary**:
- Build script is a **developer tool** - run it when adding new hymns to the library
- Script is **incremental** - safe to run multiple times, merges into existing metadata
- **Commit everything** - MIDI files + metadata.json should be in the repository
- End users just clone and run - no build step needed

### Using the Hymn Browser

- Click "Browse Hymns" button in the SATB tab to open the searchable hymn browser
- Search by hymn name or tune name
- Use keyboard navigation: Arrow keys to navigate, Enter to select, Escape to close
- Selected hymns display on the staff with proper key signatures and solfege

### Key Detection

**Important**: Keys are always detected from MIDI file content, never from website metadata. This ensures accurate key signatures even when Hymnary.org metadata is incorrect.

## Notes

- **Microphone** requires `getUserMedia` and will prompt for permission.
- MIDI parsing uses `@tonejs/midi` via CDN import in `js/utils/midiParser.js`.


