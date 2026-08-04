/**
 * Settings sheet — the home for all the tuning controls that used to crowd the header.
 * We physically MOVE the existing .controlRibbon into a sheet (so every control keeps its id
 * and bound handler) and add a gear button that opens it. Mobile: a bottom sheet. Desktop: a
 * right-hand panel. This is the header-decluttering half of "Phase 1".
 */

import { getElementById } from '../utils/dom.js';

export function initSettingsSheet() {
  const ribbon = document.querySelector('.controlRibbon');
  if (!ribbon || document.getElementById('settingsSheet')) return;

  const sheet = document.createElement('div');
  sheet.id = 'settingsSheet';
  sheet.className = 'settings-sheet';
  sheet.hidden = true;
  sheet.innerHTML = `
    <div class="ss-backdrop" data-close></div>
    <div class="ss-card" role="dialog" aria-modal="true" aria-label="Settings">
      <div class="ss-head">
        <span class="ss-title">Settings</span>
        <button class="ss-close" data-close aria-label="Close settings">✕</button>
      </div>
      <div class="ss-body">
        <div class="ss-tier"><h4>Basic</h4><div class="ss-basic"></div></div>
        <details class="ss-adv"><summary>Advanced</summary><div class="ss-advbody"></div></details>
      </div>
    </div>`;
  document.body.appendChild(sheet);

  // Relocate the live controls into the sheet (node moves preserve ids + event bindings) and
  // sort each control group into Basic (everyday) or Advanced (rarely touched) by which control
  // it contains. Relabel a couple to plain language along the way.
  relabel(ribbon, 'doNote', 'Starting note (Do)');
  relabel(ribbon, 'a4', 'Concert pitch (A4)');
  relabel(ribbon, 'zoom', 'Staff zoom');

  const BASIC_IDS = ['doNote', 'instrument'];
  const basic = sheet.querySelector('.ss-basic');
  const advanced = sheet.querySelector('.ss-advbody');
  ribbon.querySelectorAll('.controlGroup').forEach(group => {
    const isBasic = BASIC_IDS.some(id => group.querySelector('#' + id));
    (isBasic ? basic : advanced).appendChild(group);
  });
  ribbon.remove(); // now empty

  // Gear button in the compact header row.
  const gear = document.createElement('button');
  gear.id = 'btnSettings';
  gear.className = 'ghost';
  gear.setAttribute('aria-label', 'Settings');
  gear.setAttribute('title', 'Settings');
  gear.textContent = '⚙';
  (document.querySelector('.rowCompact') || document.querySelector('.appHeaderControls'))?.appendChild(gear);
  gear.addEventListener('click', openSheet);

  sheet.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeSheet));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

  // The old "Hide controls" toggle + its floating FAB are redundant now that the controls
  // live in a sheet — hide them so we don't ship two mental models.
  const toggleRibbon = getElementById('toggleRibbon');
  if (toggleRibbon) toggleRibbon.style.display = 'none';
  const fab = getElementById('showHeaderFab');
  if (fab) fab.style.display = 'none';
  document.body.classList.remove('mobile-header-hidden', 'controls-collapsed');
}

// Rename a control's <label> (the one bound to the given input id) to plain language.
function relabel(root, inputId, text) {
  const label = root.querySelector(`label[for="${inputId}"]`);
  if (label) label.textContent = text;
}

function openSheet() {
  const sheet = document.getElementById('settingsSheet');
  if (!sheet) return;
  sheet.hidden = false;
  document.body.classList.add('settings-open');
}

function closeSheet() {
  const sheet = document.getElementById('settingsSheet');
  if (!sheet) return;
  sheet.hidden = true;
  document.body.classList.remove('settings-open');
}
