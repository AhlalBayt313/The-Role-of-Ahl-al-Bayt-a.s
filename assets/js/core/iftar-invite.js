// ============================================================================
// IFTAR INVITATION CARD — v190
// ----------------------------------------------------------------------------
// A section on the Ramadan page: fill in date / time / place (optional guest and
// host names, short note) and get a card image (PNG) to share or download, plus a
// plain-text version for WhatsApp/SMS. Runs fully on the device — no server, nothing
// stored. The card carries the app's title (the same one the splash shows).
// No religious text is written here: the only wording is the invitation itself.
// Date/time default to today and today's iftar (Maghrib) when the Ramadan page has
// loaded the times (window._amTimes from daily-amal.js).
// Wraps renderRamadanPage (already wrapped by ramadan-plus.js); typeof-guarded.
// ============================================================================
(function () {
'use strict';

const EN = () => (typeof state !== 'undefined' && state.language === 'en');
const T = (b, e) => EN() ? e : b;
const N = n => EN() ? String(n) : (typeof toBengaliDigits === 'function' ? toBengaliDigits(n) : String(n));
const E = s => (typeof escapeHtml === 'function') ? escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad2 = n => String(n).padStart(2, '0');

const WD = [['রবিবার', 'Sunday'], ['সোমবার', 'Monday'], ['মঙ্গলবার', 'Tuesday'], ['বুধবার', 'Wednesday'], ['বৃহস্পতিবার', 'Thursday'], ['শুক্রবার', 'Friday'], ['শনিবার', 'Saturday']];
const MO = [['জানুয়ারি', 'January'], ['ফেব্রুয়ারি', 'February'], ['মার্চ', 'March'], ['এপ্রিল', 'April'], ['মে', 'May'], ['জুন', 'June'], ['জুলাই', 'July'], ['আগস্ট', 'August'], ['সেপ্টেম্বর', 'September'], ['অক্টোবর', 'October'], ['নভেম্বর', 'November'], ['ডিসেম্বর', 'December']];
const APP_TITLE = 'The Role of Ahl al-Bayt (a.s)';   // same title as the splash screen
const FONT = (window._rcArt && window._rcArt.FONT) || '"Noto Serif Bengali","Hind Siliguri","Noto Sans Bengali",Georgia,serif';   // v200: bundled font from ramadan-cardart.js

let _raf = 0;

function todayISO() { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function defaultTime() {
    try {
        const t = (typeof window._amTimes === 'function') ? window._amTimes() : null;
        if (t && t.today && t.today.maghrib) return pad2(t.today.maghrib[0]) + ':' + pad2(t.today.maghrib[1]);
    } catch (e) { /* none */ }
    return '18:00';
}
function parseISO(v) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
function fmtDate(v) {
    const d = parseISO(v); if (!d) return '';
    const i = EN() ? 1 : 0;
    return WD[d.getDay()][i] + ', ' + N(d.getDate()) + ' ' + MO[d.getMonth()][i] + ' ' + N(d.getFullYear());
}
function fmtTime(v) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(v || ''); if (!m) return '';
    let h = +m[1]; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
    return N(h) + ':' + N(m[2]) + ' ' + ap;
}
function vals() {
    const g = id => { const el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; };
    return { theme: g('ii-theme') || 'night', guest: g('ii-guest'), host: g('ii-host'), date: g('ii-date'), time: g('ii-time'), place: g('ii-place'), note: g('ii-note').slice(0, 140) };
}

// ---------------------------------------------------------------------------
// Card drawing (canvas 1080 x 1350)
// ---------------------------------------------------------------------------
function wrapLines(ctx, text, maxW) {
    const words = String(text).split(/\s+/).filter(Boolean), lines = [];
    let cur = '';
    words.forEach(w => {
        const t = cur ? cur + ' ' + w : w;
        if (ctx.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    return lines;
}
// v201: 'Night caravan' theme — deep-blue sky, white crescent + star, caravan and palms in silhouette, tan-gold lettering.
function drawNight(ctx, v, A) {
    const W = A.W, H = A.H;
    A.nightBase(ctx);
    A.whiteCrescent(ctx, W / 2 - 6, 168, 76);
    A.sparkle(ctx, W / 2 - 150, 120, 10, .9); A.sparkle(ctx, W / 2 + 140, 210, 8, .8); A.sparkle(ctx, W / 2 + 190, 110, 6, .6);
    A.nightGround(ctx);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    let y = 292;
    ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.font = '600 32px ' + A.DISPLAY; A.spaced(ctx, APP_TITLE, W / 2, y, 2); y += 104;
    ctx.save(); ctx.shadowColor = 'rgba(0,10,40,.55)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 4;
    const tg = ctx.createLinearGradient(0, y - 80, 0, y + 20); tg.addColorStop(0, '#f0dca0'); tg.addColorStop(1, '#bd9a4c');
    ctx.fillStyle = tg; ctx.font = '700 98px ' + FONT; ctx.fillText(T('ইফতারের আমন্ত্রণ', 'Iftar Invitation'), W / 2, y, 900); ctx.restore();
    y += 46; A.diamonds(ctx, W / 2, y, 5, 40, 9); y += 78;
    ctx.fillStyle = '#ffffff';
    if (v.guest) {
        ctx.font = '700 50px ' + FONT;
        wrapLines(ctx, T('প্রিয় ' + v.guest + ',', 'Dear ' + v.guest + ','), 840).slice(0, 1).forEach(ln => { ctx.fillText(ln, W / 2, y); }); y += 58;
    }
    ctx.font = '500 42px ' + FONT; ctx.fillText(T('আপনাকে ইফতারে আমন্ত্রণ জানাই', 'You are warmly invited to iftar'), W / 2, y); y += 46;

    const rows = [];
    ctx.font = '700 44px ' + FONT;
    if (v.date) rows.push({ k: 'date', lines: wrapLines(ctx, fmtDate(v.date), 640).slice(0, 2) });
    if (v.time) rows.push({ k: 'time', lines: wrapLines(ctx, T('ইফতার: ', 'Iftar: ') + fmtTime(v.time), 640).slice(0, 1) });
    if (v.place) rows.push({ k: 'place', lines: wrapLines(ctx, v.place, 640).slice(0, 2) });
    if (rows.length) {
        const LH = 52, PADY = 28, px = 90, pw = W - 250;
        const hs = rows.map(r => Math.max(84, r.lines.length * LH + PADY));
        const ph = hs.reduce((a, b) => a + b, 0) + 20;
        A.nightPanel(ctx, px, y, pw, ph, 30);
        let ry = y + 10;
        rows.forEach((r, i) => {
            const rh = hs[i], cy = ry + rh / 2;
            A.icon(ctx, r.k, px + 70, cy, 32);
            ctx.textAlign = 'left'; ctx.fillStyle = '#ffffff'; ctx.font = '700 44px ' + FONT;
            const ty = cy - (r.lines.length - 1) * LH / 2 + 15;
            r.lines.forEach((ln, j) => ctx.fillText(ln, px + 128, ty + j * LH));
            ctx.textAlign = 'center';
            if (i < rows.length - 1) { ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px + 34, ry + rh); ctx.lineTo(px + pw - 34, ry + rh); ctx.stroke(); }
            ry += rh;
        });
        y += ph + 56;
    }
    const limit = v.host ? 968 : 1090;
    if (v.note) {
        ctx.fillStyle = A.TAN_LIGHT; ctx.font = 'italic 500 38px ' + FONT;
        let room = 0; while (room < 2 && y + room * 50 + 12 < limit) room++;
        wrapLines(ctx, v.note, 800).slice(0, room).forEach(ln => { ctx.fillText(ln, W / 2, y); y += 50; });
    }
    if (v.host) A.pill(ctx, W / 2, 1010, '— ' + v.host, '700 40px ' + FONT, 290);
}
function drawCard(canvas, v) {
    const ctx = canvas.getContext && canvas.getContext('2d'); if (!ctx) return;
    const A = window._rcArt; if (!A) return;
    const W = A.W, H = A.H; canvas.width = W; canvas.height = H;
    const goldSoft = A.GOLD_SOFT;
    if (v.theme !== 'emerald') { drawNight(ctx, v, A); return; }
    A.base(ctx); A.scene(ctx, 104, 418, 480);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';

    let y = 468;
    ctx.fillStyle = goldSoft; ctx.font = '600 36px ' + A.DISPLAY; A.spaced(ctx, APP_TITLE, W / 2, y, 2); y += 78;   // v200: display serif, letter-spaced
    A.title(ctx, T('ইফতারের আমন্ত্রণ', 'Iftar Invitation'), W / 2, y, 80, FONT);
    y += 40; A.divider(ctx, W / 2, y, 210); y += 70;

    if (v.guest) {
        ctx.fillStyle = goldSoft; ctx.font = '700 50px ' + FONT;
        wrapLines(ctx, T('প্রিয় ' + v.guest + ',', 'Dear ' + v.guest + ','), 840).slice(0, 1).forEach(ln => { ctx.fillText(ln, W / 2, y); }); y += 62;
    }
    ctx.fillStyle = '#e8f5ee'; ctx.font = '500 44px ' + FONT;
    ctx.fillText(T('আপনাকে ইফতারে আমন্ত্রণ জানাই', 'You are warmly invited to iftar'), W / 2, y); y += 50;

    // details panel: icon badge + text per row
    const rows = [];
    ctx.font = '700 46px ' + FONT;
    if (v.date) rows.push({ k: 'date', lines: wrapLines(ctx, fmtDate(v.date), 640).slice(0, 2) });
    if (v.time) rows.push({ k: 'time', lines: wrapLines(ctx, T('ইফতার: ', 'Iftar: ') + fmtTime(v.time), 640).slice(0, 1) });
    if (v.place) rows.push({ k: 'place', lines: wrapLines(ctx, v.place, 640).slice(0, 2) });
    if (rows.length) {
        const LH = 54, PADY = 30, px = 110, pw = W - 220;
        const hs = rows.map(r => Math.max(88, r.lines.length * LH + PADY));
        const ph = hs.reduce((a, b) => a + b, 0) + 24;
        A.panel(ctx, px, y, pw, ph, 30);
        let ry = y + 12;
        rows.forEach((r, i) => {
            const rh = hs[i], cy = ry + rh / 2;
            A.icon(ctx, r.k, px + 82, cy, 34);
            ctx.textAlign = 'left'; ctx.fillStyle = '#ffffff'; ctx.font = '700 46px ' + FONT;
            const ty = cy - (r.lines.length - 1) * LH / 2 + 16;
            r.lines.forEach((ln, j) => ctx.fillText(ln, px + 148, ty + j * LH));
            ctx.textAlign = 'center';
            if (i < rows.length - 1) { ctx.strokeStyle = 'rgba(212,175,55,.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px + 34, ry + rh); ctx.lineTo(px + pw - 34, ry + rh); ctx.stroke(); }
            ry += rh;
        });
        y += ph + 50;
    }
    if (v.note) {
        ctx.fillStyle = goldSoft; ctx.font = 'italic 500 38px ' + FONT;
        const room = Math.max(0, Math.min(2, Math.floor((H - 190 - y) / 50)));   // never run into the host line
        wrapLines(ctx, v.note, 800).slice(0, room).forEach(ln => { ctx.fillText(ln, W / 2, y); y += 50; });
    }
    if (v.host) {
        ctx.fillStyle = '#ffffff'; ctx.font = '700 46px ' + FONT; ctx.fillText('— ' + v.host, W / 2, H - 132);
    }
    A.divider(ctx, W / 2, H - 98, 120);
}
function schedule() {
    if (_raf) cancelAnimationFrame(_raf);
    _raf = requestAnimationFrame(() => { _raf = 0; const c = document.getElementById('ii-canvas'); if (c) drawCard(c, vals()); });
}
function ensureFontThenDraw() {
    schedule();
    try { if (window._rcArt && window._rcArt.ready) window._rcArt.ready().then(schedule, () => {}); } catch (e) { /* ignore */ }   // v200: bundled fonts
}

// ---------------------------------------------------------------------------
// Text version (WhatsApp / SMS)
// ---------------------------------------------------------------------------
function inviteText(v) {
    const L = [];
    L.push((v.guest ? T('প্রিয় ' + v.guest + ',', 'Dear ' + v.guest + ',') + '\n' : '') + T('আপনাকে ইফতারে আমন্ত্রণ জানাই।', 'You are warmly invited to iftar.'));
    if (v.date) L.push('📅 ' + fmtDate(v.date));
    if (v.time) L.push('🕰️ ' + T('ইফতার: ', 'Iftar: ') + fmtTime(v.time));
    if (v.place) L.push('📍 ' + v.place);
    if (v.note) L.push(v.note);
    if (v.host) L.push('— ' + v.host);
    return L.join('\n');
}

// ---------------------------------------------------------------------------
// Section + page hook
// ---------------------------------------------------------------------------
function section(d) {
    return `
    <section class="am-card${d ? ' am-d' : ''}" id="ii-sec">
        <h3>${T('ইফতার-আমন্ত্রণ কার্ড', 'Iftar invitation card')}</h3>
        <p class="am-note">${T('তারিখ, সময় ও জায়গা লিখলেই কার্ড তৈরি। ছবি হিসেবে শেয়ার বা সংরক্ষণ করতে পারবেন। কিছুই কোথাও জমা হয় না — সবই আপনার ডিভাইসে।', 'Fill in the date, time and place to get a card. Share or save it as an image. Nothing is stored anywhere — it all stays on your device.')}</p>
        <div class="ii-grid">
            <label class="ii-f ii-wide"><span>${T('কার্ডের থিম', 'Card theme')}</span><select id="ii-theme" class="rp-input"><option value="night">${T('রাতের কাফেলা (নীল)', 'Night caravan (blue)')}</option><option value="emerald">${T('পান্না ও সোনালি', 'Emerald and gold')}</option></select></label>
            <label class="ii-f"><span>${T('অতিথির নাম (ঐচ্ছিক)', 'Guest name (optional)')}</span><input id="ii-guest" class="rp-input" type="text" maxlength="40" autocomplete="off"></label>
            <label class="ii-f"><span>${T('আপনার নাম (ঐচ্ছিক)', 'Your name (optional)')}</span><input id="ii-host" class="rp-input" type="text" maxlength="40" autocomplete="off"></label>
            <label class="ii-f"><span>${T('তারিখ', 'Date')}</span><input id="ii-date" class="rp-input" type="date" value="${todayISO()}"></label>
            <label class="ii-f"><span>${T('ইফতারের সময়', 'Iftar time')}</span><input id="ii-time" class="rp-input" type="time" value="${defaultTime()}"></label>
            <label class="ii-f ii-wide"><span>${T('জায়গা', 'Place')}</span><input id="ii-place" class="rp-input" type="text" maxlength="90" autocomplete="off"></label>
            <label class="ii-f ii-wide"><span>${T('ছোট একটি বার্তা (ঐচ্ছিক)', 'A short message (optional)')}</span><input id="ii-note" class="rp-input" type="text" maxlength="140" autocomplete="off"></label>
        </div>
        <canvas id="ii-canvas" class="ii-canvas" width="1080" height="1350" role="img" aria-label="${E(T('আমন্ত্রণ কার্ডের প্রিভিউ', 'Invitation card preview'))}"></canvas>
        <div class="am-actions ii-actions">
            <button type="button" class="am-btn" data-ii-act="share">${T('কার্ড শেয়ার/সংরক্ষণ', 'Share / save card')}</button>
            <button type="button" class="am-btn" data-ii-act="wa">${T('হোয়াটসঅ্যাপে লেখা পাঠান', 'Send text on WhatsApp')}</button>
            <button type="button" class="am-btn" data-ii-act="copy">${T('লেখা কপি', 'Copy text')}</button>
        </div>
        <p class="am-note" id="ii-msg" aria-live="polite"></p>
    </section>`;
}

const _prev = window.renderRamadanPage;
if (typeof _prev === 'function') {
    window.renderRamadanPage = function () {
        let html = _prev.apply(this, arguments);
        if (typeof html !== 'string' || html.indexOf('id="am-root"') < 0) return html;
        try {
            const d = !!state.darkMode;
            const k = html.indexOf('id="rp-chk"');
            let at = k >= 0 ? html.lastIndexOf('<section', k) : -1;
            if (at < 0) { const g = html.indexOf('class="am-grid"'); at = g >= 0 ? html.lastIndexOf('<section', g) : html.lastIndexOf('</div>'); }
            html = html.slice(0, at) + section(d) + html.slice(at);
            setTimeout(() => { if (document.getElementById('ii-canvas')) ensureFontThenDraw(); }, 0);
        } catch (e) { /* never break the page */ }
        return html;
    };
}

function say(t) { const m = document.getElementById('ii-msg'); if (m) m.textContent = t; }
function download(blob) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'iftar-invitation.png';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function doShare() {
    const c = document.getElementById('ii-canvas'); if (!c) return;
    drawCard(c, vals());
    c.toBlob(blob => {
        if (!blob) { say(T('কার্ড তৈরি করা যায়নি।', 'Could not create the card.')); return; }
        let file = null; try { file = new File([blob], 'iftar-invitation.png', { type: 'image/png' }); } catch (e) { file = null; }
        if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
            navigator.share({ files: [file], text: inviteText(vals()) }).catch(() => { /* cancelled */ });
        } else { download(blob); say(T('ছবিটি সংরক্ষণ করা হয়েছে।', 'The image was saved.')); }
    }, 'image/png');
}
function doCopy() {
    const t = inviteText(vals());
    const ok = () => say(T('লেখা কপি হয়েছে।', 'Text copied.'));
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, () => say(T('কপি করা যায়নি।', 'Could not copy.')));
    else say(T('কপি করা যায়নি।', 'Could not copy.'));
}

document.addEventListener('input', e => { if (e.target && e.target.id && e.target.id.indexOf('ii-') === 0) schedule(); });
document.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('[data-ii-act]');
    if (!el || !document.getElementById('ii-sec')) return;
    const a = el.getAttribute('data-ii-act');
    if (a === 'share') doShare();
    else if (a === 'copy') doCopy();
    else if (a === 'wa') window.open('https://wa.me/?text=' + encodeURIComponent(inviteText(vals())), '_blank', 'noopener');
});
// Fill the default time once the Ramadan page has loaded today's Maghrib (only if the field is still untouched).
document.addEventListener('am:times', () => {
    const t = document.getElementById('ii-time');
    if (t && !t.dataset.touched) { t.value = defaultTime(); schedule(); }
});
document.addEventListener('change', e => { if (e.target && e.target.id === 'ii-time') e.target.dataset.touched = '1'; });

window._iiDraw = drawCard; window._iiText = inviteText; window._iiFmtDate = fmtDate; window._iiFmtTime = fmtTime;
})();
