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

/**
 * Parse one part's note stream into [{ midi, startTime, duration }].
 * Monophonic per voice: for a chord/divisi <..> we take the first (primary) pitch.
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
    if (tok.startsWith('@')) continue; // standalone marker (e.g. @s1)

    // Chord / divisi: take the first pitch, duration after '>'
    if (tok.startsWith('<')) {
      const m = tok.match(/^<\s*([^>]*)>(\d+)?(\.*)/);
      if (!m) continue;
      const firstPitch = stripFlags(m[1].trim().split(/\s+/)[0]);
      const pm = firstPitch.match(noteRe);
      const durNum = m[2] ? parseInt(m[2], 10) : lastDur;
      const dots = (m[3] || '').length;
      if (m[2]) lastDur = durNum;
      let dur = durationToSeconds(durNum, dots);
      if (tuplet) dur *= tuplet.ratio;
      if (pm) {
        const midi = pitchToMidi(pm[1], pm[2], pm[3]);
        const note = { midi, startTime: round(time), duration: round(dur), part: partName };
        notes.push(note);
        lastNote = note;
        pendingTie = /~/.test(tok);
      }
      time += dur;
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
      continue;
    }

    const pm = clean.match(noteRe);
    if (!pm) continue; // unknown token — skip defensively
    const durNum = pm[4] ? parseInt(pm[4], 10) : lastDur;
    if (pm[4]) lastDur = durNum;
    let dur = durationToSeconds(durNum, (pm[5] || '').length);
    if (tuplet) dur *= tuplet.ratio;
    const midi = pitchToMidi(pm[1], pm[2], pm[3]);

    if (pendingTie && lastNote && lastNote.midi === midi) {
      // Tie: extend the previous note instead of re-attacking.
      lastNote.duration = round(lastNote.duration + dur);
      time += dur;
      pendingTie = /~/.test(tok);
      continue;
    }

    const note = { midi, startTime: round(time), duration: round(dur), part: partName };
    notes.push(note);
    lastNote = note;
    time += dur;
    pendingTie = /~/.test(tok);
  }

  return notes;
}

function round(x) { return Math.round(x * 1000) / 1000; }

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
  const restricted = /used by permission|used with permission|all rights reserved|©|\(c\)\s|copyright \d/.test(text);
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

      const duration = Math.max(0, ...Object.values(parts).flat().map(n => n.startTime + n.duration));
      const key = parseKey(song.key_signature);
      const lyricsObj = song.lyrics || {};

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
        isMidiExercise: true, // reuse the SATB rendering/solfege path (key-based)
        tempoBpm: song.tempo_bpm || 60,
        lyrics: lyricsObj,
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
