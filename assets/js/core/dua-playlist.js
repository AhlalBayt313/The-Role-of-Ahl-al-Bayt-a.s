// ============================================================================
// MY DUA LISTS  (v206)  —  page `playlists`
// ----------------------------------------------------------------------------
// The person builds their own ordered lists of existing Duas / Ziyarats / Amals
// (for example "Thursday night") and reads them one after another:
//   * page `playlists`: lists, create / rename / delete, add items from a searchable
//     picker, reorder (▲ ▼), remove, "start" / "continue" (remembers the position);
//   * reader pages (readDua / readZiyarat / readAmal): a "🗂️ আমার তালিকা" button next
//     to the bookmark buttons opens a sheet to add the open item to a list;
//   * while a list is being read a small bar shows "list · 2/5 · ← →".
// NOTHING here writes religious text: only titles/ids of items that already exist
// in the app are stored. Titles are re-read from the app at run time.
// Saved on the device only: localStorage `ahlbayt_dua_playlists`
//   { v:1, lists:[ { id, name, ts, pos, items:[ { t:'dua'|'ziyarat'|'amal', id, tb, te } ] } ] }
// (included in the "personal" backup group; merged by list id on restore).
// Opens items through the app's own data-action buttons (readDua / readZiyarat /
// readAmal), so every existing loading step still runs. Wraps render() (guarded).
// Needs: state, render, escapeHtml, toBengaliDigits, duas/ziyarats/amals (all guarded).
// ============================================================================
(function () {
'use strict';

const KEY = 'ahlbayt_dua_playlists';
const MAX_LISTS = 30, MAX_ITEMS = 100, MAX_NAME = 40;
const TYPES = {
    dua:     { ic: '🤲', bn: 'দোয়া',   en: 'Dua' },
    ziyarat: { ic: '☪️', bn: 'যিয়ারত', en: 'Ziyarat' },
    amal:    { ic: '📿', bn: 'আমল',    en: 'Amal' }
};
const READERS = ['readDua', 'readZiyarat', 'readAmal'];

const EN = () => (typeof state !== 'undefined' && state.language === 'en');
const T = (b, e) => EN() ? e : b;
const N = n => EN() ? String(n) : (typeof toBengaliDigits === 'function' ? toBengaliDigits(n) : String(n));
const E = s => (typeof escapeHtml === 'function') ? escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clip = (s, n) => String(s == null ? '' : s).replace(/[<>]/g, '').slice(0, n || 120);
const uid = () => 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const toast = (m, t) => { if (typeof showToast === 'function') showToast(m, t || 'success'); };

// ---- storage ---------------------------------------------------------------
function norm(r) {
    const out = { v: 1, lists: [] };
    if (!r || typeof r !== 'object' || !Array.isArray(r.lists)) return out;
    r.lists.slice(0, MAX_LISTS).forEach(l => {
        if (!l || typeof l !== 'object') return;
        const items = [];
        (Array.isArray(l.items) ? l.items : []).slice(0, MAX_ITEMS).forEach(it => {
            if (it && TYPES[it.t] && (typeof it.id === 'string' || typeof it.id === 'number') && String(it.id)) {
                items.push({ t: it.t, id: String(it.id).slice(0, 120), tb: clip(it.tb), te: clip(it.te) });
            }
        });
        out.lists.push({
            id: clip(l.id || uid(), 24) || uid(),
            name: clip(l.name, MAX_NAME) || 'তালিকা',
            ts: Number(l.ts) || 0,
            pos: Math.max(0, Math.min(Math.max(items.length - 1, 0), parseInt(l.pos, 10) || 0)),
            items
        });
    });
    return out;
}
let DB = (function () { try { return norm(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { return { v: 1, lists: [] }; } })();
function save() { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { toast(T('সংরক্ষণ করা যায়নি (স্টোরেজ ভরা?)', 'Could not save (storage full?)'), 'warning'); } }
const getList = id => DB.lists.find(l => l.id === id);

// ---- resolving items against the app's own data ----------------------------
function pool(t) {
    if (t === 'dua') return [].concat((typeof duas !== 'undefined' && Array.isArray(duas)) ? duas : [], (typeof state !== 'undefined' && state.customDuas) || []);
    if (t === 'ziyarat') return [].concat((typeof ziyarats !== 'undefined' && Array.isArray(ziyarats)) ? ziyarats : [], (typeof state !== 'undefined' && state.customZiyarat) || []);
    return [].concat((typeof amals !== 'undefined' && Array.isArray(amals)) ? amals : [], (typeof state !== 'undefined' && state.customAmal) || []);
}
function findObj(t, id) { return pool(t).find(x => x && x.id != null && String(x.id) === String(id)) || null; }
function titleOf(it, obj) {
    if (obj) return (EN() ? (obj.titleEn || obj.titleBn) : (obj.titleBn || obj.titleEn)) || '';
    return (EN() ? (it.te || it.tb) : (it.tb || it.te)) || '';
}
function curItem() {
    if (typeof state === 'undefined') return null;
    const p = state.currentPage;
    const o = p === 'readDua' ? state.currentDua : p === 'readZiyarat' ? state.currentZiyarat : p === 'readAmal' ? state.currentAmal : null;
    if (!o || o.id == null || String(o.id) === '') return null;
    return { t: p === 'readDua' ? 'dua' : p === 'readZiyarat' ? 'ziyarat' : 'amal', id: String(o.id), obj: o };
}

// ---- list operations --------------------------------------------------------
function createList(name) {
    name = clip(name, MAX_NAME).trim();
    if (!name) { toast(T('তালিকার একটি নাম দিন', 'Give the list a name'), 'warning'); return null; }
    if (DB.lists.length >= MAX_LISTS) { toast(T('সর্বোচ্চ ৩০টি তালিকা', 'Maximum 30 lists'), 'warning'); return null; }
    const l = { id: uid(), name, ts: Date.now(), pos: 0, items: [] };
    DB.lists.unshift(l); save(); return l;
}
function hasItem(l, t, id) { return l.items.some(x => x.t === t && x.id === String(id)); }
function addItem(l, t, id, obj) {
    if (hasItem(l, t, id)) return false;
    if (l.items.length >= MAX_ITEMS) { toast(T('একটি তালিকায় সর্বোচ্চ ১০০টি', 'Maximum 100 items per list'), 'warning'); return false; }
    const o = obj || findObj(t, id);
    l.items.push({ t, id: String(id), tb: clip(o && o.titleBn), te: clip(o && o.titleEn) });
    l.ts = Date.now(); save(); return true;
}
function removeItem(l, t, id) {
    const i = l.items.findIndex(x => x.t === t && x.id === String(id));
    if (i < 0) return false;
    l.items.splice(i, 1); l.pos = Math.max(0, Math.min(l.pos, l.items.length - 1)); save(); return true;
}

// ---- opening an item through the app's own buttons -------------------------
let SESS = null;      // { lid, pos } while a list is being read
const ui = { view: 'home', lid: null, creating: false, renaming: false, picker: false, kind: 'all', q: '' };

function clickAction(action, param) {
    const b = document.createElement('button');
    b.setAttribute('data-action', action); b.setAttribute('data-param', param);
    b.style.display = 'none';
    document.body.appendChild(b); b.click(); b.remove();
}
function openItem(it, obj) {
    state.currentPage = 'playlists';          // so the reader's "back" returns to the lists
    if (it.t === 'dua') {
        const idx = (typeof duas !== 'undefined' && Array.isArray(duas)) ? duas.indexOf(obj) : -1;
        clickAction('readDua', idx > -1 ? String(idx) : 'c' + it.id);
    } else if (it.t === 'ziyarat') clickAction('readZiyarat', it.id);
    else clickAction('readAmal', it.id);
}
function play(lid, pos) {
    const l = getList(lid); if (!l || !l.items.length) return;
    pos = Math.max(0, Math.min(l.items.length - 1, pos));
    const it = l.items[pos], obj = findObj(it.t, it.id);
    if (!obj) {
        toast(T('এই আইটেমটি আর পাওয়া যাচ্ছে না — তালিকা থেকে বাদ দিন', 'This item no longer exists — remove it from the list'), 'warning');
        return;
    }
    SESS = { lid, pos }; l.pos = pos; save();
    ui.view = 'list'; ui.lid = lid;
    openItem(it, obj);
}
function endSession(goBack) {
    SESS = null;
    const bar = document.getElementById('pl-bar'); if (bar) bar.remove();
    if (goBack) { ui.view = 'list'; clickAction('changePage', 'playlists'); }
}

// ---- page: playlists --------------------------------------------------------
function typeBadge(t) { const x = TYPES[t]; return `<span class="pl-badge">${x.ic} ${T(x.bn, x.en)}</span>`; }

function renderListCard(l) {
    const first = l.items.slice(0, 2).map(it => E(titleOf(it, findObj(it.t, it.id)))).filter(Boolean).join(' · ');
    return `
    <button type="button" class="pl-card" data-pl="open" data-lid="${E(l.id)}">
        <span class="pl-card-ic" aria-hidden="true">🗂️</span>
        <span class="pl-card-body">
            <b>${E(l.name)}</b>
            <small>${N(l.items.length)} ${T('টি আইটেম', 'items')}${first ? ' — ' + first + (l.items.length > 2 ? '…' : '') : ''}</small>
        </span>
        <span class="pl-chev" aria-hidden="true">›</span>
    </button>`;
}

function renderHome() {
    const d = state.darkMode;
    return `
    <div class="pl-page page-enter ${d ? 'pl-dark' : ''}">
        <div class="pl-head">
            <h1><span class="ac-em" aria-hidden="true">🗂️</span> ${T('আমার দোয়া-তালিকা', 'My Dua Lists')}</h1>
            <p>${T('নিজের পছন্দের দোয়া, যিয়ারত ও আমল ক্রমানুসারে সাজিয়ে একটানা পড়ুন — যেমন "বৃহস্পতিবার রাত"।', 'Arrange the duas, ziyarats and amals you choose in your own order and read them one after another — e.g. "Thursday night".')}</p>
        </div>
        ${ui.creating ? `
        <div class="pl-create">
            <label for="pl-newname" class="pl-sr">${T('তালিকার নাম', 'List name')}</label>
            <input id="pl-newname" class="pl-input" type="text" maxlength="${MAX_NAME}" placeholder="${T('তালিকার নাম', 'List name')}" autocomplete="off">
            <button type="button" class="pl-btn pl-primary" data-pl="create">${T('তৈরি করুন', 'Create')}</button>
            <button type="button" class="pl-btn" data-pl="newcancel">${T('বাতিল', 'Cancel')}</button>
        </div>` : `
        <button type="button" class="pl-btn pl-primary pl-new" data-pl="new">＋ ${T('নতুন তালিকা', 'New list')}</button>`}
        ${DB.lists.length ? `<div class="pl-grid">${DB.lists.map(renderListCard).join('')}</div>` : `
        <div class="pl-empty">
            <div aria-hidden="true">🗂️</div>
            <p>${T('এখনো কোনো তালিকা নেই। "নতুন তালিকা" চেপে শুরু করুন, তারপর যেকোনো দোয়া/যিয়ারত/আমল পড়ার পাতা থেকেও "🗂️ আমার তালিকা" দিয়ে যোগ করতে পারবেন।', 'No lists yet. Tap "New list" to start; you can also add any dua, ziyarat or amal from its reading page with "🗂️ My list".')}</p>
        </div>`}
        <p class="pl-note">${T('তালিকা শুধু এই ডিভাইসে থাকে। ফোন বদলালে', 'Lists are stored only on this device. To move to a new phone use')}
            <button type="button" class="pl-link" data-action="changePage" data-param="backup">${T('ডেটা ব্যাকআপ', 'Backup & Restore')}</button>
            ${T('ব্যবহার করুন।', '.')}</p>
    </div>`;
}

function pickerIndex() {
    const out = [];
    ['dua', 'ziyarat', 'amal'].forEach(t => pool(t).forEach(o => {
        if (o && o.id != null && (o.titleBn || o.titleEn)) out.push({ t, id: String(o.id), tb: o.titleBn || '', te: o.titleEn || '' });
    }));
    return out;
}
function pickerResultsHtml(l) {
    const q = ui.q.trim().toLowerCase();
    const rows = pickerIndex().filter(x => (ui.kind === 'all' || x.t === ui.kind) &&
        (!q || (x.tb + ' ' + x.te).toLowerCase().indexOf(q) > -1)).slice(0, 40);
    if (!rows.length) return `<p class="pl-muted">${T('কিছু পাওয়া যায়নি', 'Nothing found')}</p>`;
    return rows.map(x => {
        const inList = hasItem(l, x.t, x.id);
        return `<div class="pl-row">
            <span class="pl-row-t">${typeBadge(x.t)} <span>${E(EN() ? (x.te || x.tb) : (x.tb || x.te))}</span></span>
            <button type="button" class="pl-btn pl-mini ${inList ? 'pl-done' : ''}" data-pl="padd" data-lid="${E(l.id)}" data-t="${x.t}" data-id="${E(x.id)}" ${inList ? 'disabled' : ''} aria-label="${inList ? T('যোগ হয়েছে', 'Added') : T('যোগ করুন', 'Add')}">${inList ? '✓' : '＋'}</button>
        </div>`;
    }).join('');
}

function renderListView(l) {
    const d = state.darkMode;
    const resume = l.pos > 0 && l.pos < l.items.length;
    return `
    <div class="pl-page page-enter ${d ? 'pl-dark' : ''}">
        <button type="button" class="pl-back" data-pl="back">← ${T('সব তালিকা', 'All lists')}</button>
        <div class="pl-head">
            ${ui.renaming ? `
            <div class="pl-create">
                <label for="pl-rename" class="pl-sr">${T('তালিকার নাম', 'List name')}</label>
                <input id="pl-rename" class="pl-input" type="text" maxlength="${MAX_NAME}" value="${E(l.name)}" autocomplete="off">
                <button type="button" class="pl-btn pl-primary" data-pl="renamesave">${T('সংরক্ষণ', 'Save')}</button>
                <button type="button" class="pl-btn" data-pl="renamecancel">${T('বাতিল', 'Cancel')}</button>
            </div>` : `<h1><span class="ac-em" aria-hidden="true">🗂️</span> ${E(l.name)}</h1>`}
            <p>${N(l.items.length)} ${T('টি আইটেম', 'items')}</p>
        </div>
        <div class="pl-actions">
            ${l.items.length ? `<button type="button" class="pl-btn pl-primary" data-pl="start" data-lid="${E(l.id)}" data-pos="0">▶ ${T('শুরু করুন', 'Start')}</button>` : ''}
            ${resume ? `<button type="button" class="pl-btn pl-primary" data-pl="start" data-lid="${E(l.id)}" data-pos="${l.pos}">⏯ ${T('চালিয়ে যান', 'Continue')} (${N(l.pos + 1)}/${N(l.items.length)})</button>` : ''}
            <button type="button" class="pl-btn" data-pl="picker" aria-expanded="${ui.picker}">＋ ${T('যোগ করুন', 'Add items')}</button>
            <button type="button" class="pl-btn" data-pl="rename">✏️ ${T('নাম বদলান', 'Rename')}</button>
            <button type="button" class="pl-btn pl-danger" data-pl="dellist" data-lid="${E(l.id)}">🗑 ${T('মুছুন', 'Delete')}</button>
        </div>
        ${ui.picker ? `
        <div class="pl-picker">
            <div class="pl-kinds" role="group" aria-label="${T('ধরন', 'Type')}">
                ${[['all', T('সব', 'All')], ['dua', T('দোয়া', 'Dua')], ['ziyarat', T('যিয়ারত', 'Ziyarat')], ['amal', T('আমল', 'Amal')]].map(k =>
                    `<button type="button" class="pl-chip" data-pl="kind" data-v="${k[0]}" aria-pressed="${ui.kind === k[0]}">${k[1]}</button>`).join('')}
            </div>
            <label for="pl-q" class="pl-sr">${T('খুঁজুন', 'Search')}</label>
            <input id="pl-q" class="pl-input" type="search" value="${E(ui.q)}" placeholder="${T('নাম দিয়ে খুঁজুন…', 'Search by title…')}" autocomplete="off">
            <div id="pl-results" class="pl-results">${pickerResultsHtml(l)}</div>
        </div>` : ''}
        ${l.items.length ? `<ol class="pl-items">${l.items.map((it, i) => {
            const obj = findObj(it.t, it.id);
            return `<li class="pl-item ${obj ? '' : 'pl-missing'}">
                <span class="pl-no">${N(i + 1)}</span>
                <button type="button" class="pl-item-main" data-pl="play" data-lid="${E(l.id)}" data-pos="${i}" ${obj ? '' : 'disabled'}>
                    ${typeBadge(it.t)}<span class="pl-item-t">${E(titleOf(it, obj)) || E(it.id)}${obj ? '' : ' — ' + T('পাওয়া যায়নি', 'not found')}</span>
                </button>
                <span class="pl-ctl">
                    <button type="button" class="pl-btn pl-mini" data-pl="up" data-lid="${E(l.id)}" data-pos="${i}" ${i === 0 ? 'disabled' : ''} aria-label="${T('উপরে সরান', 'Move up')}">▲</button>
                    <button type="button" class="pl-btn pl-mini" data-pl="down" data-lid="${E(l.id)}" data-pos="${i}" ${i === l.items.length - 1 ? 'disabled' : ''} aria-label="${T('নিচে সরান', 'Move down')}">▼</button>
                    <button type="button" class="pl-btn pl-mini pl-danger" data-pl="rm" data-lid="${E(l.id)}" data-pos="${i}" aria-label="${T('তালিকা থেকে বাদ দিন', 'Remove from list')}">✕</button>
                </span>
            </li>`;
        }).join('')}</ol>` : `<div class="pl-empty"><p>${T('তালিকা খালি। "যোগ করুন" চেপে আইটেম বেছে নিন।', 'This list is empty. Tap "Add items" to choose.')}</p></div>`}
    </div>`;
}

function renderPlaylistsPage() {
    if (ui.view === 'list') { const l = getList(ui.lid); if (l) return renderListView(l); ui.view = 'home'; }
    return renderHome();
}
window.renderPlaylistsPage = renderPlaylistsPage;

// ---- reader pages: add button, sheet, session bar ---------------------------
function sheetHtml(it) {
    const title = titleOf({ tb: it.obj.titleBn, te: it.obj.titleEn }, it.obj);
    return `
    <div class="pl-sheet-card ${state.darkMode ? 'pl-dark' : ''}" role="document">
        <div class="pl-sheet-head">
            <b>🗂️ ${T('আমার তালিকায় যোগ করুন', 'Add to my list')}</b>
            <button type="button" class="pl-btn pl-mini" data-pl="sheetclose" aria-label="${T('বন্ধ করুন', 'Close')}">✕</button>
        </div>
        <p class="pl-sheet-sub">${E(title)}</p>
        <div class="pl-sheet-lists">
            ${DB.lists.length ? DB.lists.map(l => {
                const on = hasItem(l, it.t, it.id);
                return `<button type="button" class="pl-sheet-row ${on ? 'on' : ''}" data-pl="tog" data-lid="${E(l.id)}" role="checkbox" aria-checked="${on}">
                    <span class="pl-box" aria-hidden="true">${on ? '✓' : ''}</span><span>${E(l.name)}</span><small>${N(l.items.length)}</small></button>`;
            }).join('') : `<p class="pl-muted">${T('এখনো কোনো তালিকা নেই — নিচে নতুন একটি বানান।', 'No lists yet — create one below.')}</p>`}
        </div>
        <div class="pl-create">
            <label for="pl-sheetname" class="pl-sr">${T('নতুন তালিকার নাম', 'New list name')}</label>
            <input id="pl-sheetname" class="pl-input" type="text" maxlength="${MAX_NAME}" placeholder="${T('নতুন তালিকা…', 'New list…')}" autocomplete="off">
            <button type="button" class="pl-btn pl-primary" data-pl="sheetnew">＋</button>
        </div>
    </div>`;
}
function openSheet() {
    const it = curItem(); if (!it) return;
    closeSheet();
    const w = document.createElement('div');
    w.id = 'pl-sheet'; w.className = 'pl-sheet';
    w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-label', T('আমার তালিকায় যোগ করুন', 'Add to my list'));
    w.innerHTML = sheetHtml(it);
    document.body.appendChild(w);
    const f = w.querySelector('button, input'); if (f) f.focus();
}
function refreshSheet() {
    const w = document.getElementById('pl-sheet'), it = curItem();
    if (!w || !it) return;
    const keep = w.querySelector('#pl-sheetname');
    const val = keep ? keep.value : '';
    w.innerHTML = sheetHtml(it);
    const inp = w.querySelector('#pl-sheetname'); if (inp) inp.value = val;
}
function closeSheet() { const w = document.getElementById('pl-sheet'); if (w) w.remove(); }

function injectReader() {
    const oldBtn = document.querySelector('.pl-add-pill'); if (oldBtn) oldBtn.remove();
    const oldBar = document.getElementById('pl-bar'); if (oldBar) oldBar.remove();
    const it = curItem(); if (!it) return;
    const bar = document.querySelector('#main-content .kc-card-actions:not(.uc-actions-compact)');
    if (bar) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'pl-add-pill'; b.setAttribute('data-pl', 'sheet');
        b.setAttribute('aria-haspopup', 'dialog');
        b.textContent = '🗂️ ' + T('আমার তালিকা', 'My list');
        bar.appendChild(b);
    }
    const back = document.querySelector('#main-content [data-action="changePage"][data-param="playlists"]');
    if (back) back.textContent = '← ' + T('আমার তালিকায় ফিরুন', 'Back to my lists');
    if (!SESS) return;
    const l = getList(SESS.lid), exp = l && l.items[SESS.pos];
    if (!exp || exp.t !== it.t || exp.id !== it.id) { SESS = null; return; }
    const last = SESS.pos >= l.items.length - 1;
    const el = document.createElement('div');
    el.id = 'pl-bar'; el.className = 'pl-bar' + (state.darkMode ? ' pl-dark' : '');
    el.setAttribute('role', 'region'); el.setAttribute('aria-label', T('তালিকা অনুযায়ী পড়া', 'Reading a list'));
    el.innerHTML = `
        <button type="button" class="pl-bar-b" data-pl="sessprev" ${SESS.pos === 0 ? 'disabled' : ''} aria-label="${T('আগেরটি', 'Previous')}">←</button>
        <span class="pl-bar-t"><b>${E(l.name)}</b><small>${N(SESS.pos + 1)} / ${N(l.items.length)}</small></span>
        <button type="button" class="pl-bar-b pl-bar-next" data-pl="sessnext" aria-label="${last ? T('শেষ করুন', 'Finish') : T('পরেরটি', 'Next')}">${last ? '✓' : '→'}</button>
        <button type="button" class="pl-bar-b" data-pl="sessend" aria-label="${T('তালিকা বন্ধ করুন', 'Stop list')}">✕</button>`;
    document.body.appendChild(el);
}

function after() {
    if (typeof state === 'undefined') return;
    const p = state.currentPage;
    if (READERS.indexOf(p) < 0) {
        closeSheet();
        const b = document.getElementById('pl-bar'); if (b) b.remove();
        if (p !== 'playlists') SESS = null;
        return;
    }
    injectReader();
}

// ---- events -------------------------------------------------------------------
function rerender() { if (typeof render === 'function') render(); }
function val(id) { const el = document.getElementById(id); return el ? el.value : ''; }

document.addEventListener('click', e => {
    const el = e.target && e.target.closest && e.target.closest('[data-pl]');
    if (el) {
        const a = el.getAttribute('data-pl');
        const lid = el.getAttribute('data-lid');
        const pos = parseInt(el.getAttribute('data-pos'), 10);
        try {
            switch (a) {
                case 'new': ui.creating = true; rerender(); setTimeout(() => { const i = document.getElementById('pl-newname'); if (i) i.focus(); }, 30); break;
                case 'newcancel': ui.creating = false; rerender(); break;
                case 'create': { const l = createList(val('pl-newname')); if (l) { ui.creating = false; ui.view = 'list'; ui.lid = l.id; ui.picker = true; ui.q = ''; ui.kind = 'all'; rerender(); } break; }
                case 'open': ui.view = 'list'; ui.lid = lid; ui.picker = false; ui.renaming = false; ui.q = ''; ui.kind = 'all'; rerender(); window.scrollTo(0, 0); break;
                case 'back': ui.view = 'home'; ui.renaming = false; ui.picker = false; rerender(); break;
                case 'start': case 'play': play(lid, isNaN(pos) ? 0 : pos); break;
                case 'picker': ui.picker = !ui.picker; rerender(); if (ui.picker) setTimeout(() => { const i = document.getElementById('pl-q'); if (i) i.focus(); }, 30); break;
                case 'kind': ui.kind = el.getAttribute('data-v'); rerender(); break;
                case 'padd': { const l = getList(lid); if (l && addItem(l, el.getAttribute('data-t'), el.getAttribute('data-id'))) { const r = document.getElementById('pl-results'); const cnt = document.querySelector('.pl-head p'); if (r) r.innerHTML = pickerResultsHtml(l); if (cnt) cnt.textContent = N(l.items.length) + ' ' + T('টি আইটেম', 'items'); toast(T('যোগ হয়েছে', 'Added')); } break; }
                case 'rename': ui.renaming = true; rerender(); setTimeout(() => { const i = document.getElementById('pl-rename'); if (i) { i.focus(); i.select(); } }, 30); break;
                case 'renamecancel': ui.renaming = false; rerender(); break;
                case 'renamesave': { const l = getList(ui.lid), n = clip(val('pl-rename'), MAX_NAME).trim(); if (l && n) { l.name = n; save(); ui.renaming = false; rerender(); } else toast(T('নাম খালি রাখা যাবে না', 'Name cannot be empty'), 'warning'); break; }
                case 'dellist': { const l = getList(lid); if (l && confirm(T('"' + l.name + '" তালিকাটি মুছে ফেলবেন?', 'Delete the list "' + l.name + '"?'))) { DB.lists = DB.lists.filter(x => x.id !== lid); save(); if (SESS && SESS.lid === lid) SESS = null; ui.view = 'home'; rerender(); } break; }
                case 'up': case 'down': { const l = getList(lid); if (!l || isNaN(pos)) break; const j = a === 'up' ? pos - 1 : pos + 1; if (j < 0 || j >= l.items.length) break; const t = l.items[pos]; l.items[pos] = l.items[j]; l.items[j] = t; if (l.pos === pos) l.pos = j; else if (l.pos === j) l.pos = pos; save(); rerender(); break; }
                case 'rm': { const l = getList(lid); if (l && !isNaN(pos) && l.items[pos]) { removeItem(l, l.items[pos].t, l.items[pos].id); rerender(); } break; }
                case 'sheet': openSheet(); break;
                case 'sheetclose': closeSheet(); break;
                case 'tog': { const it = curItem(), l = getList(lid); if (it && l) { if (hasItem(l, it.t, it.id)) removeItem(l, it.t, it.id); else addItem(l, it.t, it.id, it.obj); refreshSheet(); } break; }
                case 'sheetnew': { const it = curItem(); const l = createList(val('pl-sheetname')); if (l && it) { addItem(l, it.t, it.id, it.obj); refreshSheet(); toast(T('তালিকায় যোগ হয়েছে', 'Added to the list')); } break; }
                case 'sessprev': if (SESS) play(SESS.lid, SESS.pos - 1); break;
                case 'sessnext': { if (!SESS) break; const l = getList(SESS.lid); if (!l) break; if (SESS.pos >= l.items.length - 1) { l.pos = 0; save(); toast(T('✓ তালিকা শেষ হয়েছে', '✓ List finished')); endSession(true); } else play(SESS.lid, SESS.pos + 1); break; }
                case 'sessend': endSession(false); break;
            }
        } catch (err) { /* never break the page */ }
        return;
    }
    const sh = document.getElementById('pl-sheet');
    if (sh && e.target === sh) closeSheet();
});
document.addEventListener('input', e => {
    if (e.target && e.target.id === 'pl-q') {
        ui.q = e.target.value;
        const l = getList(ui.lid), r = document.getElementById('pl-results');
        if (l && r) r.innerHTML = pickerResultsHtml(l);
    }
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (document.getElementById('pl-sheet')) { closeSheet(); } return; }
    if (e.key !== 'Enter' || !e.target) return;
    const id = e.target.id;
    const map = { 'pl-newname': 'create', 'pl-rename': 'renamesave', 'pl-sheetname': 'sheetnew' };
    if (map[id]) { e.preventDefault(); const b = document.querySelector('[data-pl="' + map[id] + '"]'); if (b) b.click(); }
});

// attach after every render()
if (typeof window.render === 'function' && !window.render.__pl) {
    const _render = window.render;
    const wrapped = function () {
        const r = _render.apply(this, arguments);
        try { after(); } catch (e) { /* never break rendering */ }
        return r;
    };
    wrapped.__pl = true;
    // keep the reader-mode marker if it wrapped first
    if (_render.__rm) wrapped.__rm = true;
    window.render = wrapped;
}

})();
