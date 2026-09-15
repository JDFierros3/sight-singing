/**
 * Per-screen "How to" modals. Each exercise/screen gets a short explainer — what it is, how to
 * use it, its options, and what it develops. The modal auto-pops the FIRST time a screen is
 * visited (tracked in localStorage) and is always reopenable via the header "?" button.
 */

import { getElementById } from '../../utils/dom.js';

const SEEN_KEY = 'solfege.v1.howtoSeen';

// Keyed by tab id. Order mirrors the natural learning path:
// flashcards → lessons → warm up → intervals → pitch distinction → hymn sing → chord quality → chord id.
const HOWTO = {
  flashcards: {
    title: 'Flashcards',
    blurb: 'Drill the seven shape-notes until each shape and its syllable are instant.',
    use: [
      'A shape (or a syllable) appears on the card.',
      'Say the answer out loud, then tap <b>Flip</b> to check.',
      'Tap <b>Next</b> for another card.'
    ],
    options: [
      'Card direction — shape→syllable or syllable→shape.',
      'Include accidentals to add the sharps and flats.'
    ],
    builds: 'Instant recognition of the shapes — the alphabet every other exercise is built on.'
  },
  theory: {
    title: 'Lessons',
    blurb: 'Short, ordered lessons that teach the ideas behind every exercise.',
    use: [
      'Open a lesson and work through its sub-lessons in order.',
      'Follow the “Try it” links to jump straight to the matching exercise.'
    ],
    options: [
      'Lessons remember where you left off.',
      'On a wide screen they open in a side panel next to the staff.'
    ],
    builds: 'The “why” behind the shapes, intervals, chords and part-singing.'
  },
  warmup: {
    title: 'Warm Up',
    blurb: 'Sing scales, intervals and arpeggios full-screen with a live pitch line.',
    use: [
      'Pick the patterns you want to sing, then press play.',
      'Sing along as the staff scrolls — your voice shows as a line that turns <b>green</b> when you’re in tune.'
    ],
    options: [
      'Patterns (scale / intervals / arpeggios), direction, tempo and clef live under Advanced.'
    ],
    builds: 'Your daily vocal foundation and pitch accuracy — the single most important habit.'
  },
  intervals: {
    title: 'Interval Training',
    blurb: 'Hear two notes one after another and name the distance between them.',
    use: [
      'Press play to hear the interval.',
      'Tap the interval you heard — the answer reveals as you choose.'
    ],
    options: [
      'Difficulty adds more sizes and up/down (or from any note) as you climb.',
      'Or launch the arcade game for a fast, timed version.'
    ],
    builds: 'Hearing intervals — the core skill for singing and reading by ear.'
  },
  cluster: {
    title: 'Pitch Distinction',
    blurb: 'Two notes sound at the same time — pick out the interval between them.',
    use: [
      'Press play to hear both notes together.',
      'Tap the interval you hear.'
    ],
    options: [
      'Difficulty ranges from within one octave to the full range, diatonic or chromatic.',
      'Play length sets how long the notes ring.'
    ],
    builds: 'Hearing simultaneous pitches — the ear you need for harmony.'
  },
  satb: {
    title: 'Sing in Parts',
    blurb: 'Sing a real hymn full-screen on your own part, with the other voices around you.',
    use: [
      'Browse the hymn library and pick a hymn.',
      'Choose your part, press play, and sing along — your pitch line turns <b>green</b> when you’re on your note.'
    ],
    options: [
      'My part volume — amplify your line while learning, or make it quiet to test yourself.',
      'A reference tone sounds first so you know where to start.'
    ],
    builds: 'Holding your part in four-part harmony — the point of the whole thing.'
  },
  'chord-quality': {
    title: 'Chord Quality',
    blurb: 'Hear a chord and name what kind it is.',
    use: [
      'Press play to hear a chord.',
      'Tap its quality — major, minor, and so on. The answer reveals as you tap.'
    ],
    options: [
      'Difficulty grows from major-vs-minor up to every quality, including sevenths.',
      'Explore mode lets you build and hold any chord as a drone to sing against.'
    ],
    builds: 'Recognising chord colours by ear.'
  },
  'chord-id': {
    title: 'Chord ID',
    blurb: 'See a four-part chord like you’d find in a hymn and name its function.',
    use: [
      'A chord appears on the staff in shape-notes.',
      'Tap its function — the shape recipe (Do-Mi-Sol = I, Sol-Ti-Re = V, …).'
    ],
    options: [
      'Difficulty goes from the primary triads up to all seven triads plus sevenths (V7, ii7, vii°7).'
    ],
    builds: 'Reading chords by shape and knowing each one’s role in the key.'
  }
};

function seenSet() {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch (e) { return new Set(); }
}
function markSeen(tab) {
  try { const s = seenSet(); s.add(tab); localStorage.setItem(SEEN_KEY, JSON.stringify([...s])); } catch (e) { /* ignore */ }
}
function currentTab() { return document.body.getAttribute('data-active-tab'); }

export function initHowto() {
  // "?" button in the header, next to the settings gear — always reopens the current screen's guide.
  const host = document.querySelector('.rowCompact') || document.querySelector('.appHeaderControls');
  if (host && !getElementById('btnHowto')) {
    const btn = document.createElement('button');
    btn.id = 'btnHowto';
    btn.className = 'ghost';
    btn.textContent = '?';
    btn.title = 'How to use this screen';
    btn.setAttribute('aria-label', 'How to use this screen');
    host.insertBefore(btn, getElementById('btnSettings') || null);
    btn.addEventListener('click', () => showHowto(currentTab()));
  }

  // Auto-pop the first time each screen is shown; keep the "?" button relevant to the active tab.
  const sync = () => {
    const tab = currentTab();
    const btn = getElementById('btnHowto');
    if (btn) btn.hidden = !HOWTO[tab];
    maybeShowHowto(tab);
  };
  new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['data-active-tab'] });
  sync();
}

export function maybeShowHowto(tab) {
  if (!tab || !HOWTO[tab] || seenSet().has(tab)) return;
  showHowto(tab);
  markSeen(tab);
}

export function showHowto(tab) {
  const info = HOWTO[tab];
  if (!info) return;
  let el = getElementById('howtoModal');
  if (!el) { el = document.createElement('div'); el.id = 'howtoModal'; el.className = 'howto-modal'; document.body.appendChild(el); }
  const list = arr => (arr && arr.length) ? `<ul>${arr.map(x => `<li>${x}</li>`).join('')}</ul>` : '';
  el.innerHTML = `
    <div class="howto-card" role="dialog" aria-label="${info.title} — how to">
      <h3>${info.title}</h3>
      <p class="howto-blurb">${info.blurb}</p>
      <h4>How to use</h4>${list(info.use)}
      ${info.options ? `<h4>Options</h4>${list(info.options)}` : ''}
      <p class="howto-builds"><b>Builds:</b> ${info.builds}</p>
      <div class="howto-btns"><button class="howto-go" data-h="ok">Got it</button></div>
    </div>`;
  el.hidden = false;
  el.querySelector('[data-h="ok"]').onclick = () => { el.hidden = true; };
  el.onclick = (e) => { if (e.target === el) el.hidden = true; };   // click the backdrop to dismiss
}
