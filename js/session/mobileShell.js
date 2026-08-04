/**
 * Mobile App Shell: a bottom nav that collapses the eight tabs into five rooms, plus a
 * sub-nav inside the multi-activity rooms (Ear, Learn). Additive + mobile-only — the desktop
 * tab strip is untouched (the desktop Studio layout comes later). We drive highlight state off
 * body[data-active-tab] so it stays in sync no matter who switches the tab (nav, session, code).
 */

import { switchToTab } from '../ui/components/tabs.js';

const ROOMS = [
  { id: 'home',  icon: '⌂', label: 'Home',  tabs: ['home'] },
  { id: 'warm',  icon: '♪', label: 'Warm',  tabs: ['warmup'] },
  { id: 'ear',   icon: '◎', label: 'Ear',   tabs: ['intervals', 'cluster', 'chord-quality'],
    subLabels: { intervals: 'Intervals', cluster: 'Pitch Distinction', 'chord-quality': 'Chord Quality' } },
  { id: 'sing',  icon: '✦', label: 'Sing',  tabs: ['satb'] },
  { id: 'learn', icon: '◈', label: 'Learn', tabs: ['flashcards', 'theory'],
    subLabels: { flashcards: 'Flashcards', theory: 'Lessons' } }
];

const tabToRoom = {};
ROOMS.forEach(r => r.tabs.forEach(t => { tabToRoom[t] = r.id; }));
const lastTabInRoom = {}; // remember the sub-tab a room was last left on

export function initMobileShell() {
  buildNav();
  buildRail();
  ensureSubnav();
  new MutationObserver(syncActive).observe(document.body, { attributes: true, attributeFilter: ['data-active-tab'] });
  syncActive();
}

// Desktop counterpart of the bottom nav: a slim left icon rail (rooms + a settings gear).
function buildRail() {
  let rail = document.getElementById('desktopRail');
  if (!rail) {
    rail = document.createElement('nav');
    rail.id = 'desktopRail';
    rail.className = 'desktop-rail';
    rail.setAttribute('aria-label', 'Rooms');
    document.body.appendChild(rail);
  }
  rail.innerHTML = ROOMS.map(r =>
    `<button class="dr-it" data-room="${r.id}" title="${r.label}"><span class="d" aria-hidden="true">${r.icon}</span>${r.label}</button>`).join('')
    + `<button class="dr-it dr-gear" data-gear title="Settings"><span class="d" aria-hidden="true">⚙</span></button>`;
  rail.querySelectorAll('[data-room]').forEach(btn => btn.addEventListener('click', () => openRoom(btn.dataset.room)));
  rail.querySelector('[data-gear]')?.addEventListener('click', () => document.getElementById('btnSettings')?.click());
}

const currentTab = () => document.body.getAttribute('data-active-tab') || 'home';

function buildNav() {
  let nav = document.getElementById('mobileNav');
  if (!nav) {
    nav = document.createElement('nav');
    nav.id = 'mobileNav';
    nav.className = 'mobile-nav';
    nav.setAttribute('aria-label', 'Main navigation');
    document.body.appendChild(nav);
  }
  nav.innerHTML = ROOMS.map(r =>
    `<button class="mn-it" data-room="${r.id}"><span class="d" aria-hidden="true">${r.icon}</span>${r.label}</button>`).join('');
  nav.querySelectorAll('[data-room]').forEach(btn =>
    btn.addEventListener('click', () => openRoom(btn.dataset.room)));
}

function ensureSubnav() {
  let sub = document.getElementById('roomSubnav');
  if (!sub) {
    sub = document.createElement('div');
    sub.id = 'roomSubnav';
    sub.className = 'room-subnav';
    sub.hidden = true;
    const tabs = document.querySelector('.tabs');
    if (tabs && tabs.parentNode) tabs.parentNode.insertBefore(sub, tabs.nextSibling);
    else document.querySelector('main')?.prepend(sub);
  }
  return sub;
}

function openRoom(roomId) {
  const room = ROOMS.find(r => r.id === roomId);
  if (!room) return;
  switchToTab(lastTabInRoom[roomId] || room.tabs[0]);
}

function syncActive() {
  const tab = currentTab();
  const roomId = tabToRoom[tab] || 'home';
  lastTabInRoom[roomId] = tab;
  document.querySelectorAll('#mobileNav [data-room], #desktopRail [data-room]')
    .forEach(b => b.classList.toggle('on', b.dataset.room === roomId));
  renderSubnav(roomId, tab);
}

function renderSubnav(roomId, tab) {
  const sub = ensureSubnav();
  const room = ROOMS.find(r => r.id === roomId);
  if (!room || room.tabs.length < 2) { sub.hidden = true; sub.innerHTML = ''; return; }
  sub.hidden = false;
  sub.innerHTML = room.tabs.map(t =>
    `<button class="rs-it${t === tab ? ' on' : ''}" data-tab="${t}">${room.subLabels[t] || t}</button>`).join('');
  sub.querySelectorAll('[data-tab]').forEach(b =>
    b.addEventListener('click', () => switchToTab(b.dataset.tab)));
}
