/**
 * Ear-Trainer Arcade — Interval Run.
 *
 * Top-down retro-Frogger: the shape notes ARE the stepping stones on a staff that scrolls
 * right→left. Hear Do then the next pitch; tap the note you heard to hop the character onto it.
 * Hop wrong → splash. Hop too slow → your pad reaches the left edge and you're gone. Auto-plays,
 * ramps with difficulty, keeps a local high score.
 *
 * Companion doc: design/solfege-eartrainer-game.html.
 */

import { getVoiceTuning } from '../session/profile.js';
import { ensureAudioContext } from '../audio/context.js';
import { playTonesForDuration } from '../exercises/core.js';
import { SOLFEGE, DEGREE_SEMITONES } from '../config/constants.js';

const HISCORE_KEY = 'solfege.v1.arcade';

// Answer options per level: each is a set of diatonic interval sizes ("Nth" = N-1 scale steps).
// The generator only produces intervals from the active set, so the buttons never lie.
// Difficulty mirrors the Interval drill: more interval sizes + faster drift as you climb.
// startSpeed/maxSpeed are px/sec of leftward scroll; rampStep is the speed-up per 4-combo.
const LEVELS = {
  easy:   { label: 'Easy',   steps: [2, 3, 5],             dirs: ['up'],         startSpeed: 34, maxSpeed: 70,  rampStep: 4, name: 'from Do' },
  medium: { label: 'Medium', steps: [2, 3, 4, 5, 6],       dirs: ['up'],         startSpeed: 48, maxSpeed: 95,  rampStep: 5, name: 'from Do' },
  hard:   { label: 'Hard',   steps: [2, 3, 4, 5, 6, 7, 8], dirs: ['up', 'down'], startSpeed: 64, maxSpeed: 120, rampStep: 6, name: 'up or down' },
  expert: { label: 'Expert', steps: [2, 3, 4, 5, 6, 7, 8], dirs: ['up', 'down'], startSpeed: 84, maxSpeed: 150, rampStep: 8, name: 'up or down' }
};
const NTH_LABEL = { 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th', 7: '7th', 8: 'Octave' };
const SUB_LABEL = { 2: 'Do–Re', 3: 'Do–Mi', 4: 'Do–Fa', 5: 'Do–Sol', 6: 'Do–La', 7: 'Do–Ti', 8: 'Do–Do' };

let G = null; // active game state (null when not running)

/* ----------------------------------------------------------------- public --- */

export function startIntervalRun(level = 'easy') {
  if (G) return;
  const lvl = LEVELS[level] || LEVELS.easy;
  const tuning = getVoiceTuning();
  const doMidi = tuning.doMidi;   // the singer's voice-type Do — every interval is measured from it

  G = {
    level: lvl, levelKey: level, doMidi, clef: tuning.clef || 'treble',
    frogWorld: 0, currentS: 0, worldX: 0, speed: lvl.startSpeed,
    score: 0, combo: 0, best: loadBest(level), lives: 3,
    correctNth: null, candidates: [], landed: [{ s: 0, world: 0, solf: 'Do' }],
    awaiting: false, over: false, lastT: 0, rafId: null, splashUntil: 0
  };
  buildDom();
  ensureAudioContext().then(() => {
    G.worldX = G.frogWorld - laneWidth() * 0.42;   // park the first Do ~42% from the left
    startRound();
    G.lastT = performance.now();
    G.rafId = requestAnimationFrame(loop);
  });
}

export function stopIntervalRun() {
  if (!G) return;
  if (G.rafId) cancelAnimationFrame(G.rafId);
  G.root?.remove();
  G = null;
}

/* ------------------------------------------------------------- helpers ----- */

function scaleIndexToMidi(s, doMidi) {
  const oct = Math.floor(s / 7);
  const deg = ((s % 7) + 7) % 7;
  return doMidi + DEGREE_SEMITONES[deg] + 12 * oct;
}
function solfegeForIndex(s) { return SOLFEGE[((s % 7) + 7) % 7]; }
function padSpacing() { return Math.max(150, laneWidth() * 0.20); }
function frogScreenX() { return G.frogWorld - G.worldX; }

// Real-staff geometry. Do (s=0) sits on the middle line; each diatonic step is HALF a line-gap,
// so notes land exactly on lines and in the spaces between them. The 5 printed lines are the
// even indices s = +4,+2,0,-2,-4; anything on/beyond ±6 gets ledger lines like real notation.
const STAFF_CENTER = 0.40;   // fraction of field height for the middle line (Do)
const STAFF_GAP = 0.075;     // fraction of field height between adjacent staff lines
function fieldH() { return G.root.querySelector('#arField').clientHeight || 300; }
function yForIndex(s) { return fieldH() * (STAFF_CENTER - s * STAFF_GAP / 2); }

// Even indices past the outer lines (±4) that a note needs ledger lines drawn through/toward.
function ledgersFor(s) {
  const out = [];
  for (let e = 6; e <= s; e += 2) out.push(e);      // above the top line
  for (let e = -6; e >= s; e -= 2) out.push(e);     // below the bottom line
  return out;
}

/* ------------------------------------------------------------------- loop --- */

function loop(now) {
  if (!G || G.over) return;
  const dt = Math.min(0.05, (now - G.lastT) / 1000);
  G.lastT = now;
  // Constant leftward drift = time pressure. A camera clamp then eases the view forward so a
  // fast player's frog never runs off the RIGHT edge (it can't sit further right than ~42%).
  G.worldX += driftPxPerSec() * dt;
  const camMin = G.frogWorld - laneWidth() * 0.42;
  if (G.worldX < camMin) G.worldX += (camMin - G.worldX) * Math.min(1, 7 * dt);
  applyScroll();
  if (frogScreenX() <= deadzoneX() && now > G.splashUntil && G.awaiting) loseLife('edge');
  G.rafId = requestAnimationFrame(loop);
}

/* --------------------------------------------------------------- gameplay --- */

// Every round is "from Do": play Do, then Do+interval. Candidate pads (one per option) stand at
// their interval heights above Do; jump to the one you heard — only the right pad holds you up.
function startRound() {
  G.awaiting = true;
  G.currentS = 0;
  const steps = G.level.steps;
  const dirs = G.level.dirs || ['up'];
  G.dir = dirs[(Math.random() * dirs.length) | 0] === 'down' ? -1 : 1;   // this round: up or down
  G.correctNth = steps[(Math.random() * steps.length) | 0];
  const cw = G.frogWorld + padSpacing();
  // Signed scale index: ascending Do→(nth-1) above, descending Do→(nth-1) below.
  G.candidates = steps.map(nth => ({ nth, s: G.dir * (nth - 1), world: cw }));
  render();
  renderAnswers();
  setPrompt(G.dir < 0 ? 'From Do — the note is lower' : 'From Do — jump to the note you heard');
  const targetMidi = scaleIndexToMidi(G.dir * (G.correctNth - 1), G.doMidi);
  playTonesForDuration([G.doMidi], 0.55, 'Do');
  setTimeout(() => { if (G && !G.over && G.awaiting) playTonesForDuration([targetMidi], 0.6, 'target'); }, 640);
}

function answer(nth) {
  if (!G || !G.awaiting || G.over) return;
  const chosen = G.candidates.find(c => c.nth === nth);
  if (!chosen) return;
  G.awaiting = false;
  const correct = G.candidates.find(c => c.nth === G.correctNth);
  // Only ever label the CORRECT jump — the interval + syllable, tied to the slur.
  const label = `${NTH_LABEL[G.correctNth]}${G.dir < 0 ? '↓' : ''} · ${solfegeForIndex(correct.s)}`;
  G.candidates = [];                        // the other options clear; only the jump path remains
  if (nth === G.correctNth) {
    G.combo += 1;
    G.score += 1 + Math.floor(G.combo / 3);
    landOn(correct, label);
    ramp();
    updateHud();
  } else {
    revealCorrect(correct, label);          // show the right jump so it's learnable; the miss is unlabeled
    splashFrog();
    loseLife('wrong');
  }
}

// Correct: leap onto the target and tie the Do→target jump into the trail (slur + label), then
// bounce to a fresh Do. The tie is history now — it drifts left with the scroll.
function landOn(correct, label) {
  const sp = padSpacing();
  G.currentS = correct.s; G.frogWorld += sp;
  G.landed.push({ s: correct.s, world: correct.world, solf: solfegeForIndex(correct.s), label });
  trimTrail();
  flashFrogHop(); render();
  setTimeout(() => {
    if (!G || G.over) return;
    G.landed.push({ s: 0, world: G.frogWorld + sp, solf: 'Do' });   // bounce back down to Do
    trimTrail();
    G.currentS = 0; G.frogWorld += sp;
    flashFrogHop(); render(); startRound();
  }, 700);
}

// Wrong: reveal the correct jump as a tied slur+label (the frog didn't make it), then splash.
function revealCorrect(correct, label) {
  G.landed.push({ s: correct.s, world: correct.world, solf: solfegeForIndex(correct.s), label });
  trimTrail();
  render();
}

function splashFrog() {
  const frog = G.root.querySelector('#arFrog');
  if (frog) { frog.classList.add('splash'); setTimeout(() => frog && frog.classList.remove('splash'), 650); }
}

function trimTrail() { if (G.landed.length > 8) G.landed.splice(0, G.landed.length - 8); }

function ramp() {
  if (G.score > 0 && G.combo % 4 === 0) G.speed = Math.min(G.level.maxSpeed, G.speed + G.level.rampStep);
}

function loseLife() {
  if (!G || G.over) return;
  G.lives -= 1;
  G.combo = 0;
  G.splashUntil = performance.now() + 850;
  updateHud();
  if (G.lives <= 0) { gameOver(); return; }
  setTimeout(() => {
    if (!G || G.over) return;
    G.frogWorld += padSpacing() * 2;               // fresh Do ahead, keep flowing
    G.worldX = G.frogWorld - laneWidth() * 0.42;
    G.landed.push({ s: 0, world: G.frogWorld, solf: 'Do' });
    startRound();
  }, 900);
}

function gameOver() {
  G.over = true;
  if (G.rafId) cancelAnimationFrame(G.rafId);
  const isBest = G.score > G.best;
  if (isBest) { G.best = G.score; saveBest(G.levelKey, G.score); }
  showOverlay(isBest);
}

/* ------------------------------------------------------------------- DOM ---- */

const SPRITE = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="ar-do" viewBox="0 0 20 18"><path d="M10 2 L2 16 L18 16 Z"/></symbol>
<symbol id="ar-re" viewBox="0 0 20 18"><path d="M2 13.5 A8 9.5 0 0 1 18 13.5 Z"/></symbol>
<symbol id="ar-mi" viewBox="0 0 20 18"><path d="M10 2 L17.5 10 L10 18 L2.5 10 Z"/></symbol>
<symbol id="ar-fa" viewBox="0 0 20 18"><path d="M5 16.5 L5 3 L17 16.5 Z"/></symbol>
<symbol id="ar-sol" viewBox="0 0 20 18"><ellipse cx="10" cy="10" rx="8" ry="5.2" transform="rotate(-20 10 10)"/></symbol>
<symbol id="ar-la" viewBox="0 0 20 18"><rect x="2.5" y="6" width="15" height="8" rx="0.6"/></symbol>
<symbol id="ar-ti" viewBox="0 0 20 18"><path d="M3.6 8 Q10 0.6 16.4 8 L10 17.6 Z"/></symbol>
</defs></svg>`;
const SHAPE_ID = { Do: 'ar-do', Re: 'ar-re', Mi: 'ar-mi', Fa: 'ar-fa', Sol: 'ar-sol', La: 'ar-la', Ti: 'ar-ti' };
const SHAPE_COLOR = { Do: '#8bd3ff', Re: '#a7f3d0', Mi: '#fde68a', Fa: '#fca5a5', Sol: '#c4b5fd', La: '#f9a8d4', Ti: '#fdba74' };

// The arcade is fully self-contained — inject its CSS once on first launch (kept out of the
// global stylesheet so the feature is a single module + its styles).
function injectArcadeStyles() {
  if (document.getElementById('arcade-styles')) return;
  const s = document.createElement('style');
  s.id = 'arcade-styles';
  s.textContent = ARCADE_CSS;
  document.head.appendChild(s);
}

const ARCADE_CSS = `
.arcade-root { position: fixed; inset: 0; z-index: 4000; display: flex; flex-direction: column;
  background: #0b0e18; color: #eef1fb; font-family: inherit; user-select: none; }
.ar-hud { display: flex; align-items: center; gap: 14px; padding: 10px 16px;
  background: rgba(23,26,43,.9); border-bottom: 1px solid #2a2f48; font-size: 13px; }
.ar-hud .ar-stat { color: #98a0bd; } .ar-hud .ar-stat b { color: #eef1fb; font-variant-numeric: tabular-nums; }
.ar-hud .ar-hearts { color: #f0655f; letter-spacing: 2px; font-size: 15px; }
.ar-hud .ar-spacer { margin-left: auto; }
.ar-exit { background: #1e2237; border: 1px solid #2a2f48; color: #98a0bd; border-radius: 8px; padding: 5px 12px; cursor: pointer; }
.ar-exit:hover { color: #eef1fb; }
.ar-field { position: relative; flex: 1; overflow: hidden;
  background: linear-gradient(180deg, #232a45 0%, #1c2138 73%, #164066 73%, #0e2c47 100%); }
/* Staff covers the whole field so the printed line tops (25–55%) share the note coordinate
   system (yForIndex uses the same fractions). */
.ar-staff { position: absolute; inset: 0; }
.ar-staff i { position: absolute; left: 0; right: 0; height: 1px; background: rgba(160,172,205,.5); }
.ar-water { position: absolute; left: 0; right: 0; bottom: 0; top: 73%; }
.ar-water::before { content: "~ ~ ~"; position: absolute; right: 14px; bottom: 8px; color: #5f87ad; font-size: 11px; font-family: ui-monospace, monospace; }
.ar-deadzone { position: absolute; left: 0; top: 0; bottom: 0; width: 66px; z-index: 3;
  background: linear-gradient(90deg, rgba(217,79,69,.5), rgba(217,79,69,0)); border-right: 2px dashed rgba(217,79,69,.7); }
.ar-deadzone span { position: absolute; left: 6px; top: 8px; font-size: 9px; color: #f0b4b4; font-family: ui-monospace, monospace; }
.ar-pads { position: absolute; inset: 0; z-index: 2; will-change: transform; }
/* Short ledger lines for notes on/beyond the outer lines — real-notation cue. */
.ar-ledger { position: absolute; width: 30px; height: 1px; transform: translate(-50%, -50%);
  background: rgba(160,172,205,.55); pointer-events: none; }
/* A note = just the floating shape-note glyph. Non-candidate (trail) notes don't take clicks. */
.ar-pad { position: absolute; transform: translate(-50%, -50%); line-height: 0;
  filter: drop-shadow(0 2px 3px rgba(0,0,0,.55)); transition: opacity .2s; }
.ar-pad svg { width: 30px; height: 27px; fill: currentColor; display: block; }
.ar-pad span { font-size: 13px; color: #dbe4ff; font-family: "Iowan Old Style", Georgia, serif; }
/* Landed trail: dimmed, behind, non-clickable. */
.ar-pad:not(.ar-cand) { opacity: .42; pointer-events: none; }
/* Candidate = a click hit-box exactly one staff step tall (height set inline). It centres the
   glyph, tiles edge-to-edge with its neighbours, scrolls with the note, and highlights on hover. */
.ar-cand { width: 66px; display: grid; place-items: center; overflow: visible; cursor: pointer;
  filter: drop-shadow(0 0 5px rgba(138,162,230,.5)); }
.ar-cand svg { transition: transform .1s ease; }
.ar-cand:hover { filter: drop-shadow(0 0 11px rgba(180,200,255,1)); }
.ar-cand:hover svg { transform: scale(1.28); }
/* Slurs tie the jump history together and scroll away. The labeled (correct-jump) tie glows. */
.ar-slurs { position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; z-index: 1; }
.ar-slur { fill: none; stroke: rgba(160,172,205,.4); stroke-width: 2; stroke-linecap: round; }
.ar-slur.labeled { stroke: rgba(127,224,166,.85); stroke-width: 2.5; }
.ar-slurlabel { position: absolute; transform: translate(-50%, -50%); white-space: nowrap; z-index: 3;
  pointer-events: none; font: 800 12px/1 inherit; color: #7fe0a6; background: rgba(11,14,24,.9);
  padding: 3px 8px; border-radius: 8px; border: 1px solid #2f6b48; }
.ar-clef { position: absolute; left: 80px; top: 40%; transform: translateY(-50%);
  font-size: 26vh; color: #9aa4c6; z-index: 1; line-height: 1; }
.ar-clef.is-bass { font-size: 19vh; top: 37%; }
.ar-frog { position: absolute; transform: translate(-50%, -50%); font-size: 28px; z-index: 4; pointer-events: none;
  transition: left .18s cubic-bezier(.3,1.3,.5,1), top .18s cubic-bezier(.3,1.3,.5,1); filter: drop-shadow(0 3px 5px rgba(0,0,0,.5)); }
.ar-frog.hop { animation: ar-hop .28s ease; }
.ar-frog.splash { animation: ar-splash .6s ease forwards; }
@keyframes ar-hop { 0%,100% { transform: translate(-50%,-50%) scale(1); } 40% { transform: translate(-50%,-90%) scale(1.1); } }
@keyframes ar-splash { to { top: 90%; transform: translate(-50%,-50%) rotate(30deg); opacity: .5; } }
.ar-prompt { position: absolute; left: 50%; top: 10px; transform: translateX(-50%); font-size: 13px; color: #c1c6dd; }
.ar-answers { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; padding: 14px; background: rgba(23,26,43,.9); border-top: 1px solid #2a2f48; }
.ar-ans { font: 700 16px/1.1 inherit; padding: 14px 20px; min-width: 88px; border-radius: 12px; border: 1px solid #3a4266; background: #2b3357; color: #eef1fb; cursor: pointer; }
.ar-ans:hover { border-color: #5566a0; background: #333d68; transform: translateY(-1px); }
.ar-ans small { display: block; margin-top: 3px; font-weight: 500; font-size: 10.5px; color: #98a0bd; }
.ar-ans.good { background: #153426; color: #7fe0a6; border-color: #245c40; }
.ar-ans.bad { background: #3a2226; color: #f0b4b4; border-color: #5b2f34; }
.ar-over { position: absolute; inset: 0; z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; background: rgba(9,11,20,.85); backdrop-filter: blur(2px); }
.ar-over[hidden] { display: none; }  /* the [hidden] attr alone loses to the display rule above */
.ar-over .ar-splash { font-family: "Iowan Old Style", Georgia, serif; font-size: 34px; }
.ar-over .ar-newbest { color: #e6b968; font-weight: 700; }
.ar-over .ar-final { font-family: ui-monospace, monospace; color: #e6b968; font-size: 16px; }
.ar-overbtns { display: flex; gap: 10px; margin-top: 8px; }
.ar-again { background: #e6b968; color: #241a06; font-weight: 800; border: none; border-radius: 10px; padding: 11px 20px; cursor: pointer; }
.ar-back { background: #1e2237; color: #98a0bd; border: 1px solid #2a2f48; border-radius: 10px; padding: 11px 16px; cursor: pointer; }
.arcade-launch { background: linear-gradient(90deg,#e6b968,#f0c987); color: #241a06; font-weight: 800; border: none;
  border-radius: 10px; padding: 9px 14px; cursor: pointer; font-size: 13px; }
.arcade-launch:hover { filter: brightness(1.06); }
`;

function buildDom() {
  injectArcadeStyles();
  const root = document.createElement('div');
  root.className = 'arcade-root';
  root.innerHTML = `${SPRITE}
    <div class="ar-hud">
      <span class="ar-stat">Score <b id="arScore">0</b></span>
      <span class="ar-stat">Best <b id="arBest">${G.best}</b></span>
      <span class="ar-stat">Combo <b id="arCombo">×0</b></span>
      <span class="ar-hearts" id="arHearts"></span>
      <span class="ar-spacer"></span>
      <span class="ar-stat">${G.level.label}</span>
      <button class="ar-exit" id="arExit">Exit</button>
    </div>
    <div class="ar-field" id="arField">
      <div class="ar-staff" id="arStaff">
        <i style="top:25%"></i><i style="top:32.5%"></i><i style="top:40%"></i><i style="top:47.5%"></i><i style="top:55%"></i>
      </div>
      <div class="ar-clef ${G.clef === 'bass' ? 'is-bass' : ''}">${G.clef === 'bass' ? '𝄢' : '𝄞'}</div>
      <div class="ar-deadzone"><span>◄ edge</span></div>
      <div class="ar-water"></div>
      <div class="ar-pads" id="arPads"></div>
      <div class="ar-frog" id="arFrog">🐸</div>
      <div class="ar-prompt" id="arPrompt"></div>
    </div>
    <div class="ar-answers" id="arAnswers"></div>
    <div class="ar-over" id="arOver" hidden></div>`;
  document.body.appendChild(root);
  G.root = root;
  root.querySelector('#arExit').addEventListener('click', stopIntervalRun);
  updateHud();
}

function laneWidth() { return G.root.querySelector('#arField').clientWidth || 900; }
function deadzoneX() { return 64; }

// Drift scaled to the lane width so time-to-edge is about the same on a narrow phone as on a wide
// desktop. speed is calibrated for a ~1000px lane; a fixed px/sec would leave a phone no runway.
function driftPxPerSec() { return G.speed * Math.min(1.35, laneWidth() / 1000); }

// Draw the trail: slurs tying the jump history (behind), the note glyphs, this round's candidate
// options, then the correct-jump labels (front). Each candidate carries its own click hit-box that
// tiles exactly to the staff spacing and scrolls with the note — so the target IS the rendered note.
function render() {
  const padsEl = G.root.querySelector('#arPads');
  if (!padsEl) return;
  padsEl.innerHTML = '';
  drawSlurs(padsEl);
  for (const t of G.landed) addNote(padsEl, t.world, t.s, false, 0);
  const band = fieldH() * STAFF_GAP / 2;      // one staff step — hit-boxes tile without overlap/gap
  for (const c of G.candidates) {
    c.el = addNote(padsEl, c.world, c.s, true, band);
    c.el.addEventListener('click', () => answer(c.nth));
  }
  drawSlurLabels(padsEl);
  applyScroll();
}

const SVGNS = 'http://www.w3.org/2000/svg';

// A slur arcs on the side away from the noteheads: above when the line rises, below when it falls.
function slurApexY(ay, by) { return by <= ay ? Math.min(ay, by) - 22 : Math.max(ay, by) + 22; }

// One SVG holding a curved tie between every consecutive pair of landed notes — the labeled
// (correct-jump) ties glow; the plain bounce-backs are faint. It all scrolls with #arPads.
function drawSlurs(padsEl) {
  if (G.landed.length < 2) return;
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', 'ar-slurs');
  svg.setAttribute('width', G.landed[G.landed.length - 1].world + 60);
  svg.setAttribute('height', fieldH());
  for (let i = 1; i < G.landed.length; i++) {
    const a = G.landed[i - 1], b = G.landed[i];
    const ay = yForIndex(a.s), by = yForIndex(b.s), cy = slurApexY(ay, by);
    const path = document.createElementNS(SVGNS, 'path');
    path.setAttribute('d', `M ${a.world} ${ay} Q ${(a.world + b.world) / 2} ${cy} ${b.world} ${by}`);
    path.setAttribute('class', 'ar-slur' + (b.label ? ' labeled' : ''));
    svg.appendChild(path);
  }
  padsEl.appendChild(svg);
}

function drawSlurLabels(padsEl) {
  for (let i = 1; i < G.landed.length; i++) {
    const a = G.landed[i - 1], b = G.landed[i];
    if (!b.label) continue;
    const ay = yForIndex(a.s), by = yForIndex(b.s);
    const lab = document.createElement('div');
    lab.className = 'ar-slurlabel';
    lab.style.left = `${(a.world + b.world) / 2}px`;
    lab.style.top = `${slurApexY(ay, by)}px`;
    lab.textContent = b.label;
    padsEl.appendChild(lab);
  }
}

// One diatonic note on the staff: ledger lines (if off-staff) + a floating shape-note glyph.
function addNote(padsEl, world, s, isCandidate, band) {
  for (const e of ledgersFor(s)) {
    const led = document.createElement('div');
    led.className = 'ar-ledger';
    led.style.left = `${world}px`;
    led.style.top = `${yForIndex(e)}px`;
    padsEl.appendChild(led);
  }
  const el = makePad(world, yForIndex(s), solfegeForIndex(s), isCandidate, band);
  padsEl.appendChild(el);
  return el;
}

// The shape-note glyph. A candidate is wrapped in a hit-box exactly one staff step tall (so
// neighbours tile edge-to-edge, never overlapping) and centred on the note — the clickable
// region tracks the rendered note precisely. The landed trail is dimmed behind and non-clickable.
function makePad(world, y, solf, isCandidate, band) {
  const el = document.createElement('div');
  el.className = 'ar-pad' + (isCandidate ? ' ar-cand' : '');
  el.style.left = `${world}px`;
  el.style.top = `${y}px`;
  if (isCandidate) el.style.height = `${Math.round(band)}px`;
  el.innerHTML = SHAPE_ID[solf]
    ? `<svg viewBox="0 0 20 18" style="color:${SHAPE_COLOR[solf]}"><use href="#${SHAPE_ID[solf]}"/></svg>`
    : `<span>${solf}</span>`;
  return el;
}

function applyScroll() {
  if (!G) return;
  const padsEl = G.root.querySelector('#arPads');
  if (padsEl) padsEl.style.transform = `translate3d(${Math.round(-G.worldX)}px,0,0)`;
  const frog = G.root.querySelector('#arFrog');
  if (frog) {
    frog.style.left = `${Math.round(frogScreenX())}px`;
    frog.style.top = `${Math.round(yForIndex(G.currentS) - 15)}px`;   // stand on the note glyph
  }
}

function renderAnswers() {
  const row = G.root.querySelector('#arAnswers');
  row.innerHTML = '';
  G.candidates.forEach(c => {
    const b = document.createElement('button');
    b.className = 'ar-ans';
    b.textContent = NTH_LABEL[c.nth];    // interval size only — no giveaway
    b.addEventListener('click', () => answer(c.nth));
    row.appendChild(b);
  });
}

function setPrompt(t) { const el = G?.root.querySelector('#arPrompt'); if (el) el.textContent = t; }

function updateHud() {
  if (!G) return;
  G.root.querySelector('#arScore').textContent = String(G.score);
  G.root.querySelector('#arBest').textContent = String(G.best);
  G.root.querySelector('#arCombo').textContent = `×${G.combo}`;
  const hearts = G.root.querySelector('#arHearts');
  hearts.textContent = '♥'.repeat(Math.max(0, G.lives)) + '♡'.repeat(Math.max(0, 3 - G.lives));
}

function flashFrogHop() {
  const frog = G.root.querySelector('#arFrog');
  if (!frog) return;
  frog.classList.remove('hop'); void frog.offsetWidth; frog.classList.add('hop');
}

function showOverlay(isBest) {
  const el = G.root.querySelector('#arOver');
  el.hidden = false;
  el.innerHTML = `
    <div class="ar-splash">Splash!</div>
    ${isBest ? '<div class="ar-newbest">New best! 🎉</div>' : ''}
    <div class="ar-final">Score ${G.score} · Best ${G.best}</div>
    <div class="ar-overbtns">
      <button class="ar-again" id="arAgain">↺ Again</button>
      <button class="ar-back" id="arBack">Exit to drill</button>
    </div>`;
  el.querySelector('#arAgain').addEventListener('click', () => { const lv = G.levelKey; stopIntervalRun(); startIntervalRun(lv); });
  el.querySelector('#arBack').addEventListener('click', stopIntervalRun);
}

/* -------------------------------------------------------------- hi-score --- */

function loadBest(level) {
  try {
    const all = JSON.parse(localStorage.getItem(HISCORE_KEY) || '{}');
    return (all.interval && all.interval[level]) || 0;
  } catch (e) { return 0; }
}
function saveBest(level, score) {
  try {
    const all = JSON.parse(localStorage.getItem(HISCORE_KEY) || '{}');
    all.interval = all.interval || {};
    all.interval[level] = score;
    localStorage.setItem(HISCORE_KEY, JSON.stringify(all));
  } catch (e) { /* ignore */ }
}
