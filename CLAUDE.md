# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shape-Note Ear Trainer — a static single-page web app for singers to practice movable-Do solfege, drones, intervals, warmups, and SATB hymn playback. Vanilla JavaScript with ES modules, no framework, no bundler, no transpiler.

## Running Locally

```bash
python -m http.server 8000
# or
npx --yes serve .
```

Open `http://localhost:8000`. A local server is required for ES module loading.

## MIDI Library Scripts

Only needed when adding new hymns to the library (the `/midi` folder is already committed):

```bash
npm install                  # install devDependencies (@tonejs/midi, cheerio, node-fetch)
node scripts/build-midi-library.js --input ./downloaded-midis --output ./midi --interactive
node scripts/build-midi-library.js --input ./downloaded-midis --output ./midi --mappings ./mappings.json
```

## Tests

Tests are in-browser only (`js/tests/runner.js` + `js/tests/tests.js`). The import is commented out in `js/main.js`. To run: uncomment `import './tests/tests.js'` in main.js, serve the app, and check the rendered test output.

## Architecture

### Entry Point & the Live Module Tree
`index.html` loads root `styles.css` and dynamically imports `js/main.js`, whose `initializeApplication()` builds the UI, wires handlers, and starts the render loop. **The live code is the nested module tree under `js/` (`js/state/`, `js/audio/`, `js/rendering/`, `js/exercises/`, `js/ui/`, `js/player/`, `js/config/`, `js/utils/`).**

> ⚠️ **Dead legacy code — do not edit these.** A set of flat V1 files exists alongside the modules and only import each other; nothing in the live tree loads them: `js/state.js`, `js/util.js`, `js/audio.js`, `js/pitch.js`, `js/staff.js`, `js/ui.js`, `js/exercises.js`, `js/tests.js`. Live state is `js/state/appState.js` (NOT `js/state.js`); live audio is `js/audio/`, etc. Likewise the `styles/` folder (`variables.css`, `base.css`, …) is unreferenced — the only live stylesheet is the root `styles.css`. Editing the flat files or `styles/` has zero effect on the running app.

### Constants
Shared musical constants live in `js/config/constants.js`: `SOLFEGE`, `DEGREE_SEMITONES`, `CHORDS`, `NATURAL_CHORD_QUALITIES`, `PART_RANGES`, `SEMITONE_TO_SOLFEGE`, and the `INTERVAL_/CLUSTER_DIFFICULTY_PRESETS`. Import from here rather than redefining.

### State Management
Single global state object in `js/state/appState.js` — no reactive framework. All modules import and mutate `appState` directly. The render loop picks up changes on the next `requestAnimationFrame`.

### Render Loop
`js/main.js` runs a `requestAnimationFrame` loop that calls pitch detection → canvas staff rendering → transport UI refresh every frame. The canvas is fully redrawn each frame (no diffing).

### Tab/Exercise Routing
Tabs use `data-tab` HTML attributes (`home`, `intervals`, `cluster`, `chord-quality`, `warmup`, `flashcards`, `satb`, `theory`). `js/ui/components/tabs.js` manages panel visibility. The global Play button in `js/ui/components/transport.js` routes to the correct exercise handler based on `appState.exercise.currentTab`.

### Audio
Two playback paths:
- **Oscillator:** raw Web Audio API oscillators (used for drones, beeps)
- **Instrument:** Tone.js Sampler (piano) or soundfont-player (choir), loaded from CDN at runtime

Microphone input uses `getUserMedia` → `AnalyserNode` → autocorrelation pitch detection (`js/pitch/detection.js`).

### Sequence Player
`js/player/sequencePlayer.js` orchestrates note-by-note playback with animation. Each sequence gets an incrementing ID from `sequenceManager.js`. All async callbacks check `isValidSequence(seqId)` before proceeding — this is the cancellation pattern used throughout.

### MIDI Parsing
`js/utils/midiParser.js` dynamically imports `@tonejs/midi` from CDN. Handles SATB voice separation for 1-track, 2-track, and 4-track MIDI files using voice-leading heuristics.

### Movable Do
All solfege is relative to `appState.tuning.doMidi`. SATB exercises temporarily use `appState.staff.keyTonic` as the tonal center.

## Key Conventions

- **One handler per export:** `js/ui/handlers/inputs.js` exports one named function per event handler; `main.js` destructures them all.
- **DOM access:** All `getElementById` calls go through `js/utils/dom.js` wrapper (logs warnings on miss).
- **No external dependencies at dev time:** CDN-loaded libraries (Tone.js, soundfont-player, @tonejs/midi) are imported at runtime. `devDependencies` in package.json are only for the MIDI build scripts.
- **Shape-note shapes:** Do=triangle, Re=diamond, Mi=right triangle, Fa=downward triangle, Sol=circle, La=square, Ti=left triangle (drawn in `js/rendering/shapes.js`).
- **Staff rendering is diatonic:** Note positions use letter-name steps (not semitones), with key-aware enharmonic spelling via `js/utils/keySignature.js`.
- **Dark theme:** CSS custom properties defined in `:root` of the root `styles.css` (`--bg: #0f1220`, `--panel: #171a2b`, etc.).

## Domain Conventions (from `.cursor/rules/Rules.mdc`)

- **Solfege-first UI:** always display movable-Do syllables/shapes (Do Re Mi Fa Sol La Ti); **never show absolute note names** (C, D, E…) in the UI. Note names/MIDI are for internal calculation only.
- **Shape-note harmony:** diatonic triads follow traditional shape-note qualities (I=Do Mi Sol, ii=Re Fa La, … vii°=Ti Re Fa) — see `NATURAL_CHORD_QUALITIES`.
- **No scoring/judgment:** this is a practice tool. Give green/yellow/red feedback, but don't penalize or track performance.
- **"Newspaper" code style:** short single-purpose functions (~5–15 lines), `verbNoun()` names that read like headlines, public functions above private helpers, top-to-bottom narrative flow.
