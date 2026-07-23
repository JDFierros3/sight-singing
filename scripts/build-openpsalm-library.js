#!/usr/bin/env node
/**
 * Build an OpenPsalm hymn library for the app from the public, CC-BY licensed
 * OP-songs repository (https://github.com/squinky86/OP-songs).
 *
 * Each song is a TOML file with per-voice (SATB) note streams in an OpenPsalm
 * LilyPond-inspired notation. We parse the notes into the app's exercise format
 * ({ parts: { S,A,T,B: [{ midi, startTime, duration, part }] }, ... }), keep the
 * lyrics and attribution, and write a single committed JSON the app loads.
 *
 * LICENSING: OP-songs mixes three categories. We include ONLY songs whose
 * `copyrights` clearly mark a public-domain work carrying OpenPsalm's CC-BY 4.0
 * arrangement, and we SKIP anything that looks permission-restricted or ships a
 * per-song copyright.txt (needs human review). Attribution is preserved per song.
 *
 * Usage:
 *   node scripts/build-openpsalm-library.js            # build all
 *   node scripts/build-openpsalm-library.js --ids 1,2  # a subset (debugging)
 *   node scripts/build-openpsalm-library.js --limit 5  # first N (debugging)
 */

const fs = require('fs');
const path = require('path');
const TOML = require('@iarna/toml');

const REPO = 'squinky86/OP-songs';
const RAW = `https://raw.githubusercontent.com/${REPO}/main`;
const API_TREE = `https://api.github.com/repos/${REPO}/git/trees/main?recursive=1`;
const OUT_DIR = path.join(__dirname, '..', 'openpsalm');
const OUT_JSON = path.join(OUT_DIR, 'songs.json');
const OUT_SOURCES = path.join(OUT_DIR, 'SOURCES.md');

// --- Note timing: app note times are seconds at a 60 BPM reference (quarter = 1s). ---
const STEP_SEMI = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { ids: null, limit: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--ids') opts.ids = args[++i].split(',').map(s => s.trim());
    else if (args[i] === '--limit') opts.limit = parseInt(args[++i], 10);
  }
  return opts;
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'solfege-openpsalm-build' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}
async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'solfege-openpsalm-build' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

/** Convert a LilyPond duration number (+dots) to seconds at 60 BPM (quarter = 1s). */
function durationToSeconds(durNum, dots) {
  let beats = 4 / durNum; // whole=4s, quarter=1s, eighth=0.5s
  let add = beats;
  for (let i = 0; i < dots; i++) { add /= 2; beats += add; }
  return beats;
}

/** step+accidental+octave marks -> MIDI (c' = C4 = 60; no marks = octave 3). */
function pitchToMidi(step, accidental, octaveMarks) {
  const semis = STEP_SEMI[step];
  let acc = 0;
  if (accidental === 'is') acc = 1;
  else if (accidental === 'es') acc = -1;
  let octave = 3;
  for (const ch of octaveMarks) octave += ch === "'" ? 1 : -1;
  return (octave + 1) * 12 + semis + acc;
}

// Strip every non-pitch/duration flag from a single note token, leaving
// {step}{accidental}{octaves}{duration}{dots}.
function stripFlags(token) {
  return token
    .replace(/\/[+-]?\d+/g, '')      // dedup tick offset  /-24
    .replace(/%[a-z]+/gi, '')        // dynamics  %mf
    .replace(/\\[<>!]/g, '')         // hairpins  \< \> \!
    .replace(/\\[a-z]+/gi, '')       // spanners  \rit \atempo
    .replace(/@[a-z0-9]+/gi, '')     // chorus/coda markers  @c @s1
    .replace(/-\(|-\)|-\./g, '')     // dashed slur / staccato
    .replace(/[()~![\]]/g, '');      // slur, tie, fermata, beam
}

// Detect the melisma/section flags on a RAW token (before stripFlags removes them):
//   ( ) slurs and [ ] manual beams both group notes under one syllable (LilyPond
//   treats them as melismata); @xxx marks the start of a lyric section (chorus/stanza).
function tokenFlags(tok) {
  const marker = (tok.match(/@([a-z0-9]+)/i) || [])[1] || null;
  return {
    marker,
    slurOpen: tok.includes('('), slurClose: tok.includes(')'),
    beamOpen: tok.includes('['), beamClose: tok.includes(']'),
    fermata: tok.includes('!')   // ! marks a fermata (hold)
  };
}

/**
 * Parse one part's note stream into [{ midi, startTime, duration }].
 * Monophonic per voice: for a chord/divisi <..> we take the first (primary) pitch.
 * Each note also carries transient `_marker` (lyric-section start) and `_melisma`
 * (this note is sung under the previous syllable) used only to align lyrics; both
 * are stripped before the note is written to the library.
 */
function parseNotes(noteStream, partName) {
  // Flatten measures; join chord fragments that got split on the space inside <..>.
  const rawTokens = noteStream.replace(/\|/g, ' ').split(/\s+/).filter(Boolean);
  const tokens = [];
  for (let i = 0; i < rawTokens.length; i++) {
    let tok = rawTokens[i];
    if (tok.startsWith('<') && !tok.includes('>')) {
      // gather chord fragments until the one containing '>'
      while (i + 1 < rawTokens.length && !tok.includes('>')) tok += ' ' + rawTokens[++i];
    }
    tokens.push(tok);
  }

  const notes = [];
  let time = 0;
  let lastDur = 4;       // LilyPond-style inherited duration
  let tuplet = null;      // { ratio } while inside { N ... }
  let pendingTie = false;
  let lastNote = null;
  let inSlur = false;     // inside a ( ... ) slur => melisma
  let inBeam = false;     // inside a [ ... ] manual beam => melisma
  let pendingMarker = null; // a standalone @section marker attaches to the next note
  let slurCounter = 0;    // each slur gets a shared id so notation can draw one curve over it
  let currentSlurId = null;

  const noteRe = /^([a-g])(is|es)?('*|,*)(\d+)?(\.*)$/;

  for (let tok of tokens) {
    if (tok === '}') { tuplet = null; continue; }
    const tupOpen = tok.match(/^\{(\d+)(?::(\d+))?$/);
    if (tupOpen) {
      const n = parseInt(tupOpen[1], 10);
      let m = tupOpen[2] ? parseInt(tupOpen[2], 10) : Math.pow(2, Math.floor(Math.log2(n)));
      tuplet = { ratio: m / n };
      continue;
    }
    if (/^@[a-z0-9]+$/i.test(tok)) { pendingMarker = tok.slice(1); continue; } // standalone marker (e.g. @s1)

    // Slur/beam state governs whether THIS note is a melisma continuation (sung under
    // the previous syllable). The opening note of a group is a syllable onset; the rest
    // are continuations. Read the flags from the raw token before stripFlags clears them.
    const flags = tokenFlags(tok);
    const wasSlur = inSlur, wasBeam = inBeam;
    if (flags.slurOpen) { inSlur = true; currentSlurId = ++slurCounter; }
    if (flags.beamOpen) inBeam = true;
    const melisma = (wasSlur && !flags.slurOpen) || (wasBeam && !flags.beamOpen);
    const marker = flags.marker || pendingMarker;
    // This note belongs to a slur if it opened one or is inside one.
    const slurId = (flags.slurOpen || wasSlur) ? currentSlurId : null;
    const fermata = flags.fermata || undefined;
    const closeGroups = () => {
      if (flags.slurClose) { inSlur = false; currentSlurId = null; }
      if (flags.beamClose) inBeam = false;
    };

    // Chord / divisi: take the first pitch, duration after '>'
    if (tok.startsWith('<')) {
      const m = tok.match(/^<\s*([^>]*)>(\d+)?(\.*)/);
      if (!m) { closeGroups(); continue; }
      const firstPitch = stripFlags(m[1].trim().split(/\s+/)[0]);
      const pm = firstPitch.match(noteRe);
      const durNum = m[2] ? parseInt(m[2], 10) : lastDur;
      const dots = (m[3] || '').length;
      if (m[2]) lastDur = durNum;
      let dur = durationToSeconds(durNum, dots);
      if (tuplet) dur *= tuplet.ratio;
      if (pm) {
        const midi = pitchToMidi(pm[1], pm[2], pm[3]);
        const note = { midi, startTime: round(time), duration: round(dur), part: partName, _melisma: melisma, _marker: marker, _slurId: slurId, _fermata: fermata, _tieDurs: [round(dur)] };
        notes.push(note);
        lastNote = note;
        pendingMarker = null;
        pendingTie = /~/.test(tok);
      }
      time += dur;
      closeGroups();
      continue;
    }

    const clean = stripFlags(tok);

    // Rest or spacer: advance time, emit nothing.
    const restM = clean.match(/^([rs])(\d+)?(\.*)$/);
    if (restM) {
      const durNum = restM[2] ? parseInt(restM[2], 10) : lastDur;
      if (restM[2]) lastDur = durNum;
      let dur = durationToSeconds(durNum, (restM[3] || '').length);
      if (tuplet) dur *= tuplet.ratio;
      time += dur;
      pendingTie = false;
      closeGroups();
      continue;
    }

    const pm = clean.match(noteRe);
    if (!pm) { closeGroups(); continue; } // unknown token — skip defensively
    const durNum = pm[4] ? parseInt(pm[4], 10) : lastDur;
    if (pm[4]) lastDur = durNum;
    let dur = durationToSeconds(durNum, (pm[5] || '').length);
    if (tuplet) dur *= tuplet.ratio;
    const midi = pitchToMidi(pm[1], pm[2], pm[3]);

    if (pendingTie && lastNote && lastNote.midi === midi) {
      // Tie: extend the previous note for playback (one sustained sound), but record each
      // written segment's duration so notation can redraw them as separate tied noteheads.
      lastNote.duration = round(lastNote.duration + dur);
      (lastNote._tieDurs = lastNote._tieDurs || [lastNote.duration]).push(round(dur));
      if (flags.fermata) lastNote._fermata = true;
      time += dur;
      pendingTie = /~/.test(tok);
      closeGroups();
      continue;
    }

    const note = { midi, startTime: round(time), duration: round(dur), part: partName, _melisma: melisma, _marker: marker, _slurId: slurId, _fermata: fermata, _tieDurs: [round(dur)] };
    notes.push(note);
    lastNote = note;
    pendingMarker = null;
    time += dur;
    pendingTie = /~/.test(tok);
    closeGroups();
  }

  return notes;
}

function round(x) { return Math.round(x * 1000) / 1000; }

// Split a verse's text into singable syllables (drop "--" hyphen-joiners + @markers).
function splitSyllables(text) {
  if (!text) return [];
  return text.split(/\s+/).filter(t => t && t !== '--' && !t.startsWith('@'));
}

// Find a verse's text by lyric key, tolerating case + chorus aliases (c / ch / chorus).
function lyricTextFor(lyrics, key) {
  if (!lyrics) return null;
  const k = String(key || '1');
  if (lyrics[k]) return lyrics[k].text;
  const ci = Object.keys(lyrics).find(x => x.toLowerCase() === k.toLowerCase());
  if (ci) return lyrics[ci].text;
  if (/^c/i.test(k)) {
    const ck = Object.keys(lyrics).find(x => /^(chorus|c|ch)$/i.test(x));
    if (ck) return lyrics[ck].text;
  }
  return null;
}

/**
 * Align verse-1 lyrics to the soprano notes, returning one string per soprano note
 * ('' where a note is a melisma continuation or a syllable is unavailable). The `@`
 * section markers partition the notes into verse/chorus/stanza runs, each drawing from
 * its matching lyric section; assignment is re-anchored per section so a count mismatch
 * in one section can't drift the rest of the song.
 */
function alignVerse1(sopNotes, lyrics) {
  // Partition notes into sections; a note carrying a marker begins a new section.
  const sections = [];
  let cur = { key: '1', notes: [] };
  for (const n of sopNotes) {
    if (n._marker && cur.notes.length) { sections.push(cur); cur = { key: n._marker, notes: [] }; }
    else if (n._marker) cur.key = n._marker; // marker on the very first note
    cur.notes.push(n);
  }
  sections.push(cur);

  const out = [];
  for (const sec of sections) {
    const syl = splitSyllables(lyricTextFor(lyrics, sec.key));
    let s = 0;
    for (const n of sec.notes) {
      if (n._melisma) out.push('');                 // sung under the previous syllable
      else out.push(s < syl.length ? syl[s++] : ''); // next syllable, or blank if exhausted
    }
  }
  return out;
}

// Remove the transient lyric-alignment flags before a note is written to the library.
// Promote the notation flags we want to keep into permanent fields, then drop the
// transient underscore-prefixed ones (used only during parsing/lyric alignment).
function finalizeNotes(notes) {
  for (const n of notes) {
    if (n._fermata) n.fermata = true;
    if (n._slurId != null) n.slurId = n._slurId;
    // tieDurs only matters when a note is actually a tie of 2+ written segments.
    if (Array.isArray(n._tieDurs) && n._tieDurs.length > 1) n.tieDurs = n._tieDurs;
    delete n._melisma; delete n._marker; delete n._slurId; delete n._fermata; delete n._tieDurs;
  }
  return notes;
}

// Map an OpenPsalm choral_type / part name to S/A/T/B.
function partLetter(name, choralType) {
  const t = (choralType || name || '').toLowerCase();
  if (t.startsWith('sop')) return 'S';
  if (t.startsWith('alt')) return 'A';
  if (t.startsWith('ten')) return 'T';
  if (t.startsWith('bass')) return 'B';
  return null;
}

// key_signature "Eb" / "Am" -> { tonicPc, mode }
function parseKey(sig) {
  const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  if (!sig) return { tonicPc: 0, mode: 'major' };
  const minor = sig.endsWith('m');
  const name = minor ? sig.slice(0, -1) : sig;
  const pc = PC[name];
  return { tonicPc: Number.isFinite(pc) ? pc : 0, mode: minor ? 'minor' : 'major' };
}

/**
 * Decide whether a song is clearly open (public-domain work + CC-BY arrangement).
 * Conservative: require an explicit public-domain marker and CC-BY, and reject any
 * permission language or a per-song copyright.txt (those need human review).
 */
function isClearlyOpen(copyrights, hasCopyrightTxt) {
  if (hasCopyrightTxt) return { ok: false, reason: 'has copyright.txt (needs review)' };
  if (!Array.isArray(copyrights) || copyrights.length === 0) return { ok: false, reason: 'no copyrights field' };
  const text = copyrights.join(' • ').toLowerCase();
  // Reject anything that signals the work is NOT free — permission grants, active/renewed
  // copyright, or reserved rights. Independent of the copyright.txt check so a restricted
  // song is caught even if it ships no copyright.txt.
  const restricted = /(by|with) permission|all rights reserved|under copyright|renewed \d{4}|©|\(c\)\s|copyright \d/.test(text);
  if (restricted) return { ok: false, reason: 'restrictive copyright language' };
  const pd = text.includes('public domain');
  const ccby = /cc-?by/.test(text);
  if (!pd) return { ok: false, reason: 'no public-domain marker' };
  if (!ccby) return { ok: false, reason: 'no CC-BY arrangement' };
  return { ok: true, reason: 'public domain + CC-BY' };
}

async function main() {
  const opts = parseArgs();
  console.log(`Fetching OP-songs tree from ${REPO}...`);
  const tree = await fetchJson(API_TREE);
  const songDirs = new Set();
  const copyrightTxt = new Set();
  for (const entry of tree.tree) {
    const m = entry.path.match(/^(\d+)\/song\.toml$/);
    if (m) songDirs.add(m[1]);
    const c = entry.path.match(/^(\d+)\/copyright\.txt$/);
    if (c) copyrightTxt.add(c[1]);
  }
  let ids = [...songDirs].sort((a, b) => Number(a) - Number(b));
  if (opts.ids) ids = ids.filter(id => opts.ids.includes(id));
  if (opts.limit) ids = ids.slice(0, opts.limit);
  console.log(`Found ${songDirs.size} songs; processing ${ids.length}.`);

  const included = [];
  const skipped = [];

  for (const id of ids) {
    try {
      const toml = await fetchText(`${RAW}/${id}/song.toml`);
      const song = TOML.parse(toml);
      if (song.active === false) { skipped.push({ id, title: song.title, reason: 'active=false' }); continue; }

      const lic = isClearlyOpen(song.copyrights, copyrightTxt.has(id));
      if (!lic.ok) { skipped.push({ id, title: song.title, reason: lic.reason }); continue; }

      // Parse each SATB part.
      const parts = { S: [], A: [], T: [], B: [] };
      let matchedParts = 0;
      for (const [name, part] of Object.entries(song.parts || {})) {
        const letter = partLetter(name, part.choral_type);
        if (!letter || !part.notes) continue;
        const parsed = parseNotes(part.notes, letter);
        // If a letter already has notes (e.g. Bass + Bass2), keep the first/primary.
        if (parts[letter].length === 0 && parsed.length > 0) { parts[letter] = parsed; matchedParts++; }
      }
      if (matchedParts === 0) { skipped.push({ id, title: song.title, reason: 'no SATB parts parsed' }); continue; }

      const lyricsObj = song.lyrics || {};
      // Align verse-1 lyrics to the soprano notes BEFORE stripping the alignment flags.
      const lyricsByNote = alignVerse1(parts.S, lyricsObj);
      for (const letter of ['S', 'A', 'T', 'B']) finalizeNotes(parts[letter]);

      const duration = Math.max(0, ...Object.values(parts).flat().map(n => n.startTime + n.duration));
      const key = parseKey(song.key_signature);

      included.push({
        id: `op-${id}`,
        source: 'openpsalm',
        sourceUrl: `https://openpsalm.com/songs/${id}`,
        label: song.subtitle ? `${song.title} (${song.subtitle})` : song.title,
        hymnName: song.title,
        tuneName: song.subtitle || undefined,
        parts,
        duration: round(duration),
        midiKeyMidi: key.tonicPc,
        midiKeyMode: key.mode,
        keySignature: song.key_signature || null,
        isMidiExercise: true, // reuse the SATB rendering/solfege path (key-based)
        tempoBpm: song.tempo_bpm || 60,
        timeSigNum: song.time_sig_numerator || 4,
        timeSigDen: song.time_sig_denominator || 4,
        phraseBreaks: song.phrase_breaks || [],
        lyrics: lyricsObj,
        lyricsByNote, // verse-1 syllable aligned to each soprano note ('' = melisma/none)
        copyrights: song.copyrights
      });
      process.stdout.write(`  ✓ ${id} ${song.title}\n`);
    } catch (err) {
      skipped.push({ id, reason: `error: ${err.message}` });
      process.stdout.write(`  ✗ ${id} ${err.message}\n`);
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(included, null, 0));
  writeSources(included, skipped);
  console.log(`\nWrote ${included.length} songs to ${path.relative(process.cwd(), OUT_JSON)}`);
  console.log(`Skipped ${skipped.length} (see ${path.relative(process.cwd(), OUT_SOURCES)}).`);
}

function writeSources(included, skipped) {
  let md = `# OpenPsalm Library — Sources & Attribution\n\n`;
  md += `Songs derived from the [OP-songs](https://github.com/squinky86/OP-songs) repository.\n`;
  md += `Arrangements © Jon Hood / OpenPsalm, released under CC-BY 4.0. Underlying hymns are public domain.\n`;
  md += `Only songs clearly marked public-domain + CC-BY are included; each song's copyright lines are preserved below.\n\n`;
  md += `## Included (${included.length})\n\n`;
  for (const s of included) {
    md += `### ${s.hymnName}${s.tuneName ? ` (${s.tuneName})` : ''} — [source](${s.sourceUrl})\n`;
    for (const line of s.copyrights || []) md += `- ${line}\n`;
    md += `\n`;
  }
  md += `## Skipped (${skipped.length})\n\n`;
  for (const s of skipped) md += `- ${s.id}${s.title ? ` "${s.title}"` : ''} — ${s.reason}\n`;
  fs.writeFileSync(OUT_SOURCES, md);
}

main().catch(err => { console.error(err); process.exit(1); });
