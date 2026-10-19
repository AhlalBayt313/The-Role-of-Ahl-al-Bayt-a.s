// ============================================================================
// RAMADAN CARD ART — v200 (premium pass over v199)
// ----------------------------------------------------------------------------
// Shared canvas drawing helpers for the two share cards on the Ramadan page
// ("আমার রমজান" in ramadan-journal.js and the iftar invitation in iftar-invite.js).
// v200: deeper emerald background with a glow behind the arch, finer star lattice,
// gold dust and film grain; triple gold frame with dotted band, ornate corner
// medallions and edge diamonds; layered arch with inner tile pattern, light rays,
// crescent + star with halo; refined lanterns; glass panels with gold-gradient
// border and soft shadow; tick-marked progress ring; champagne-gold title text.
// FIX: the cards used the font name "Noto Serif Bengali" without ever loading it, so
// on devices without that font punctuation, Latin letters and some Bengali glyphs
// came out as empty boxes. The fonts are now bundled (assets/fonts/rc-*.woff2,
// SIL OFL) and loaded through window._rcArt.ready() before every draw.
// Pure drawing — it writes NO text and no religious content. Everything is vector
// or bundled font files (no network), the static background is cached offscreen.
// Exposes window._rcArt; the card files use it when present.
// ============================================================================
(function () {
'use strict';

const W = 1080, H = 1350;
const GOLD = '#d4af37', GOLD_SOFT = '#f1d77a', GOLD_DEEP = '#a8791a', CHAMP = '#fff3cf';
const FONT = '"RcBn","Noto Serif Bengali","Hind Siliguri","Noto Sans Bengali",Georgia,serif';
const DISPLAY = '"RcDisplay","RcBn",Georgia,"Times New Roman",serif';

// ---- bundled fonts ---------------------------------------------------------------
const BN_RANGE = 'U+0951-0952,U+0964-0965,U+0980-09FE,U+1CD0,U+1CD2,U+1CD5-1CD6,U+1CD8,U+1CE1,U+1CEA,U+1CED,U+1CF2,U+1CF5-1CF7,U+200C-200D,U+20B9,U+25CC,U+A8F1';
const LATIN_RANGE = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
let _fontP = null;
function ready() {
    if (_fontP) return _fontP;
    _fontP = new Promise(function (resolve) {
        try {
            if (typeof FontFace === 'undefined' || !document.fonts) { resolve(false); return; }
            const base = 'assets/fonts/';
            const defs = [
                ['RcBn', 'rc-bn-bengali-500.woff2', { weight: '500', unicodeRange: BN_RANGE }],
                ['RcBn', 'rc-bn-bengali-700.woff2', { weight: '700', unicodeRange: BN_RANGE }],
                ['RcBn', 'rc-bn-latin-500.woff2', { weight: '500', unicodeRange: LATIN_RANGE }],
                ['RcBn', 'rc-bn-latin-700.woff2', { weight: '700', unicodeRange: LATIN_RANGE }],
                ['RcDisplay', 'rc-display-600.woff2', { weight: '600', style: 'normal' }],
                ['RcDisplay', 'rc-display-500i.woff2', { weight: '500', style: 'italic' }]
            ];
            const jobs = defs.map(function (d) {
                const f = new FontFace(d[0], 'url(' + base + d[1] + ')', d[2]);
                return f.load().then(function (ff) { document.fonts.add(ff); return true; }, function () { return false; });
            });
            Promise.all(jobs).then(function () {
                // 600 is requested by the cards but only 500/700 are bundled → the browser picks the nearest; make sure they are active
                resolve(true);
            }, function () { resolve(false); });
        } catch (e) { resolve(false); }
    });
    return _fontP;
}

// ---- helpers -----------------------------------------------------------------------
function goldGrad(ctx, x0, y0, x1, y1) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, '#a8791a'); g.addColorStop(.3, '#f7e598'); g.addColorStop(.55, '#d4af37'); g.addColorStop(.8, '#f2d472'); g.addColorStop(1, '#8c6414');
    return g;
}
function rrect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
}
function starPath(ctx, cx, cy, R, r, n) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
        const a = -Math.PI / 2 + i * Math.PI / n, rad = i % 2 ? r : R;
        const x = cx + rad * Math.cos(a), y = cy + rad * Math.sin(a);
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
}
function rng(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function sparkle(ctx, x, y, r, a) {          // four-point twinkle
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = CHAMP;
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill();
    ctx.restore();
}
function diamond(ctx, x, y, r) { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); }

// ---- cached background: gradient + glow + lattice + dust + grain + vignette ----------
let _bg = null;
function makeBg() {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#021a15'); g.addColorStop(.5, '#06352a'); g.addColorStop(1, '#0a4a38');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // warm glow behind the arch + faint cool glow low on the card
    let r = x.createRadialGradient(W / 2, 290, 20, W / 2, 290, 620);
    r.addColorStop(0, 'rgba(255,214,110,.22)'); r.addColorStop(.45, 'rgba(60,150,110,.10)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = r; x.fillRect(0, 0, W, H);
    r = x.createRadialGradient(W / 2, H * .92, 10, W / 2, H * .92, 520);
    r.addColorStop(0, 'rgba(30,140,100,.18)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = r; x.fillRect(0, 0, W, H);
    // lattice of eight-point stars joined by thin lines (fades toward the corners)
    x.strokeStyle = 'rgba(212,175,55,.10)'; x.lineWidth = 1.4;
    const S = 100;
    for (let gy = -1; gy * S < H + S; gy++) {
        for (let gx = -1; gx * S < W + S; gx++) {
            const cx = gx * S + ((gy & 1) ? S / 2 : 0), cy = gy * S;
            starPath(x, cx, cy, 30, 17, 8); x.stroke();
            x.beginPath(); x.arc(cx, cy, 6, 0, Math.PI * 2); x.stroke();
            x.beginPath(); x.moveTo(cx + 30, cy); x.lineTo(cx + S - 30, cy); x.stroke();
        }
    }
    // gold dust
    const R = rng(1447);
    for (let i = 0; i < 90; i++) {
        const px = 80 + R() * (W - 160), py = 80 + R() * (H - 160), pr = .8 + R() * 2.2;
        x.fillStyle = 'rgba(255,226,140,' + (.10 + R() * .35).toFixed(2) + ')';
        x.beginPath(); x.arc(px, py, pr, 0, Math.PI * 2); x.fill();
    }
    // vignette
    const v = x.createRadialGradient(W / 2, H * .42, H * .20, W / 2, H * .45, H * .82);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,12,9,.72)');
    x.fillStyle = v; x.fillRect(0, 0, W, H);
    // film grain (tiled noise)
    const t = document.createElement('canvas'); t.width = t.height = 160;
    const tx = t.getContext('2d'), id = tx.createImageData(160, 160), R2 = rng(7);
    for (let i = 0; i < id.data.length; i += 4) { const n = R2() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = n; id.data[i + 3] = 16; }
    tx.putImageData(id, 0, 0);
    x.fillStyle = x.createPattern(t, 'repeat'); x.fillRect(0, 0, W, H);
    return c;
}

function frame(ctx) {
    ctx.save();
    // outer frame (thick gold) + hairline + inner frame
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 16;
    ctx.strokeStyle = goldGrad(ctx, 0, 0, W, H); ctx.lineWidth = 7; rrect(ctx, 36, 36, W - 72, H - 72, 30); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(241,215,122,.55)'; rrect(ctx, 52, 52, W - 104, H - 104, 22); ctx.stroke();
    ctx.lineWidth = 2.4; ctx.strokeStyle = goldGrad(ctx, W, 0, 0, H); rrect(ctx, 68, 68, W - 136, H - 136, 14); ctx.stroke();
    // dotted band between the hairline and the inner frame
    ctx.setLineDash([1, 13]); ctx.lineCap = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(241,215,122,.45)';
    rrect(ctx, 60, 60, W - 120, H - 120, 18); ctx.stroke(); ctx.setLineDash([]);
    // edge diamonds
    [[W / 2, 68], [W / 2, H - 68], [68, H / 2], [W - 68, H / 2]].forEach(function (p) {
        ctx.fillStyle = '#05281f'; diamond(ctx, p[0], p[1], 15); ctx.fill();
        ctx.fillStyle = goldGrad(ctx, p[0] - 12, p[1] - 12, p[0] + 12, p[1] + 12); diamond(ctx, p[0], p[1], 10); ctx.fill();
    });
    // corner medallions
    [[68, 68], [W - 68, 68], [68, H - 68], [W - 68, H - 68]].forEach(function (p) {
        const x = p[0], y = p[1];
        ctx.shadowColor = 'rgba(245,215,110,.45)'; ctx.shadowBlur = 20;
        ctx.fillStyle = '#05281f'; ctx.beginPath(); ctx.arc(x, y, 38, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = goldGrad(ctx, x - 38, y - 38, x + 38, y + 38); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 38, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(241,215,122,.55)'; ctx.beginPath(); ctx.arc(x, y, 31, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = goldGrad(ctx, x - 28, y - 28, x + 28, y + 28); starPath(ctx, x, y, 28, 14, 8); ctx.fill();
        ctx.fillStyle = '#05281f'; starPath(ctx, x, y, 11, 5, 8); ctx.fill();
        ctx.fillStyle = GOLD_SOFT; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
}

// base layer (background + frame), drawn onto the visible canvas
function base(ctx) {
    if (!_bg) _bg = makeBg();
    ctx.drawImage(_bg, 0, 0);
    frame(ctx);
}

// ---- crescent (true cut-out via clip) with halo + highlight --------------------------
function crescent(ctx, cx, cy, R) {
    ctx.save();
    const halo = ctx.createRadialGradient(cx, cy, R * .3, cx, cy, R * 2.3);
    halo.addColorStop(0, 'rgba(255,220,120,.38)'); halo.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, R * 2.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.rect(cx - R * 2, cy - R * 2, R * 4, R * 4);
    ctx.arc(cx + R * .36, cy - R * .12, R * .84, 0, Math.PI * 2, true);
    ctx.clip('evenodd');
    ctx.fillStyle = goldGrad(ctx, cx - R, cy - R, cx + R, cy + R);
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    // soft specular on the upper-left of the horn
    const sp = ctx.createRadialGradient(cx - R * .5, cy - R * .5, 2, cx - R * .5, cy - R * .5, R * .9);
    sp.addColorStop(0, 'rgba(255,250,225,.55)'); sp.addColorStop(1, 'rgba(255,250,225,0)');
    ctx.fillStyle = sp; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

// ---- pointed arch with rays, tile pattern, crescent + star ----------------------------
function archPath(ctx, cx, w, top, bottom) {
    const l = cx - w / 2, r = cx + w / 2, spring = top + (bottom - top) * .52, rise = spring - top;
    ctx.beginPath();
    ctx.moveTo(l, bottom); ctx.lineTo(l, spring);
    ctx.bezierCurveTo(l, spring - rise * .62, cx - w * .14, top + rise * .22, cx, top);
    ctx.bezierCurveTo(cx + w * .14, top + rise * .22, r, spring - rise * .62, r, spring);
    ctx.lineTo(r, bottom); ctx.closePath();
}
function arch(ctx, cx, top, bottom, w) {
    const my = top + (bottom - top) * .56, R = Math.min(w * .19, (bottom - top) * .24);
    ctx.save();
    // outer glow of the arch
    ctx.shadowColor = 'rgba(245,215,110,.35)'; ctx.shadowBlur = 40;
    archPath(ctx, cx, w, top, bottom);
    ctx.fillStyle = 'rgba(4,38,29,.6)'; ctx.fill();
    ctx.shadowBlur = 0;
    // interior: radial light + rays + tile lattice, all clipped to the arch
    archPath(ctx, cx, w, top, bottom); ctx.save(); ctx.clip();
    const fill = ctx.createRadialGradient(cx, my, 8, cx, my, (bottom - top) * .85);
    fill.addColorStop(0, 'rgba(255,225,130,.34)'); fill.addColorStop(.55, 'rgba(12,92,68,.38)'); fill.addColorStop(1, 'rgba(3,34,26,.62)');
    ctx.fillStyle = fill; ctx.fillRect(cx - w / 2, top, w, bottom - top);
    ctx.fillStyle = 'rgba(255,230,150,.05)';
    for (let i = 0; i < 18; i++) {
        const a = i * Math.PI / 9, a2 = a + .09, L = w;
        ctx.beginPath(); ctx.moveTo(cx, my); ctx.lineTo(cx + L * Math.cos(a), my + L * Math.sin(a)); ctx.lineTo(cx + L * Math.cos(a2), my + L * Math.sin(a2)); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(241,215,122,.11)'; ctx.lineWidth = 1.3;
    const S = 64;
    for (let gy = 0; gy * S < bottom + S; gy++) for (let gx = -1; gx * S < w + S; gx++) {
        const px = cx - w / 2 + gx * S + ((gy & 1) ? S / 2 : 0), py = top + gy * S;
        starPath(ctx, px, py, 20, 11, 8); ctx.stroke();
    }
    ctx.restore();
    // frame lines: thick gradient, then two fine inner arches
    archPath(ctx, cx, w, top, bottom);
    ctx.strokeStyle = goldGrad(ctx, cx - w / 2, top, cx + w / 2, bottom); ctx.lineWidth = 7; ctx.stroke();
    archPath(ctx, cx, w - 30, top + 24, bottom);
    ctx.strokeStyle = 'rgba(241,215,122,.6)'; ctx.lineWidth = 2; ctx.stroke();
    archPath(ctx, cx, w - 56, top + 44, bottom);
    ctx.strokeStyle = 'rgba(241,215,122,.28)'; ctx.lineWidth = 1.4; ctx.stroke();
    // keystone jewel at the arch tip
    ctx.fillStyle = '#05281f'; diamond(ctx, cx, top + 2, 15); ctx.fill();
    ctx.fillStyle = goldGrad(ctx, cx - 10, top - 10, cx + 10, top + 14); diamond(ctx, cx, top + 2, 10); ctx.fill();
    ctx.restore();
    // crescent + star
    crescent(ctx, cx - R * .22, my, R);
    ctx.save();
    ctx.shadowColor = 'rgba(255,225,130,.85)'; ctx.shadowBlur = 28;
    ctx.fillStyle = goldGrad(ctx, cx, my - R * .5, cx + R * .6, my + R * .3);
    starPath(ctx, cx + R * .42, my - R * .08, R * .32, R * .13, 8); ctx.fill();
    ctx.restore();
    // twinkles around the crescent
    sparkle(ctx, cx - R * 1.55, my - R * .9, 9, .9); sparkle(ctx, cx + R * 1.6, my + R * .75, 7, .7);
    sparkle(ctx, cx + R * 1.25, my - R * 1.25, 6, .6); sparkle(ctx, cx - R * 1.2, my + R * 1.15, 5, .5);
    return bottom;
}

// ---- hanging lantern -------------------------------------------------------------------
function lantern(ctx, x, top, chain, s) {
    ctx.save();
    ctx.strokeStyle = 'rgba(241,215,122,.75)'; ctx.lineWidth = 2.2; ctx.setLineDash([6, 3]);
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + chain); ctx.stroke(); ctx.setLineDash([]);
    ctx.translate(x, top + chain); ctx.scale(s, s);
    const gl = ctx.createRadialGradient(0, 78, 4, 0, 78, 150);
    gl.addColorStop(0, 'rgba(255,214,102,.50)'); gl.addColorStop(.5, 'rgba(255,200,90,.16)'); gl.addColorStop(1, 'rgba(255,214,102,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 78, 150, 0, Math.PI * 2); ctx.fill();
    // ring + cap
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.arc(0, 8, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = goldGrad(ctx, -26, 16, 26, 40);
    ctx.beginPath(); ctx.moveTo(-9, 16); ctx.lineTo(9, 16); ctx.lineTo(28, 40); ctx.lineTo(-28, 40); ctx.closePath(); ctx.fill();
    // body (amber glass)
    const body = ctx.createLinearGradient(-40, 0, 40, 0);
    body.addColorStop(0, 'rgba(150,92,16,.97)'); body.addColorStop(.3, 'rgba(236,170,60,.97)'); body.addColorStop(.5, 'rgba(255,226,140,.98)'); body.addColorStop(.7, 'rgba(236,170,60,.97)'); body.addColorStop(1, 'rgba(150,92,16,.97)');
    ctx.beginPath(); ctx.moveTo(-28, 40); ctx.bezierCurveTo(-54, 70, -54, 108, -24, 136); ctx.lineTo(24, 136); ctx.bezierCurveTo(54, 108, 54, 70, 28, 40); ctx.closePath();
    ctx.fillStyle = body; ctx.fill(); ctx.strokeStyle = goldGrad(ctx, -40, 40, 40, 136); ctx.lineWidth = 3.2; ctx.stroke();
    // gold ribs
    ctx.strokeStyle = 'rgba(110,64,6,.6)'; ctx.lineWidth = 2;
    [-16, 16].forEach(function (dx) { ctx.beginPath(); ctx.moveTo(dx * .7, 42); ctx.quadraticCurveTo(dx * 2.7, 88, dx * 1.1, 134); ctx.stroke(); });
    // flame glow
    const fl = ctx.createRadialGradient(0, 90, 2, 0, 90, 30);
    fl.addColorStop(0, 'rgba(255,252,226,.95)'); fl.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = fl; ctx.beginPath(); ctx.ellipse(0, 90, 15, 32, 0, 0, Math.PI * 2); ctx.fill();
    // base + tip
    ctx.fillStyle = goldGrad(ctx, -24, 136, 24, 152); rrect(ctx, -27, 136, 54, 14, 4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-8, 150); ctx.lineTo(8, 150); ctx.lineTo(0, 170); ctx.closePath(); ctx.fill();
    ctx.restore();
}

// ---- ornamental divider -------------------------------------------------------------------
function divider(ctx, cx, y, half) {
    ctx.save();
    const l = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
    l.addColorStop(0, 'rgba(212,175,55,0)'); l.addColorStop(.22, GOLD); l.addColorStop(.78, GOLD); l.addColorStop(1, 'rgba(212,175,55,0)');
    ctx.strokeStyle = l; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(cx - half, y); ctx.lineTo(cx - 40, y); ctx.moveTo(cx + 40, y); ctx.lineTo(cx + half, y); ctx.stroke();
    // thin second line + side dots
    ctx.lineWidth = 1; ctx.globalAlpha = .55;
    ctx.beginPath(); ctx.moveTo(cx - half * .72, y + 8); ctx.lineTo(cx - 52, y + 8); ctx.moveTo(cx + 52, y + 8); ctx.lineTo(cx + half * .72, y + 8); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = GOLD_SOFT;
    [-30, 30].forEach(function (dx) { ctx.beginPath(); ctx.arc(cx + dx, y, 3.2, 0, Math.PI * 2); ctx.fill(); });
    ctx.shadowColor = 'rgba(245,215,110,.7)'; ctx.shadowBlur = 12;
    ctx.fillStyle = goldGrad(ctx, cx - 14, y - 14, cx + 14, y + 14); diamond(ctx, cx, y, 14); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#06301f'; diamond(ctx, cx, y, 5); ctx.fill();
    ctx.restore();
}

// ---- champagne-gold title text (design only; the caller supplies the text) -------------
function title(ctx, text, x, y, size, font) {
    ctx.save();
    ctx.font = '700 ' + size + 'px ' + (font || FONT); ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4;
    const g = ctx.createLinearGradient(0, y - size * .85, 0, y + size * .2);
    g.addColorStop(0, '#ffffff'); g.addColorStop(.55, '#fff3cf'); g.addColorStop(1, '#ecd08a');
    ctx.fillStyle = g; ctx.fillText(text, x, y);
    ctx.restore();
}

// letter-spaced Latin line (falls back to normal spacing where canvas letterSpacing is missing)
function spaced(ctx, text, x, y, px) {
    ctx.save();
    if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px';
    ctx.textAlign = 'center'; ctx.fillText(text, x + ('letterSpacing' in ctx ? px / 2 : 0), y);
    ctx.restore();
}

// ---- glass panel ------------------------------------------------------------------------------
function panel(ctx, x, y, w, h, r) {
    r = r || 28;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.40)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    rrect(ctx, x, y, w, h, r);
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, 'rgba(255,255,255,.16)'); g.addColorStop(.5, 'rgba(255,255,255,.07)'); g.addColorStop(1, 'rgba(255,255,255,.04)');
    ctx.fillStyle = g; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = goldGrad(ctx, x, y, x + w, y + h); ctx.lineWidth = 2.4; ctx.stroke();
    // inner highlight along the top edge
    rrect(ctx, x + 3, y + 3, w - 6, h - 6, r - 3);
    const hl = ctx.createLinearGradient(x, y, x, y + h * .5);
    hl.addColorStop(0, 'rgba(255,245,210,.30)'); hl.addColorStop(1, 'rgba(255,245,210,0)');
    ctx.strokeStyle = hl; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
}

// ---- vector icons inside a round badge ------------------------------------------------------------
function badge(ctx, cx, cy, r) {
    ctx.save();
    const g = ctx.createRadialGradient(cx - r * .3, cy - r * .3, 2, cx, cy, r);
    g.addColorStop(0, 'rgba(255,232,150,.28)'); g.addColorStop(1, 'rgba(212,175,55,.08)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = goldGrad(ctx, cx - r, cy - r, cx + r, cy + r); ctx.lineWidth = 2.6; ctx.stroke();
    ctx.strokeStyle = 'rgba(241,215,122,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, r - 6, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
}
function icon(ctx, kind, cx, cy, r) {
    badge(ctx, cx, cy, r);
    ctx.save(); ctx.strokeStyle = GOLD_SOFT; ctx.fillStyle = GOLD_SOFT; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const k = r / 34;
    if (kind === 'date') {
        rrect(ctx, cx - 17 * k, cy - 14 * k, 34 * k, 31 * k, 5 * k); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 17 * k, cy - 4 * k); ctx.lineTo(cx + 17 * k, cy - 4 * k);
        ctx.moveTo(cx - 8 * k, cy - 19 * k); ctx.lineTo(cx - 8 * k, cy - 10 * k); ctx.moveTo(cx + 8 * k, cy - 19 * k); ctx.lineTo(cx + 8 * k, cy - 10 * k); ctx.stroke();
        [[-8, 4], [0, 4], [8, 4], [-8, 11], [0, 11]].forEach(function (d) { ctx.beginPath(); ctx.arc(cx + d[0] * k, cy + d[1] * k, 1.9 * k, 0, Math.PI * 2); ctx.fill(); });
    } else if (kind === 'time') {
        ctx.beginPath(); ctx.arc(cx, cy, 18 * k, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - 10 * k); ctx.lineTo(cx, cy); ctx.lineTo(cx + 8 * k, cy + 5 * k); ctx.stroke();
    } else {   // place pin
        ctx.beginPath(); ctx.moveTo(cx, cy + 19 * k);
        ctx.bezierCurveTo(cx - 20 * k, cy - 2 * k, cx - 15 * k, cy - 20 * k, cx, cy - 20 * k);
        ctx.bezierCurveTo(cx + 15 * k, cy - 20 * k, cx + 20 * k, cy - 2 * k, cx, cy + 19 * k); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy - 6 * k, 5.5 * k, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
}

// ---- progress ring with day ticks ----------------------------------------------------------------------
function ring(ctx, cx, cy, r, p) {
    p = Math.max(0, Math.min(1, p || 0));
    ctx.save(); ctx.lineCap = 'round';
    // inner disc
    const d = ctx.createRadialGradient(cx, cy - r * .3, 4, cx, cy, r);
    d.addColorStop(0, 'rgba(255,255,255,.10)'); d.addColorStop(1, 'rgba(0,20,14,.40)');
    ctx.fillStyle = d; ctx.beginPath(); ctx.arc(cx, cy, r - 9, 0, Math.PI * 2); ctx.fill();
    // day ticks (30), lit up to the progress
    for (let i = 0; i < 30; i++) {
        const a = -Math.PI / 2 + i * Math.PI * 2 / 30, lit = (i + 1) / 30 <= p + 1e-6, r0 = r + 15, r1 = r + (i % 5 === 4 ? 27 : 22);
        ctx.strokeStyle = lit ? 'rgba(245,217,120,.95)' : 'rgba(255,255,255,.20)'; ctx.lineWidth = lit ? 3 : 2;
        ctx.beginPath(); ctx.moveTo(cx + r0 * Math.cos(a), cy + r0 * Math.sin(a)); ctx.lineTo(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a)); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 18; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    if (p > 0) {
        ctx.shadowColor = 'rgba(245,215,110,.7)'; ctx.shadowBlur = 22;
        ctx.strokeStyle = goldGrad(ctx, cx - r, cy - r, cx + r, cy + r); ctx.lineWidth = 18;
        ctx.beginPath();
        if (p >= .999) ctx.arc(cx, cy, r, 0, Math.PI * 2);            // full ring (a 2π sweep can draw nothing on some engines)
        else ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
        ctx.stroke();
        if (p < .999) {   // bright end cap
            const ea = -Math.PI / 2 + Math.PI * 2 * p; ctx.shadowBlur = 16; ctx.fillStyle = '#fff6d2';
            ctx.beginPath(); ctx.arc(cx + r * Math.cos(ea), cy + r * Math.sin(ea), 5, 0, Math.PI * 2); ctx.fill();
        }
    }
    ctx.restore();
}

// small row of stars for the card footer
function footer(ctx, cx, y) {
    ctx.save();
    [-2, -1, 0, 1, 2].forEach(function (i) {
        const s = i === 0 ? 11 : (Math.abs(i) === 1 ? 7 : 4);
        ctx.fillStyle = i === 0 ? GOLD_SOFT : 'rgba(241,215,122,.7)'; starPath(ctx, cx + i * 40, y, s, s * .48, 8); ctx.fill();
    });
    ctx.restore();
}

// top-of-card scene shared by both cards: lanterns + arch
function scene(ctx, archTop, archBottom, archW) {
    lantern(ctx, 178, 70, 64, .84);
    lantern(ctx, W - 178, 70, 126, .96);
    arch(ctx, W / 2, archTop, archBottom, archW);
}


// ============================================================================
// NIGHT-CARAVAN THEME (v201) — a deep-blue night sky, white crescent + star, a camel
// caravan and palms in silhouette, tan-gold lettering. Pure vector drawing, no text.
// ============================================================================
const TAN = '#c9a95f', TAN_LIGHT = '#e6cf8f';
let _nbg = null;
function makeNightBg() {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0a1a3d'); g.addColorStop(.35, '#16306b'); g.addColorStop(.65, '#3f5fb0'); g.addColorStop(.88, '#6e86cf'); g.addColorStop(1, '#8aa0dc');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // soft waves
    [[560, .10], [700, .09], [840, .08]].forEach(function (w, i) {
        x.fillStyle = 'rgba(150,175,245,' + w[1] + ')';
        x.beginPath(); x.moveTo(-20, w[0] + 60); x.bezierCurveTo(260, w[0] - 120 + i * 30, 520, w[0] + 180, W + 20, w[0] - 60 - i * 40); x.lineTo(W + 20, H); x.lineTo(-20, H); x.closePath(); x.fill();
    });
    // clouds
    function cloud(cx, cy, sc, a) {
        [[0, 0, 150], [-110, 24, 110], [120, 20, 120], [-40, -26, 100], [60, -22, 90]].forEach(function (b) {
            const r = x.createRadialGradient(cx + b[0] * sc, cy + b[1] * sc, 4, cx + b[0] * sc, cy + b[1] * sc, b[2] * sc);
            r.addColorStop(0, 'rgba(200,212,240,' + a + ')'); r.addColorStop(1, 'rgba(200,212,240,0)');
            x.fillStyle = r; x.beginPath(); x.arc(cx + b[0] * sc, cy + b[1] * sc, b[2] * sc, 0, Math.PI * 2); x.fill();
        });
    }
    cloud(900, 90, 1.25, .30); cloud(120, 30, .8, .18); cloud(170, 1090, 1.2, .34); cloud(620, 1130, .8, .18);
    // stars
    const R = rng(2026);
    for (let i = 0; i < 70; i++) {
        const px = R() * W, py = R() * 900, pr = .8 + R() * 2.6;
        x.fillStyle = 'rgba(235,240,255,' + (.25 + R() * .6).toFixed(2) + ')';
        x.beginPath(); x.arc(px, py, pr, 0, Math.PI * 2); x.fill();
    }
    // vignette
    const v = x.createRadialGradient(W / 2, H * .4, H * .25, W / 2, H * .45, H * .85);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(2,8,28,.45)');
    x.fillStyle = v; x.fillRect(0, 0, W, H);
    return c;
}
function leaf(ctx, a, len, wd) {
    ctx.save(); ctx.rotate(a); if (Math.cos(a) < 0) ctx.scale(1, -1);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * .55, -len * .32 - wd, len, len * .16);
    ctx.quadraticCurveTo(len * .55, -len * .10 + wd * .2, 0, 0); ctx.fill(); ctx.restore();
}
function palm(ctx, x, y, h, lean, s) {
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x - 10 * s, y);
    ctx.quadraticCurveTo(x + lean * .15, y - h * .55, x + lean - 3 * s, y - h);
    ctx.lineTo(x + lean + 3 * s, y - h);
    ctx.quadraticCurveTo(x + lean * .15 + 14 * s, y - h * .55, x + 10 * s, y); ctx.closePath(); ctx.fill();
    ctx.translate(x + lean, y - h);
    [-172, -150, -128, -104, -80, -56, -30, -8, 20, 160, 190].forEach(function (d) { leaf(ctx, d * Math.PI / 180, (96 + ((d * 7) % 24)) * s, 10 * s); });
    ctx.beginPath(); ctx.arc(0, 4 * s, 9 * s, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}
function camel(ctx, x, y, s, flip) {      // ground line at y, nose toward +x (or -x when flip)
    ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
    // legs (two pairs, slightly offset = walking)
    function leg(x0, x1, bend) {
        ctx.beginPath(); ctx.moveTo(x0 - 6, -78); ctx.lineTo(x0 + 6, -78);
        ctx.quadraticCurveTo(x1 + 7 + bend, -40, x1 + 4, -4); ctx.lineTo(x1 - 4, -4);
        ctx.quadraticCurveTo(x1 - 6 + bend, -42, x0 - 6, -78); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x1, -3, 8, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    }
    leg(46, 38, -6); leg(60, 70, 6); leg(142, 134, -4); leg(156, 168, 6);
    // body + rump + hump
    ctx.beginPath(); ctx.moveTo(28, -92);
    ctx.bezierCurveTo(30, -116, 64, -118, 76, -104);                       // rump → hump rise
    ctx.bezierCurveTo(82, -130, 108, -132, 118, -108);                      // hump
    ctx.bezierCurveTo(130, -108, 150, -112, 168, -104);                     // back toward neck
    ctx.bezierCurveTo(190, -118, 200, -150, 212, -172);                     // neck up
    ctx.bezierCurveTo(218, -182, 230, -184, 246, -176);                     // head top
    ctx.bezierCurveTo(254, -172, 254, -166, 246, -164);                     // nose
    ctx.bezierCurveTo(236, -162, 228, -162, 222, -156);                     // jaw
    ctx.bezierCurveTo(212, -136, 204, -104, 184, -80);                      // throat down
    ctx.bezierCurveTo(150, -66, 90, -62, 44, -68);                          // belly
    ctx.bezierCurveTo(26, -72, 22, -82, 28, -92); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(228, -178, 6, 10, -.6, 0, Math.PI * 2); ctx.fill();   // ear
    ctx.lineWidth = 3; ctx.strokeStyle = ctx.fillStyle; ctx.beginPath(); ctx.moveTo(30, -88); ctx.quadraticCurveTo(12, -70, 20, -44); ctx.stroke();   // tail
    ctx.restore();
}
function walker(ctx, x, y, s) {           // person walking, robe + head
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-13, -48); ctx.quadraticCurveTo(-16, -74, -3, -78);
    ctx.lineTo(5, -78); ctx.quadraticCurveTo(15, -72, 13, -48); ctx.lineTo(10, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(1, -90, 9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}
function rider(ctx, x, y, s) {            // person seated on a hump (x,y = hump top)
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(-14, 2); ctx.quadraticCurveTo(-16, -30, -4, -34); ctx.lineTo(6, -34); ctx.quadraticCurveTo(16, -28, 14, 2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -44, 9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}
function nightBase(ctx) {
    if (!_nbg) _nbg = makeNightBg();
    ctx.drawImage(_nbg, 0, 0);
}
// white crescent with a star (the reference style), centred at (cx,cy)
function whiteCrescent(ctx, cx, cy, R) {
    ctx.save();
    const halo = ctx.createRadialGradient(cx, cy, R * .4, cx, cy, R * 2.2);
    halo.addColorStop(0, 'rgba(235,242,255,.30)'); halo.addColorStop(1, 'rgba(235,242,255,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, R * 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.rect(cx - R * 2, cy - R * 2, R * 4, R * 4);
    ctx.arc(cx + R * .42, cy - R * .10, R * .86, 0, Math.PI * 2, true);
    ctx.clip('evenodd');
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.shadowColor = 'rgba(255,255,255,.8)'; ctx.shadowBlur = 16; ctx.fillStyle = '#ffffff';
    starPath(ctx, cx + R * .50, cy + R * .02, R * .30, R * .125, 5); ctx.fill();
    ctx.restore();
}
// ground, dune, caravan and palms along the bottom edge (everything black)
function nightGround(ctx) {
    ctx.save();
    ctx.fillStyle = '#04060f';
    // palms behind the dune (right side)
    palm(ctx, 985, 1255, 232, -30, .95); palm(ctx, 1062, 1262, 130, -20, .58);
    camel(ctx, 70, 1196, .78, false);
    walker(ctx, 300, 1190, .9);
    camel(ctx, 360, 1222, .9, false); rider(ctx, 446, 1112, .9);
    // reins
    ctx.strokeStyle = 'rgba(4,6,15,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(268, 1124); ctx.quadraticCurveTo(284, 1150, 306, 1124); ctx.stroke();
    // dune
    ctx.beginPath(); ctx.moveTo(-10, 1222); ctx.bezierCurveTo(240, 1170, 520, 1230, 800, 1262); ctx.bezierCurveTo(920, 1276, 1000, 1268, 1090, 1250);
    ctx.lineTo(1090, H + 10); ctx.lineTo(-10, H + 10); ctx.closePath(); ctx.fill();
    ctx.restore();
}
// translucent navy glass panel with a light border (night theme)
function nightPanel(ctx, x, y, w, h, r) {
    r = r || 28; ctx.save();
    ctx.shadowColor = 'rgba(0,8,30,.45)'; ctx.shadowBlur = 28; ctx.shadowOffsetY = 10;
    rrect(ctx, x, y, w, h, r);
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, 'rgba(20,40,100,.62)'); g.addColorStop(1, 'rgba(14,30,80,.50)');
    ctx.fillStyle = g; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
}
// gold diamonds row (like the dots under the lettering in the reference)
function diamonds(ctx, cx, y, n, gap, r) {
    ctx.save(); ctx.fillStyle = TAN;
    for (let i = 0; i < n; i++) { diamond(ctx, cx + (i - (n - 1) / 2) * gap, y, r); ctx.fill(); }
    ctx.restore();
}
// white pill with navy text and two white lines either side (caller passes the text)
function pill(ctx, cx, cy, text, font, maxHalf) {
    ctx.save(); ctx.font = font;
    const tw = Math.min(ctx.measureText(text).width, 560), pw = tw + 56, ph = 62;
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - pw / 2 - 30, cy); ctx.lineTo(cx - pw / 2 - 30 - Math.max(40, maxHalf - pw / 2 - 30), cy);
    ctx.moveTo(cx + pw / 2 + 30, cy); ctx.lineTo(cx + pw / 2 + 30 + Math.max(40, maxHalf - pw / 2 - 30), cy); ctx.stroke();
    rrect(ctx, cx - pw / 2, cy - ph / 2, pw, ph, 14); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.fillStyle = '#1b2f6b'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(text, cx, cy + 16, 560);
    ctx.restore();
}


// ============================================================================
// CREAM-LANTERN THEME (v202) — cream paper, hanging crescents / flowers / lanterns,
// green mosque corners with stepped gold outlines, gold fan, deep-green lettering.
// Pure vector drawing, no text.
// ============================================================================
const CR = { paper: '#fdf9df', paper2: '#f9f2cf', green: '#38723f', green2: '#69ab76', gold: '#f0b82e', gold2: '#fdd57a', copper: '#d9a05b', ink: '#25301f' };
function creamBase(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#fffbe4'); g.addColorStop(1, CR.paper2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const r = ctx.createRadialGradient(W / 2, H * .5, 80, W / 2, H * .5, H * .75);
    r.addColorStop(0, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(210,190,120,.12)');
    ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
}
function outline(ctx, w) { ctx.strokeStyle = CR.ink; ctx.lineWidth = w || 3; ctx.lineJoin = 'round'; ctx.stroke(); }
function creamCrescent(ctx, cx, cy, R, rot) {      // gold crescent with an ink outline, opening toward the direction `rot`
    const r = R * .78, D = R * .42, a = rot || 0;
    const dx = D * Math.cos(a), dy = D * Math.sin(a);
    const phi = a, dl = Math.acos((R * R + D * D - r * r) / (2 * R * D));
    ctx.save(); ctx.translate(cx, cy);
    ctx.beginPath(); ctx.arc(0, 0, R, phi + dl, phi - dl + Math.PI * 2, false);
    const bx = R * Math.cos(phi - dl), by = R * Math.sin(phi - dl), ax = R * Math.cos(phi + dl), ay = R * Math.sin(phi + dl);
    ctx.arc(dx, dy, r, Math.atan2(by - dy, bx - dx), Math.atan2(ay - dy, ax - dx), true);
    ctx.closePath(); ctx.fillStyle = CR.gold; ctx.fill(); outline(ctx, 3.2);
    ctx.restore();
}
function creamStar(ctx, x, y, R) { starPath(ctx, x, y, R, R * .45, 5); ctx.fillStyle = CR.gold; ctx.fill(); outline(ctx, 2.2); }
function creamFlower(ctx, x, y, R) {
    ctx.save(); ctx.translate(x, y);
    for (let i = 0; i < 8; i++) {
        ctx.save(); ctx.rotate(i * Math.PI / 4);
        ctx.beginPath(); ctx.ellipse(0, -R * .62, R * .24, R * .42, 0, 0, Math.PI * 2); ctx.fillStyle = CR.green2; ctx.fill(); outline(ctx, 2.2);
        ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, R * .3, 0, Math.PI * 2); ctx.fillStyle = CR.gold; ctx.fill(); outline(ctx, 2.2);
    ctx.restore();
}
function creamMiniLantern(ctx, x, top, s) {          // thread ends at `top`; lantern hangs from there
    ctx.save(); ctx.translate(x, top); ctx.scale(s, s);
    ctx.beginPath(); ctx.arc(0, 8, 8, 0, Math.PI * 2); ctx.fillStyle = CR.paper; ctx.fill(); outline(ctx, 2.4);
    ctx.beginPath(); ctx.moveTo(-9, 17); ctx.lineTo(9, 17); ctx.lineTo(30, 38); ctx.lineTo(-30, 38); ctx.closePath(); ctx.fillStyle = CR.green2; ctx.fill(); outline(ctx, 2.4);
    ctx.beginPath(); ctx.moveTo(-30, 38); ctx.lineTo(30, 38); ctx.lineTo(24, 82); ctx.lineTo(-24, 82); ctx.closePath(); ctx.fillStyle = CR.gold; ctx.fill(); outline(ctx, 2.4);
    ctx.beginPath(); ctx.moveTo(-10, 40); ctx.lineTo(10, 40); ctx.lineTo(8, 80); ctx.lineTo(-8, 80); ctx.closePath(); ctx.fillStyle = CR.green2; ctx.fill(); outline(ctx, 1.8);
    ctx.beginPath(); ctx.moveTo(-24, 82); ctx.lineTo(24, 82); ctx.lineTo(14, 96); ctx.lineTo(-14, 96); ctx.closePath(); ctx.fillStyle = CR.green2; ctx.fill(); outline(ctx, 2.4);
    ctx.restore();
}
function creamBigLantern(ctx, cx, top, w, h) {       // ornate copper lantern with green glass, crescent finial
    ctx.save(); ctx.translate(cx, top); ctx.scale(w / 160, h / 270);
    // finial crescent
    creamCrescent(ctx, 18, 14, 30, -2.2);
    // dome
    ctx.beginPath(); ctx.moveTo(-76, 112); ctx.bezierCurveTo(-76, 56, -50, 24, 0, 22); ctx.bezierCurveTo(50, 24, 76, 56, 76, 112); ctx.closePath();
    const dg = ctx.createLinearGradient(-76, 20, 76, 112); dg.addColorStop(0, '#e9b673'); dg.addColorStop(1, '#c98a45'); ctx.fillStyle = dg; ctx.fill(); outline(ctx, 3);
    ctx.beginPath(); ctx.moveTo(-70, 98); for (let i = 0; i < 5; i++) ctx.quadraticCurveTo(-70 + 28 * i + 14, 80, -70 + 28 * (i + 1), 98); ctx.strokeStyle = '#8a5a22'; ctx.lineWidth = 2.5; ctx.stroke();
    [[-34, 60], [0, 46], [34, 60]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, Math.PI * 2); ctx.fillStyle = '#f5d9a8'; ctx.fill(); ctx.strokeStyle = '#8a5a22'; ctx.lineWidth = 1.5; ctx.stroke(); });
    // top rim
    rrect(ctx, -82, 112, 164, 16, 4); ctx.fillStyle = '#d29a55'; ctx.fill(); outline(ctx, 3);
    // body frame + glass
    rrect(ctx, -76, 128, 152, 118, 6); ctx.fillStyle = '#c98a45'; ctx.fill(); outline(ctx, 3);
    [[-68, 44], [-22, 44], [24, 44]].forEach(function (p) {
        const x = p[0], wdt = p[1];
        ctx.beginPath(); ctx.moveTo(x, 242); ctx.lineTo(x, 150); ctx.quadraticCurveTo(x + wdt * .25, 136, x + wdt * .5, 150); ctx.quadraticCurveTo(x + wdt * .75, 164, x + wdt, 150); ctx.lineTo(x + wdt, 242); ctx.closePath();
        const gg = ctx.createLinearGradient(x, 150, x + wdt, 242); gg.addColorStop(0, '#6fd3a6'); gg.addColorStop(.5, '#2fbf8a'); gg.addColorStop(1, '#1ea67a');
        ctx.fillStyle = gg; ctx.fill(); outline(ctx, 2.4);
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 6, 190); ctx.quadraticCurveTo(x + wdt * .5, 182, x + wdt - 6, 192); ctx.stroke();
    });
    // base
    rrect(ctx, -82, 246, 164, 14, 4); ctx.fillStyle = '#d29a55'; ctx.fill(); outline(ctx, 3);
    rrect(ctx, -72, 260, 144, 10, 3); ctx.fillStyle = '#b97a38'; ctx.fill(); outline(ctx, 2.6);
    ctx.restore();
}
function creamTop(ctx) {
    ctx.save(); ctx.lineCap = 'round';
    [1, -1].forEach(function (sd) {
        const X = function (x) { return sd === 1 ? x : W - x; };
        // garland swag
        ctx.strokeStyle = CR.ink; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(X(300), -4); ctx.quadraticCurveTo(X(250), 108, X(0), 92); ctx.stroke();
        // flower + thread + crescent
        ctx.beginPath(); ctx.moveTo(X(112), 60); ctx.lineTo(X(112), 214); ctx.stroke();
        creamFlower(ctx, X(112), 36, 34);
        creamCrescent(ctx, X(116), 272, 60, sd === 1 ? -.55 : Math.PI + .55);
        // stars
        creamStar(ctx, X(236), 120, 16); creamStar(ctx, X(10), 176, 14);
        // mini lantern
        ctx.beginPath(); ctx.moveTo(X(316), 0); ctx.lineTo(X(316), 148); ctx.stroke();
        creamMiniLantern(ctx, X(316), 148, .72);
    });
    ctx.strokeStyle = CR.ink; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(W / 2, -4); ctx.lineTo(W / 2, 6); ctx.stroke();
    creamBigLantern(ctx, W / 2, 14, 184, 290);
    ctx.restore();
}
function mosqueCorner(ctx, sd) {
    const X = function (x) { return sd === 1 ? x : W - x; };
    const pts = [[0, 1108], [64, 1134], [100, 1172], [158, 1192], [196, 1230], [250, 1250], [256, 1284], [284, 1310], [290, 1336], [304, 1350]];
    function path(dx, dy) {
        ctx.beginPath(); ctx.moveTo(X(-10 + dx), 1108 + dy);
        pts.forEach(function (p, i) { if (i) ctx.lineTo(X(p[0] + dx), p[1] + dy); });
        ctx.lineTo(X(-10 + dx), 1350 + dy); ctx.closePath();
    }
    ctx.save(); ctx.lineJoin = 'round';
    ctx.strokeStyle = CR.gold; ctx.lineWidth = 3; path(14, -14); ctx.stroke(); path(26, -26); ctx.globalAlpha = .55; ctx.stroke(); ctx.globalAlpha = 1;
    path(0, 0); ctx.fillStyle = CR.green2; ctx.fill();
    // little twinkles on the green
    ctx.fillStyle = CR.gold; [[150, 1236], [214, 1280], [60, 1190]].forEach(function (p) { starPath(ctx, X(p[0]), p[1], 6, 2.6, 4); ctx.fill(); });
    // mosque: dome, crescent finial, body with arched windows
    const mx = X(46);
    ctx.beginPath(); ctx.arc(mx, 1236, 56, Math.PI, 0); ctx.closePath(); ctx.fillStyle = CR.gold2; ctx.fill();
    ctx.beginPath(); ctx.moveTo(mx - 56, 1236); ctx.lineTo(mx + 56, 1236); ctx.lineTo(mx + 56, 1350); ctx.lineTo(mx - 56, 1350); ctx.closePath(); ctx.fillStyle = '#efb867'; ctx.fill();
    creamCrescent(ctx, mx, 1160, 16, sd === 1 ? -.3 : Math.PI + .3);
    ctx.fillStyle = CR.green2;
    [-34, 0, 34].forEach(function (o) { ctx.beginPath(); ctx.moveTo(mx + o - 11, 1350); ctx.lineTo(mx + o - 11, 1290); ctx.arc(mx + o, 1290, 11, Math.PI, 0); ctx.lineTo(mx + o + 11, 1350); ctx.closePath(); ctx.fill(); });
    ctx.restore();
}
function creamFan(ctx, cx, cy) {
    ctx.save(); ctx.strokeStyle = CR.gold; ctx.fillStyle = CR.paper; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const n = 17;
    for (let i = 0; i < n; i++) {
        const a = Math.PI + .14 + i * (Math.PI - .28) / (n - 1), c = Math.cos(a), sn = Math.sin(a);
        ctx.beginPath(); ctx.moveTo(cx + 22 * c, cy + 22 * sn); ctx.lineTo(cx + 96 * c, cy + 96 * sn); ctx.stroke();
        // leaf tip
        ctx.save(); ctx.translate(cx + 96 * c, cy + 96 * sn); ctx.rotate(a + Math.PI / 2);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-9, -8); ctx.lineTo(-7, -30); ctx.lineTo(0, -38); ctx.lineTo(7, -30); ctx.lineTo(9, -8); ctx.closePath(); ctx.fillStyle = CR.paper; ctx.fill(); ctx.stroke();
        ctx.restore();
    }
    ctx.beginPath(); ctx.arc(cx, cy, 30, Math.PI, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, 62, Math.PI + .1, -.1); ctx.stroke();
    ctx.restore();
}
function creamBottom(ctx) { mosqueCorner(ctx, 1); mosqueCorner(ctx, -1); creamFan(ctx, W / 2, 1362); }
function creamPanel(ctx, x, y, w, h, r) {
    r = r || 28; ctx.save();
    ctx.shadowColor = 'rgba(56,114,63,.22)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8;
    rrect(ctx, x, y, w, h, r); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = CR.green2; ctx.lineWidth = 2.6; ctx.stroke();
    rrect(ctx, x + 6, y + 6, w - 12, h - 12, r - 6); ctx.strokeStyle = 'rgba(240,184,46,.55)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
}
function creamRing(ctx, cx, cy, r, p) {
    p = Math.max(0, Math.min(1, p || 0)); ctx.save(); ctx.lineCap = 'round';
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(cx, cy, r - 9, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 30; i++) {
        const a = -Math.PI / 2 + i * Math.PI * 2 / 30, lit = (i + 1) / 30 <= p + 1e-6, r0 = r + 15, r1 = r + (i % 5 === 4 ? 27 : 22);
        ctx.strokeStyle = lit ? CR.gold : 'rgba(56,114,63,.28)'; ctx.lineWidth = lit ? 3 : 2;
        ctx.beginPath(); ctx.moveTo(cx + r0 * Math.cos(a), cy + r0 * Math.sin(a)); ctx.lineTo(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a)); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(56,114,63,.16)'; ctx.lineWidth = 18; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    if (p > 0) {
        ctx.strokeStyle = CR.gold; ctx.lineWidth = 18; ctx.beginPath();
        if (p >= .999) ctx.arc(cx, cy, r, 0, Math.PI * 2); else ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
        ctx.stroke();
    }
    ctx.restore();
}

window._rcArt = { W: W, H: H, GOLD: GOLD, GOLD_SOFT: GOLD_SOFT, CHAMP: CHAMP, FONT: FONT, DISPLAY: DISPLAY, ready: ready,
    goldGrad: goldGrad, rrect: rrect, base: base, scene: scene, crescent: crescent, arch: arch, lantern: lantern, divider: divider,
    title: title, spaced: spaced, TAN: TAN, TAN_LIGHT: TAN_LIGHT, nightBase: nightBase, nightGround: nightGround, nightPanel: nightPanel, whiteCrescent: whiteCrescent, diamonds: diamonds, pill: pill, sparkle2: sparkle, CR: CR, creamBase: creamBase, creamTop: creamTop, creamBottom: creamBottom, creamPanel: creamPanel, creamRing: creamRing, creamCrescent: creamCrescent, panel: panel, icon: icon, ring: ring, footer: footer, starPath: starPath, sparkle: sparkle };
})();
