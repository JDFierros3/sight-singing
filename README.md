# Shape-Note Ear Trainer

A static, single-page web app for singers who read **movable-Do solfège** and **shape notes**. Practice pitch against drones, drill intervals and chord qualities, run vocal warmups, play SATB hymns — and sing along with a congregation using the **Live Sing** tab.

No framework, no bundler, no build step to run it. Just vanilla JavaScript ES modules and a local web server.

**Live demo:** https://jdfierros3.github.io/sight-singing/ (deployed from `master` via GitHub Pages)

---

## Run locally

It's a static site, but ES modules need to be served over HTTP (not opened as a `file://`).

```bash
# Option A — Python (already on most machines)
python -m http.server 8000

# Option B — Node
npx --yes serve .
```

Then open `http://localhost:8000`. Grant microphone access when prompted for the pitch-feedback features.

---

## What's in it

The app is organized into tabs:

- **Home** — sing against a drone; movable-Do reference with shape-note staff feedback.
- **Interval Training** — hear and identify intervals at easy/medium/hard difficulty.
- **Hidden Cluster** — dictation-style cluster exercises.
- **Chord Quality** — identify diatonic triad qualities (shape-note harmony).
- **Warmup** — guided vocal warmup sequences.
- **Flashcards** — shape ⇄ solfège drills.
- **SATB Practice** — load a hymn and play its four voices with adjustable per-part volume.
- **Live Sing** — congregational sing-along (see below).
- **Music Theory** — reference material.

Feedback is always **green / yellow / red** (in-tune / close / off) — this is a practice tool, so there's **no scoring or judgment**.

### Live Sing

For singing together, in person, with no backend:

- Everyone loads the **same hymn** on their own phone, picks their **part** (S/A/T/B) and the **key**, and puts in **one earbud**.
- Tap **Start** together on the leader's count. A **3-2-1 count-in** buffers audio + notation so the first notes don't drop, and gives the group a shared downbeat.
- The app plays **your chosen voice softly in one ear** (stereo-panned) while real engraved shape-note notation **scrolls full-screen**.
- Your microphone drives a **pitch line** over the staff, colored by how in-tune you are with the note under the playhead.

Because every phone plays the same hymn at the same fixed tempo, a synchronized start keeps everyone together for the whole song — no networking required.

### Notation

Live Sing renders real engraved notation with [VexFlow](https://github.com/0xfe/vexflow):

- **7-shape shape-note noteheads**, **colored by solfège**.
- **Beaming**, **ties** (including across barlines), **slurs**, and **fermatas**.
- **Lyrics** aligned to the melody note-by-note (handling melismas and chorus/stanza sections), centered between the treble and bass staves.

---

## Hymn library (OpenPsalm, CC-BY)

Hymns come from the public-domain, CC-BY-4.0 [OP-songs](https://github.com/squinky86/OP-songs) repository (openpsalm.com). The committed library is **`openpsalm/songs.json`** (121 songs), with attribution preserved in **`openpsalm/SOURCES.md`**.

Each song carries per-voice SATB note streams, verse lyrics (syllable-aligned), key, time signature, tempo, and license metadata.

**You don't need to build anything to use the app** — `songs.json` is committed. The build script is only for regenerating/expanding the library:

```bash
npm install                              # dev dependencies (build scripts only)
npm run build-openpsalm-library          # fetch OP-songs, license-filter, write openpsalm/songs.json
```

The script (`scripts/build-openpsalm-library.js`) fetches the OP-songs repo, includes **only** songs clearly marked public-domain + CC-BY, parses the LilyPond-subset note streams into the app's format, aligns lyrics to notes, and preserves attribution.

---

## Tech stack

- **Vanilla JS, ES modules** — no framework, no bundler, no transpiler.
- **Single global state** object (`js/state/appState.js`), mutated directly; a `requestAnimationFrame` loop picks up changes.
- Runtime libraries loaded from **CDN** (no install needed to run): [VexFlow](https://github.com/0xfe/vexflow) (notation), [Tone.js](https://tonejs.github.io/) (sampled piano), [soundfont-player](https://github.com/danigb/soundfont-player) (choir), [@tonejs/midi](https://github.com/Tonejs/Midi) (MIDI parsing).
- **Web Audio API** for drones/oscillators and stereo panning; `getUserMedia` + autocorrelation pitch detection for the mic.
- `devDependencies` in `package.json` are used **only** by the Node build scripts, never at runtime.

## Project structure

```
index.html            single-page UI
styles.css            the app's stylesheet
js/
  state/              appState.js — the single global state object
  config/             shared musical constants (SOLFEGE, CHORDS, ranges, ...)
  audio/              Web Audio: context, oscillators, instruments, microphone, panning
  pitch/              autocorrelation pitch detection
  rendering/          canvas staff + shape drawing; notationView.js (VexFlow engraving)
  exercises/          intervals, cluster, chord-quality, warmup, satb, liveSing
  player/             sequence/note scheduling and playback
  ui/                 tabs, components, handlers
  utils/              music theory, key signatures, MIDI parsing, DOM helpers
  tests/              in-browser test runner (opt-in, see below)
openpsalm/            songs.json (the hymn library) + SOURCES.md (attribution)
scripts/              Node build scripts (developer tooling)
```

> **Note on legacy files.** The live app is the nested module tree under `js/`. A set of flat V1 files (`js/state.js`, `js/audio.js`, `js/ui.js`, etc.) and the `styles/` folder are **dead code** — nothing in the live tree imports them. Likewise `scripts/build-midi-library.js` / `download-hymns.js` / the `midi/` MIDI pipeline are superseded by the OpenPsalm library. See `CLAUDE.md` for details.

## Tests

Tests are in-browser only. To run them, uncomment the `import './tests/tests.js'` line in `js/main.js`, serve the app, and check the rendered test output.

## Attribution & licensing

- **Hymn arrangements** are © Jon Hood / OpenPsalm, released under **CC-BY 4.0**; the underlying hymns are public domain. Attribution for every included song is in `openpsalm/SOURCES.md` — keep it if you redistribute the data.
- **VexFlow** (MIT), **Tone.js** (MIT), **soundfont-player** (MIT), **@tonejs/midi** (MIT) are loaded at runtime from CDN.
- No license has been declared for this project's own source code yet; add a `LICENSE` file before relying on it.

## Conventions

This is a **solfège-first, shape-note** app: the UI always shows movable-Do syllables and shapes — **never absolute note names** (C, D, E…). Note names and MIDI are internal calculation only. Diatonic triads follow traditional shape-note qualities.
