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

## Notes

- **Microphone** requires `getUserMedia` and will prompt for permission.
- MIDI parsing uses `@tonejs/midi` via CDN import in `js/utils/midiParser.js`.


