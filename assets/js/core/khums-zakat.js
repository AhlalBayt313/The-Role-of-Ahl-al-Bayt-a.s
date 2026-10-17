// ============================================================================
// PAGE: KHUMS & ZAKAT CALCULATOR  (v120)
// ----------------------------------------------------------------------------
// Page key : 'khumsZakat'  (?page=khumsZakat)
// Loads    : after editor-modal.js, before script-4-boot.js (whose
//            renderMainContent() page map references renderKhumsZakatPage()).
// Needs    : state, lsGet/lsSet, escapeHtml, toBengaliDigits, shareContent,
//            showToast (all from script-1-core.js — loaded earlier).
//
// Tabs
//   1. Khums          — 20% of the yearly surplus (arbah al-makasib), with the
//                       Sahm-e-Imam / Sahm-e-Sadat split.
//   2. Zakat (9 items)— Shia fiqh: wheat, barley, dates, raisins, gold, silver,
//                       camels, cows, sheep. Crops/gold/silver are computed;
//                       livestock shows nisab + first-nisab dues only.
//   3. General Zakat  — 2.5% of net wealth above the nisab (the commonly used
//                       method in other madhhabs; mustahab for trade goods in
//                       Shia fiqh).
//
// Design notes
//   * Inputs are typed into <input> fields, so the page must NOT call render()
//     on each keystroke (it would rebuild the DOM and drop focus). Instead a
//     delegated 'input' listener updates module state and refreshes only the
//     #kz-result block.
//   * All inputs persist in one localStorage key (KZ_KEY). Values are
//     whitelisted on load, so nothing user-controlled reaches innerHTML.
//   * Figures are indicative: nisab / conditions differ slightly between
//     marajiʿ — the page says so.
// ============================================================================

const KZ_KEY = 'ahlbayt_khums_zakat';
const KZ_CURS = ['৳', '$', '£', '€', '₹', '﷼', 'AED', 'RM'];
const KZ_TABS = ['khums', 'zakat', 'general'];
const KZ_SUBS = ['crop', 'gold', 'silver', 'cattle', 'fitra'];
const KZ_FKINDS = ['rice', 'wheat', 'barley', 'dates', 'raisins', 'corn'];
const KZ_CROPS = ['wheat', 'barley', 'dates', 'raisins', 'rice'];
const KZ_IRRIG = ['natural', 'artificial', 'mixed'];

// Nisab constants (indicative; shar'i mithqal = 18 nakhud = 3.456 g, common mithqal = 4.608 g)
const KZ_CROP_NISAB_KG = 847.207;   // 288 mann Tabriz − 45 mithqal = 847.207 kg (Ayatollah Khamenei, Tawdih al-Masail ruling 1864; v166: was 847)
const KZ_GOLD_NISAB_G = 69.12;      // 20 dinar = 15 common mithqal
const KZ_GOLD_STEP_G = 13.824;      // each further 4 shar'i mithqal
const KZ_SILVER_NISAB_G = 483.84;   // 105 common mithqal
const KZ_SILVER_STEP_G = 96.768;    // each further 21 common mithqal
const KZ_GEN_GOLD_NISAB_G = 87.48;  // 7.5 tola (commonly used)
const KZ_GEN_SILVER_NISAB_G = 612.36; // 52.5 tola (commonly used)
// Bangladesh local units
const KZ_BHORI_G = 11.664;          // ১ ভরি = ১৬ আনা = ৯৬ রতি = ১১.৬৬৪ গ্রাম (সোনা-রুপার প্রচলিত মাপ)
const KZ_MON_KG = 37.3242;          // ১ মণ = ৪০ সের = ৩৭.৩২৪২ কেজি
const KZ_METAL_UNITS = ['g', 'bhori'];
const KZ_CROP_UNITS = ['kg', 'mon'];
const KZ_PKINDS = ['imam', 'sadat', 'zakat', 'other'];
const KZ_YTYPES = ['solar', 'lunar'];
const KZ_MAX_PAYS = 60;

let kzState = null;

function kzDefault() {
    return {
        tab: 'khums', zsub: 'crop', cur: '৳', unit: 'g', cunit: 'kg', year: { start: '', type: 'solar' }, pf: { d: '', a: '', k: 'imam', n: '' }, pays: [],
        khums:  { income: '', costs: '', living: '', other: '', paid: '' },
        crop:   { kind: 'wheat', kg: '', irrig: 'natural' },
        gold:   { g: '' },
        silver: { g: '' },
        fit:    { people: '1', kg: '3', price: '', kind: 'rice' },
        gen:    { cash: '', goldG: '', goldP: '', silverG: '', silverP: '', goods: '', recv: '', debts: '' }
    };
}

// Keep only characters a number field can legitimately contain (Latin/Bengali/Arabic-Indic digits, separators).
function kzCleanNum(v) {
    return String(v == null ? '' : v).replace(/[^0-9.,\u09E6-\u09EF\u0660-\u0669\u066B\u066C ]/g, '').slice(0, 24);
}

function kzLoad() {
    const d = kzDefault();
    let s = null;
    try { s = lsGet(KZ_KEY, null); } catch (e) { s = null; }
    if (!s || typeof s !== 'object') return d;
    if (KZ_TABS.indexOf(s.tab) > -1) d.tab = s.tab;
    if (KZ_SUBS.indexOf(s.zsub) > -1) d.zsub = s.zsub;
    if (KZ_CURS.indexOf(s.cur) > -1) d.cur = s.cur;
    if (KZ_METAL_UNITS.indexOf(s.unit) > -1) d.unit = s.unit;
    if (KZ_CROP_UNITS.indexOf(s.cunit) > -1) d.cunit = s.cunit;
    if (s.year && typeof s.year === 'object') {
        if (typeof s.year.start === 'string' && (s.year.start === '' || kzIsDate(s.year.start))) d.year.start = s.year.start;
        if (KZ_YTYPES.indexOf(s.year.type) > -1) d.year.type = s.year.type;
    }
    if (s.pf && typeof s.pf === 'object') {
        if (typeof s.pf.d === 'string' && (s.pf.d === '' || kzIsDate(s.pf.d))) d.pf.d = s.pf.d;
        if (typeof s.pf.a === 'string') d.pf.a = kzCleanNum(s.pf.a);
        if (KZ_PKINDS.indexOf(s.pf.k) > -1) d.pf.k = s.pf.k;
        if (typeof s.pf.n === 'string') d.pf.n = s.pf.n.replace(/[<>]/g, '').slice(0, 40);
    }
    if (Array.isArray(s.pays)) {
        d.pays = s.pays.slice(0, KZ_MAX_PAYS).filter(p => p && typeof p === 'object' && typeof p.d === 'string' && kzIsDate(p.d) && typeof p.a === 'string' && kzNum(p.a) > 0 && KZ_PKINDS.indexOf(p.k) > -1)
            .map(p => ({ i: String(p.i || '').replace(/[^a-z0-9]/gi, '').slice(0, 16) || Math.random().toString(36).slice(2, 10), d: p.d, a: kzCleanNum(p.a), k: p.k, c: KZ_CURS.indexOf(p.c) > -1 ? p.c : '\u09f3', n: typeof p.n === 'string' ? p.n.replace(/[<>]/g, '').slice(0, 40) : '' }));
    }
    ['khums', 'gold', 'silver', 'gen', 'crop', 'fit'].forEach(k => {
        if (!s[k] || typeof s[k] !== 'object') return;
        Object.keys(d[k]).forEach(f => {
            if (typeof s[k][f] !== 'string') return;
            if (k === 'crop' && f === 'kind') { if (KZ_CROPS.indexOf(s[k][f]) > -1) d[k][f] = s[k][f]; }
            else if (k === 'fit' && f === 'kind') { if (KZ_FKINDS.indexOf(s[k][f]) > -1) d[k][f] = s[k][f]; }
            else if (k === 'crop' && f === 'irrig') { if (KZ_IRRIG.indexOf(s[k][f]) > -1) d[k][f] = s[k][f]; }
            else d[k][f] = kzCleanNum(s[k][f]);
        });
    });
    return d;
}

function kzSave() { try { lsSet(KZ_KEY, kzState); } catch (e) { /* best-effort */ } }

// "১,২৩৪.৫" / "1,234.5" / "١٢٣" → 1234.5 ; anything invalid or negative → 0
function kzNum(v) {
    if (v == null) return 0;
    const s = String(v)
        .replace(/[\u09E6-\u09EF]/g, c => String(c.charCodeAt(0) - 0x09E6))
        .replace(/[\u0660-\u0669]/g, c => String(c.charCodeAt(0) - 0x0660))
        .replace(/\u066B/g, '.')
        .replace(/[,\u066C\s]/g, '');
    const n = parseFloat(s);
    return (isFinite(n) && n > 0) ? n : 0;
}

function kzFmt(n, dec, minDec) {
    if (!isFinite(n)) n = 0;
    const bn = state.language === 'bn';
    const loc = (bn || kzState.cur === '৳' || kzState.cur === '₹') ? 'en-IN' : 'en-US';
    let s;
    try { s = n.toLocaleString(loc, { minimumFractionDigits: minDec || 0, maximumFractionDigits: dec == null ? 2 : dec }); }
    catch (e) { s = String(Math.round(n * 100) / 100); }
    return bn ? toBengaliDigits(s) : s;
}
// Money: whole amounts show no decimals, fractional amounts always show 2 (never "73,483.2").
// Bangladesh helpers: metal weights in gram or bhori; harvest in kg or mon; large taka in lakh/crore words.
function kzGPU() { return kzState.unit === 'bhori' ? KZ_BHORI_G : 1; }
function kzUnitName() { return kzState.unit === 'bhori' ? (state.language === 'bn' ? 'ভরি' : 'bhori') : 'g'; }
function kzBh(g) { return kzFmt(g / KZ_BHORI_G, 3) + (state.language === 'bn' ? ' ভরি' : ' bhori'); }
function kzMon(kg) { return kzFmt(kg / KZ_MON_KG, 2) + (state.language === 'bn' ? ' মণ' : ' mon'); }
function kzWords(n) {
    if (state.language !== 'bn' || kzState.cur !== '৳') return '';
    if (n >= 1e7) return ' (≈ ' + kzFmt(n / 1e7, 2) + ' কোটি)';
    if (n >= 1e5) return ' (≈ ' + kzFmt(n / 1e5, 2) + ' লাখ)';
    return '';
}
function kzMoney(n) { return kzState.cur + ' ' + kzFmt(n, 2, Math.round(n * 100) % 100 === 0 ? 0 : 2); }

// ---------------------------------------------------------------------------
// Small HTML builders
// ---------------------------------------------------------------------------
function kzField(path, label, hint, unit) {
    const p = path.split('.');
    const val = kzState[p[0]][p[1]];
    return `
    <label class="kz-field">
        <span class="kz-label">${label}</span>
        ${hint ? `<span class="kz-hint">${hint}</span>` : ''}
        <span class="kz-inwrap">
            <input class="kz-input" type="text" inputmode="decimal" autocomplete="off" data-kz="${path}" value="${escapeHtml(val)}" placeholder="0">
            <i class="kz-unit" aria-hidden="true">${unit}</i>
        </span>
    </label>`;
}
function kzSelect(path, label, options) {
    const p = path.split('.');
    const val = kzState[p[0]][p[1]];
    return `
    <label class="kz-field">
        <span class="kz-label">${label}</span>
        <select class="kz-select" data-kz="${path}">
            ${options.map(o => `<option value="${o[0]}"${o[0] === val ? ' selected' : ''}>${o[1]}</option>`).join('')}
        </select>
    </label>`;
}
function kzUnitSel() {
    const T = (b, e) => state.language === 'bn' ? b : e;
    return `
    <label class="kz-field">
        <span class="kz-label">${T('ওজনের একক', 'Weight unit')}</span>
        <span class="kz-hint">${T('১ ভরি = ১৬ আনা = ৯৬ রতি = ১১.৬৬৪ গ্রাম', '1 bhori = 16 ana = 96 roti = 11.664 g')}</span>
        <select class="kz-select" data-kz-unit>
            <option value="g"${kzState.unit === 'g' ? ' selected' : ''}>${T('গ্রাম', 'Gram')}</option>
            <option value="bhori"${kzState.unit === 'bhori' ? ' selected' : ''}>${T('ভরি', 'Bhori')}</option>
        </select>
    </label>`;
}
function kzCropUnitSel() {
    const T = (b, e) => state.language === 'bn' ? b : e;
    return `
    <label class="kz-field">
        <span class="kz-label">${T('ফসলের একক', 'Harvest unit')}</span>
        <span class="kz-hint">${T('১ মণ = ৪০ সের = ৩৭.৩২৪২ কেজি', '1 mon = 40 seer = 37.3242 kg')}</span>
        <select class="kz-select" data-kz-cunit>
            <option value="kg"${kzState.cunit === 'kg' ? ' selected' : ''}>${T('কেজি', 'Kilogram')}</option>
            <option value="mon"${kzState.cunit === 'mon' ? ' selected' : ''}>${T('মণ', 'Mon (maund)')}</option>
        </select>
    </label>`;
}
// Re-express saved numbers when the unit changes (so 10 g does not silently become 10 bhori).
function kzConvertUnits(kind, from, to) {
    const rnd = v => String(Math.round(v * 10000) / 10000);
    if (kind === 'metal') {
        const fo = from === 'bhori' ? KZ_BHORI_G : 1, fn = to === 'bhori' ? KZ_BHORI_G : 1;
        [['gold', 'g'], ['silver', 'g'], ['gen', 'goldG'], ['gen', 'silverG']].forEach(p => { const v = kzNum(kzState[p[0]][p[1]]); if (v) kzState[p[0]][p[1]] = rnd(v * fo / fn); });
        [['gen', 'goldP'], ['gen', 'silverP']].forEach(p => { const v = kzNum(kzState[p[0]][p[1]]); if (v) kzState[p[0]][p[1]] = rnd(v / fo * fn); });
    } else {
        const fo = from === 'mon' ? KZ_MON_KG : 1, fn = to === 'mon' ? KZ_MON_KG : 1, v = kzNum(kzState.crop.kg);
        if (v) kzState.crop.kg = rnd(v * fo / fn);
    }
}
function kzRow(label, value) { return `<div class="kz-row"><span>${label}</span><b>${value}</b></div>`; }
function kzTotal(label, value) { return `<div class="kz-total"><span>${label}</span><b>${value}</b></div>`; }
function kzMsg(text, kind) { return `<div class="kz-msg ${kind || 'info'}">${text}</div>`; }
function kzInfo(title, body) {
    return `<details class="kz-info"><summary>${title}</summary><div class="kz-body">${body}</div></details>`;
}

// ---------------------------------------------------------------------------
// Calculations — each returns { html, text } (text feeds the Share button)
// ---------------------------------------------------------------------------
function kzCalcKhums() {
    const l = state.language, T = (b, e) => l === 'bn' ? b : e;
    const k = kzState.khums;
    const inc = kzNum(k.income), costs = kzNum(k.costs), liv = kzNum(k.living), oth = kzNum(k.other), paid = kzNum(k.paid);
    if (inc === 0) {
        return { html: kzMsg(T('বছরের আয় ও ব্যয়ের তথ্য দিন — হিসাব এখানে দেখা যাবে।', 'Enter your yearly income and expenses — the result will appear here.'), 'info'), text: '' };
    }
    const net = inc - costs - liv - oth;
    const surplus = net > 0 ? net : 0;
    const due = surplus * 0.2;
    const rem = Math.max(0, due - paid);
    let html = kzRow(T('মোট আয়', 'Total income'), kzMoney(inc))
        + kzRow(T('মোট বাদযোগ্য ব্যয়', 'Total deductions'), kzMoney(costs + liv + oth))
        + kzRow(T('নিট বার্ষিক উদ্বৃত্ত', 'Net yearly surplus'), kzMoney(surplus));
    let text = '';
    if (surplus === 0) {
        html += kzMsg(T('এই হিসাবে খুমুস ওয়াজিব হওয়ার মতো উদ্বৃত্ত নেই।', 'There is no surplus on which khums becomes due in this calculation.'), 'ok');
        text = T('খুমুস হিসাব: উদ্বৃত্ত নেই — খুমুস ওয়াজিব নয়।', 'Khums: no surplus — nothing due.');
    } else {
        html += kzRow(T('সাহমে ইমাম (১০%)', 'Sahm-e-Imam (10%)'), kzMoney(due / 2))
            + kzRow(T('সাহমে সাদাত (১০%)', 'Sahm-e-Sadat (10%)'), kzMoney(due / 2))
            + kzRow(T('খুমুস (২০%)', 'Khums (20%)'), kzMoney(due));
        if (paid > 0) html += kzRow(T('ইতিমধ্যে পরিশোধিত', 'Already paid'), kzMoney(paid));
        html += kzTotal(paid > 0 ? T('বাকি খুমুস', 'Khums remaining') : T('প্রদেয় খুমুস', 'Khums due'), kzMoney(paid > 0 ? rem : due) + kzWords(paid > 0 ? rem : due));
        text = T('খুমুস হিসাব — নিট উদ্বৃত্ত: ', 'Khums — net surplus: ') + kzMoney(surplus)
            + T(' | খুমুস (২০%): ', ' | Khums (20%): ') + kzMoney(due)
            + (paid > 0 ? T(' | বাকি: ', ' | remaining: ') + kzMoney(rem) : '');
    }
    return { html, text };
}

// Gold/silver: below the 1st nisab nothing is due; above it, only whole "steps" count.
function kzStepZakat(g, first, step) {
    if (g < first) return { due: false, taxable: 0, zakat: 0 };
    const n = Math.floor((g - first) / step + 1e-9);
    const taxable = first + n * step;
    return { due: true, taxable, zakat: taxable * 0.025 };
}

function kzCalcMetal(kind) {
    const l = state.language, T = (b, e) => l === 'bn' ? b : e;
    const isGold = kind === 'gold';
    const g = kzNum(kzState[kind].g) * kzGPU();
    const first = isGold ? KZ_GOLD_NISAB_G : KZ_SILVER_NISAB_G;
    const step = isGold ? KZ_GOLD_STEP_G : KZ_SILVER_STEP_G;
    const name = isGold ? T('সোনা', 'gold') : T('রুপা', 'silver');
    if (g === 0) {
        return { html: kzMsg(T(`আপনার কাছে থাকা ${name}র ওজন (গ্রামে) দিন।`, `Enter the weight of ${name} you hold (in grams).`), 'info'), text: '' };
    }
    const r = kzStepZakat(g, first, step);
    let html = kzRow(T('আপনার ওজন', 'Your weight'), kzFmt(g, 3) + ' g (≈ ' + kzBh(g) + ')')
        + kzRow(T('প্রথম নিসাব', 'First nisab'), kzFmt(first, 3) + ' g (≈ ' + kzBh(first) + ')');
    let text;
    if (!r.due) {
        html += kzMsg(T(`নিসাব পূর্ণ হয়নি (আরও ${kzFmt(first - g, 3)} গ্রাম লাগবে) — যাকাত ওয়াজিব নয়।`, `Nisab not reached (${kzFmt(first - g, 3)} g short) — zakat is not due.`), 'ok');
        text = T(`${name}র যাকাত: নিসাব পূর্ণ হয়নি।`, `Zakat on ${name}: nisab not reached.`);
    } else {
        const skipped = g - r.taxable;
        html += kzRow(T('যাকাতযোগ্য ওজন', 'Zakatable weight'), kzFmt(r.taxable, 3) + ' g');
        if (skipped > 0.0005) {
            html += kzMsg(T(`পরবর্তী ধাপ (${kzFmt(step, 3)} গ্রাম) পূর্ণ না হওয়ায় ${kzFmt(skipped, 3)} গ্রাম গণনায় আসেনি।`, `${kzFmt(skipped, 3)} g did not complete the next step (${kzFmt(step, 3)} g), so it is not counted.`), 'info');
        }
        html += kzTotal(T('যাকাত (২.৫%)', 'Zakat (2.5%)'), kzFmt(r.zakat, 3) + ' g');
        text = T(`${name}র যাকাত: ${kzFmt(r.zakat, 3)} গ্রাম (মোট ${kzFmt(g, 3)} গ্রাম থেকে)`, `Zakat on ${name}: ${kzFmt(r.zakat, 3)} g (of ${kzFmt(g, 3)} g)`);
    }
    return { html, text };
}

function kzCalcCrop() {
    const l = state.language, T = (b, e) => l === 'bn' ? b : e;
    const c = kzState.crop;
    const kg = kzNum(c.kg) * (kzState.cunit === 'mon' ? KZ_MON_KG : 1);
    const names = { wheat: T('গম', 'Wheat'), barley: T('যব', 'Barley'), dates: T('খেজুর', 'Dates'), raisins: T('কিশমিশ', 'Raisins'), rice: T('ধান/চাল', 'Rice/paddy') };
    const rates = { natural: 0.10, artificial: 0.05, mixed: 0.075 };
    if (c.kind === 'rice') {
        return { html: kzMsg(T('ধান ও চাল (বাংলাদেশের প্রধান ফসল) যাকাতের নয়টি খাতের বাইরে, তাই এতে যাকাত ওয়াজিব নয়। তবে ধান বিক্রির আয় থেকে চাষের খরচ ও পরিবারের বছরের প্রয়োজন বাদ দিয়ে বছর শেষে যা উদ্বৃত্ত থাকে, তার ওপর খুমুস ওয়াজিব — “খুমুস” ট্যাবে হিসাব করুন। ⚖️ মুস্তাহাব দান ও ফসলের খরচ বাদের নিয়ম মারজাভেদে ভিন্ন হতে পারে।', 'Rice/paddy (Bangladesh’s main crop) is outside the nine zakat items, so zakat is not obligatory on it. But what remains of your sale income after farming costs and yearly household needs is subject to khums — use the Khums tab. ⚖️ Recommended (mustahab) giving and deduction of farming costs may differ by marja.'), 'info'), text: '' };
    }
    if (kg === 0) {
        return { html: kzMsg(T('মোট ফসলের ওজন (কেজি বা মণে) দিন।', 'Enter the total harvest weight (in kg).'), 'info'), text: '' };
    }
    const rate = rates[c.irrig];
    let html = kzRow(T('ফসল', 'Crop'), names[c.kind])
        + kzRow(T('মোট ওজন', 'Total weight'), kzFmt(kg, 2) + ' kg (≈ ' + kzMon(kg) + ')')
        + kzRow(T('নিসাব (প্রায়)', 'Nisab (approx.)'), kzFmt(KZ_CROP_NISAB_KG, 0) + ' kg (≈ ' + kzMon(KZ_CROP_NISAB_KG) + ')');
    let text;
    if (kg < KZ_CROP_NISAB_KG) {
        html += kzMsg(T(`নিসাব পূর্ণ হয়নি (আরও ${kzFmt(KZ_CROP_NISAB_KG - kg, 2)} কেজি লাগবে) — যাকাত ওয়াজিব নয়।`, `Nisab not reached (${kzFmt(KZ_CROP_NISAB_KG - kg, 2)} kg short) — zakat is not due.`), 'ok');
        text = T(`${names[c.kind]}র যাকাত: নিসাব পূর্ণ হয়নি।`, `Zakat on ${names[c.kind]}: nisab not reached.`);
    } else {
        const z = kg * rate;
        html += kzRow(T('হার', 'Rate'), kzFmt(rate * 100, 1) + '%')
            + kzTotal(T('যাকাত', 'Zakat'), kzFmt(z, 2) + ' kg');
        text = T(`${names[c.kind]}র যাকাত: ${kzFmt(z, 2)} কেজি (মোট ${kzFmt(kg, 2)} কেজি, হার ${kzFmt(rate * 100, 1)}%)`, `Zakat on ${names[c.kind]}: ${kzFmt(z, 2)} kg (of ${kzFmt(kg, 2)} kg at ${kzFmt(rate * 100, 1)}%)`);
    }
    return { html, text };
}

// Zakat al-Fitra: people × one sa' (about 3 kg) of a staple, or the price of that weight.
function kzCalcFitra() {
    const l = state.language, T = (b, e) => l === 'bn' ? b : e, f = kzState.fit;
    const people = Math.floor(kzNum(f.people)), per = kzNum(f.kg), price = kzNum(f.price);
    const names = { rice: T('চাল', 'Rice'), wheat: T('গম', 'Wheat'), barley: T('যব', 'Barley'), dates: T('খেজুর', 'Dates'), raisins: T('কিশমিশ', 'Raisins'), corn: T('ভুট্টা', 'Corn') };
    if (people < 1 || per <= 0) return { html: kzMsg(T('সদস্য সংখ্যা (নিজে ও পোষ্য) এবং জনপ্রতি কেজি দিন।', 'Enter the number of people (you and your dependents) and the kilograms per person.'), 'info'), text: '' };
    const kg = people * per;
    let html = kzRow(T('সদস্য সংখ্যা', 'People'), kzFmt(people, 0)) + kzRow(T('জনপ্রতি', 'Per person'), kzFmt(per, 2) + ' kg ' + names[f.kind]) + kzTotal(T('মোট ' + names[f.kind], 'Total ' + names[f.kind]), kzFmt(kg, 2) + ' kg');
    let text = T(`ফিতরা: ${kzFmt(people, 0)} জন × ${kzFmt(per, 2)} কেজি ${names[f.kind]} = ${kzFmt(kg, 2)} কেজি`, `Fitra: ${kzFmt(people, 0)} × ${kzFmt(per, 2)} kg ${names[f.kind]} = ${kzFmt(kg, 2)} kg`);
    if (price > 0) {
        const m = kg * price;
        html += kzRow(T('প্রতি কেজি দাম', 'Price per kg'), kzMoney(price)) + kzTotal(T('নগদে দিলে মোট', 'Total if paid in cash'), kzMoney(m) + kzWords(m));
        text += T(` ≈ ${kzMoney(m)}`, ` ≈ ${kzMoney(m)}`);
    }
    return { html, text };
}

function kzCalcGeneral() {
    const l = state.language, T = (b, e) => l === 'bn' ? b : e;
    const g = kzState.gen;
    const cash = kzNum(g.cash), gpu = kzGPU(), goldG = kzNum(g.goldG) * gpu, goldP = kzNum(g.goldP) / gpu, silverG = kzNum(g.silverG) * gpu, silverP = kzNum(g.silverP) / gpu;
    const goods = kzNum(g.goods), recv = kzNum(g.recv), debts = kzNum(g.debts);
    const goldV = goldG * goldP, silverV = silverG * silverP;
    const assets = cash + goldV + silverV + goods + recv;
    if (assets === 0) {
        return { html: kzMsg(T('আপনার সম্পদের তথ্য দিন — হিসাব এখানে দেখা যাবে।', 'Enter your assets — the result will appear here.'), 'info'), text: '' };
    }
    if ((goldG > 0 && goldP === 0) || (silverG > 0 && silverP === 0)) {
        return { html: kzMsg(T('সোনা/রুপার মূল্য হিসাব করতে গ্রাম-প্রতি বর্তমান দামও দিন।', 'Enter the current price per gram so gold/silver can be valued.'), 'warn'), text: '' };
    }
    const net = Math.max(0, assets - debts);
    // Nisab: silver-based figure when a silver price is known (lower, more cautious), else gold-based.
    let nisab = 0, basis = '';
    if (silverP > 0) { nisab = KZ_GEN_SILVER_NISAB_G * silverP; basis = T('রুপা ৬১২.৩৬ গ্রাম', 'silver 612.36 g'); }
    else if (goldP > 0) { nisab = KZ_GEN_GOLD_NISAB_G * goldP; basis = T('সোনা ৮৭.৪৮ গ্রাম', 'gold 87.48 g'); }
    let html = kzRow(T('মোট সম্পদ', 'Total assets'), kzMoney(assets))
        + kzRow(T('ঋণ/দেনা', 'Debts'), kzMoney(debts))
        + kzRow(T('নিট সম্পদ', 'Net wealth'), kzMoney(net));
    if (nisab === 0) {
        html += kzMsg(T('নিসাব নির্ধারণে রুপার (বা সোনার) গ্রাম-প্রতি দাম দিন।', 'Enter the silver (or gold) price per gram to determine the nisab.'), 'warn');
        return { html, text: '' };
    }
    html += kzRow(T(`নিসাব (${basis})`, `Nisab (${basis})`), kzMoney(nisab));
    let text;
    if (net < nisab) {
        html += kzMsg(T('নিট সম্পদ নিসাবের কম — এই হিসাবে যাকাত প্রযোজ্য নয়।', 'Net wealth is below the nisab — zakat does not apply in this calculation.'), 'ok');
        text = T('সাধারণ যাকাত: নিসাবের কম।', 'General zakat: below nisab.');
    } else {
        const z = net * 0.025;
        html += kzTotal(T('যাকাত (২.৫%)', 'Zakat (2.5%)'), kzMoney(z) + kzWords(z));
        text = T('সাধারণ যাকাত — নিট সম্পদ: ', 'General zakat — net wealth: ') + kzMoney(net) + T(' | যাকাত (২.৫%): ', ' | zakat (2.5%): ') + kzMoney(z);
    }
    return { html, text };
}

function kzCalcCurrent() {
    if (kzState.tab === 'khums') return kzCalcKhums();
    if (kzState.tab === 'general') return kzCalcGeneral();
    if (kzState.zsub === 'gold') return kzCalcMetal('gold');
    if (kzState.zsub === 'silver') return kzCalcMetal('silver');
    if (kzState.zsub === 'crop') return kzCalcCrop();
    if (kzState.zsub === 'fitra') return kzCalcFitra();
    return null; // cattle: reference only
}

// Refresh only the result block (no re-render → inputs keep focus)
function kzCalc() {
    const el = document.getElementById('kz-result');
    const r = kzCalcCurrent();
    window._kzShareText = r ? r.text : '';
    if (!el || !r) return;
    el.innerHTML = r.html;
    const share = document.getElementById('kz-share-btn');
    if (share) share.disabled = !r.text;
}

// ---------------------------------------------------------------------------
// Tab bodies
// ---------------------------------------------------------------------------
function kzBodyKhums() {
    const l = state.language, T = (b, e) => l === 'bn' ? b : e, u = kzState.cur, d = state.darkMode;
    return `
    <div class="kz-card text-center">
        <p class="arabic-text" dir="rtl" style="font-size:1.45rem;line-height:2.1;color:${d ? '#c9a227' : '#92400e'}">وَاعْلَمُوا أَنَّمَا غَنِمْتُم مِّن شَيْءٍ فَأَنَّ لِلَّهِ خُمُسَهُ وَلِلرَّسُولِ وَلِذِي الْقُرْبَىٰ</p>
        <p class="kz-hint" style="margin-top:6px">${T('সূরা আল-আনফাল: ৪১', 'Surah Al-Anfal: 41')}</p>
    </div>
    <div class="kz-card">
        <h3 class="kz-h">${T('আপনার খুমুস-বর্ষের হিসাব', 'Your khums-year figures')}</h3>
        ${kzField('khums.income', T('বছরের মোট আয়', 'Total income this year'), T('বেতন, ঈদ বোনাস, ব্যবসার মুনাফা, বাড়ি/দোকান/জমির ভাড়া, ফসল বিক্রির আয়, প্রবাসী আয় (রেমিট্যান্স)', 'Salary, Eid bonus, business profit, rent income, sale of crops, overseas earnings (remittance)'), u)}
        ${kzField('khums.costs', T('আয় অর্জনের খরচ', 'Cost of earning it'), T('ব্যবসার খরচ, আয়কর/ট্যাক্স, চাষের খরচ (বীজ, সার, সেচ, শ্রমিক), কর্মস্থলের ব্যয়', 'Business costs, taxes, farming costs (seed, fertiliser, irrigation, labour), work expenses'), u)}
        ${kzField('khums.living', T('পরিবারের বার্ষিক প্রয়োজনীয় ব্যয়', 'Yearly household expenses'), T('খাদ্য, বাসা ভাড়া, চিকিৎসা, সন্তানের শিক্ষা, বিয়ে, ঈদ-কোরবানি, যিয়ারত/হজ ইত্যাদি', 'Food, rent, medical, children’s education, marriage, Eid/Qurbani, ziyarat/Hajj, etc.'), u)}
        ${kzField('khums.other', T('অন্যান্য বৈধ বাদ', 'Other allowed deductions'), T('বছরে পরিশোধিত ঋণ, উপহার ও দান', 'Debts repaid, gifts and charity this year'), u)}
        ${kzField('khums.paid', T('ইতিমধ্যে দেওয়া খুমুস', 'Khums already paid'), T('এই বছরের জন্য আগেই দিয়ে থাকলে', 'If you already paid part of it for this year'), u)}
    </div>`;
}

// ---------------------------------------------------------------------------
// v125 — khums-year tracker, payment log, Knowledge Center links
// (stored inside the same localStorage key, so Backup & Restore's "Khums & Zakat" group covers it)
// ---------------------------------------------------------------------------
function kzParseDate(str) { const p = String(str).split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0); }
function kzIso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function kzIsDate(str) { if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false; const d = kzParseDate(str); return !isNaN(d) && kzIso(d) === str; }
function kzToday() { return kzIso(new Date()); }
function kzFmtDate(d) {
    try { return d.toLocaleDateString(state.language === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (e) { return kzIso(d); }
}
// Year length is the user's choice (solar 12 months, or lunar ≈ 354 days) — the marja decides which applies.
function kzYearEnd(startStr, type) {
    const e = kzParseDate(startStr);
    if (type === 'lunar') e.setDate(e.getDate() + 354); else e.setFullYear(e.getFullYear() + 1);
    return e;
}
function kzKindName(k) {
    const T = (b, e) => state.language === 'bn' ? b : e;
    return { imam: T('সাহমে ইমাম', 'Sahm-e-Imam'), sadat: T('সাহমে সাদাত', 'Sahm-e-Sadat'), zakat: T('যাকাত', 'Zakat'), other: T('অন্যান্য', 'Other') }[k] || k;
}

function kzBodyYear() {
    const l = state.language, T = (b, e) => l === 'bn' ? b : e, y = kzState.year;
    let status = '';
    if (kzIsDate(y.start)) {
        const s = kzParseDate(y.start), e = kzYearEnd(y.start, y.type), now = kzParseDate(kzToday());
        const total = Math.round((e - s) / 864e5), left = Math.round((e - now) / 864e5), passed = Math.round((now - s) / 864e5);
        const approx = y.type === 'lunar' ? T(' (প্রায়)', ' (approx.)') : '';
        if (passed < 0) {
            status = kzMsg(T('এই তারিখ এখনো আসেনি।', 'This date has not arrived yet.'), 'warn');
        } else if (left > 0) {
            const pct = Math.min(100, Math.max(0, Math.round(passed / total * 100)));
            status = kzRow(T('বছর শুরু', 'Year started'), kzFmtDate(s))
                + kzRow(T('বছর শেষ', 'Year ends') + approx, kzFmtDate(e))
                + `<div class="kz-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>`
                + kzTotal(T('বাকি', 'Remaining'), kzFmt(left, 0) + T(' দিন', ' days'));
        } else {
            status = kzRow(T('বছর শেষ হয়েছে', 'Year ended') + approx, kzFmtDate(e))
                + kzMsg(T('খুমুস-বর্ষ পূর্ণ হয়েছে। উপরে বছরের আয়-ব্যয় বসিয়ে হিসাব করুন, তারপর পরের বছর শুরু করুন।', 'Your khums year is complete. Enter the year’s income and expenses above, then start the next year.'), 'ok')
                + `<div class="kz-actions"><button type="button" class="kz-btn" data-kz-act="ynext">${T('পরের বছর শুরু করুন', 'Start next year')}</button></div>`;
        }
    } else {
        status = kzMsg(T('আপনার খুমুস-বর্ষ যেদিন শুরু (সাধারণত প্রথম আয়ের দিন), সেই তারিখ দিন।', 'Enter the date your khums year begins (normally the day of your first earning).'), 'info');
    }
    return `
    <div class="kz-card">
        <h3 class="kz-h">${T('আমার খুমুস-বর্ষ', 'My khums year')}</h3>
        <label class="kz-field"><span class="kz-label">${T('বছর শুরুর তারিখ', 'Year start date')}</span>
            <input class="kz-input" type="date" data-kz-ydate value="${kzIsDate(y.start) ? y.start : ''}"></label>
        <label class="kz-field"><span class="kz-label">${T('বছরের ধরন', 'Year type')}</span>
            <span class="kz-hint">${T('⚖️ চান্দ্র না সৌর — মারজাভেদে ভিন্ন হতে পারে। আপনার মারজার নিয়ম অনুযায়ী বেছে নিন।', '⚖️ Lunar or solar may differ by marja. Choose according to your marja’s ruling.')}</span>
            <select class="kz-select" data-kz-ytype>
                <option value="solar"${y.type === 'solar' ? ' selected' : ''}>${T('সৌর (ইংরেজি ১২ মাস)', 'Solar (12 Gregorian months)')}</option>
                <option value="lunar"${y.type === 'lunar' ? ' selected' : ''}>${T('চান্দ্র (প্রায় ৩৫৪ দিন)', 'Lunar (about 354 days)')}</option>
            </select></label>
        <div id="kz-year-status">${status}</div>
        ${kzIsDate(y.start) ? `<div class="kz-actions"><button type="button" class="kz-btn kz-btn-ghost" data-kz-act="yclr">${T('তারিখ মুছুন', 'Clear date')}</button></div>` : ''}
    </div>`;
}

function kzPaySums() {
    const cur = kzState.cur, y = kzState.year, ranged = kzIsDate(y.start);
    const lo = ranged ? y.start : '', hi = ranged ? kzIso(kzYearEnd(y.start, y.type)) : '9999-12-31';
    const sum = { imam: 0, sadat: 0, zakat: 0, other: 0, yearKhums: 0, mixed: false };
    kzState.pays.forEach(p => {
        if (p.c !== cur) { sum.mixed = true; return; }
        const a = kzNum(p.a);
        sum[p.k] += a;
        if ((p.k === 'imam' || p.k === 'sadat') && p.d >= lo && p.d < hi) sum.yearKhums += a;
    });
    return sum;
}

function kzBodyPays() {
    const l = state.language, T = (b, e) => l === 'bn' ? b : e, pf = kzState.pf, u = kzState.cur;
    const sum = kzPaySums();
    const list = kzState.pays.slice().sort((a, b) => a.d < b.d ? 1 : a.d > b.d ? -1 : 0);
    const rows = list.length ? list.map(p => `
        <div class="kz-pay"><div><b>${escapeHtml(kzKindName(p.k))}</b> · ${escapeHtml(kzFmtDate(kzParseDate(p.d)))}${p.n ? `<small>${escapeHtml(p.n)}</small>` : ''}</div>
            <div class="kz-pay-r"><b>${escapeHtml(p.c)} ${kzFmt(kzNum(p.a), 2)}</b>
            <button type="button" class="kz-btn kz-btn-ghost" data-kz-act="pdel" data-kz-id="${escapeHtml(p.i)}" aria-label="${T('মুছুন', 'Delete')}">✕</button></div></div>`).join('')
        : `<p class="kz-hint">${T('এখনো কোনো পরিশোধ লেখা হয়নি।', 'No payments recorded yet.')}</p>`;
    const range = kzIsDate(kzState.year.start) ? T('এই খুমুস-বর্ষে দেওয়া খুমুস', 'Khums paid in this khums year') : T('মোট দেওয়া খুমুস (সব সময়)', 'Total khums paid (all time)');
    return `
    <div class="kz-card">
        <h3 class="kz-h">${T('আমার পরিশোধের হিসাব', 'My payment log')}</h3>
        <label class="kz-field"><span class="kz-label">${T('তারিখ', 'Date')}</span>
            <input class="kz-input" type="date" data-kz-pf="d" value="${kzIsDate(pf.d) ? pf.d : kzToday()}"></label>
        <label class="kz-field"><span class="kz-label">${T('খাত', 'Category')}</span>
            <select class="kz-select" data-kz-pf="k">${KZ_PKINDS.map(k => `<option value="${k}"${pf.k === k ? ' selected' : ''}>${kzKindName(k)}</option>`).join('')}</select></label>
        ${kzField('pf.a', T('পরিমাণ', 'Amount'), '', u)}
        <label class="kz-field"><span class="kz-label">${T('নোট (ঐচ্ছিক)', 'Note (optional)')}</span>
            <input class="kz-input" type="text" maxlength="40" data-kz-pf="n" value="${escapeHtml(pf.n)}"></label>
        <div class="kz-actions"><button type="button" class="kz-btn" data-kz-act="padd">${T('যোগ করুন', 'Add')}</button></div>
        <div class="kz-pays">${rows}</div>
        ${kzState.pays.length ? `
        ${kzRow(kzKindName('imam'), kzMoney(sum.imam))}${kzRow(kzKindName('sadat'), kzMoney(sum.sadat))}${kzRow(kzKindName('zakat'), kzMoney(sum.zakat))}
        ${kzTotal(range, kzMoney(sum.yearKhums))}
        ${sum.mixed ? kzMsg(T('অন্য মুদ্রার পরিশোধ যোগফলে ধরা হয়নি — উপরের মুদ্রা বদলে দেখুন।', 'Payments in other currencies are not in these totals — switch the currency above to see them.'), 'info') : ''}
        <div class="kz-actions">
            <button type="button" class="kz-btn" data-kz-act="pfill"${sum.yearKhums > 0 ? '' : ' disabled'}>${T('“ইতিমধ্যে দেওয়া খুমুস” ঘরে বসান', 'Use as “Khums already paid”')}</button>
            <button type="button" class="kz-btn kz-btn-ghost" data-kz-act="pclr">${T('সব মুছুন', 'Clear all')}</button>
        </div>` : ''}
        <p class="kz-hint">${T('এই তালিকা শুধু আপনার ডিভাইসে থাকে। ব্যাকআপে নিতে চাইলে “খুমুস-যাকাতের ইনপুট” অংশটি চালু করুন।', 'This list stays on your device. To include it in a backup, turn on the “Khums & Zakat inputs” group.')}</p>
    </div>`;
}

function kzBodyKcLinks(topic) {
    const l = state.language, T = (b, e) => l === 'bn' ? b : e;
    const isK = topic === 'khums';
    return `
    <div class="kz-card">
        <h3 class="kz-h">${T('দলিল ও মাসআলা পড়ুন', 'Read the rulings')}</h3>
        <p class="kz-hint">${T('নলেজ সেন্টারে সংশ্লিষ্ট মাসআলা ও বিভিন্ন মারজার ফতোয়া আছে।', 'The Knowledge Center has related masail and rulings of various maraji.')}</p>
        <div class="kz-linkrow">
            <button type="button" class="kz-btn kz-btn-ghost" data-kz-act="kc" data-kz-kc="masail|${topic}|">${isK ? T('খুমুসের মাসআলা', 'Khums masail') : T('যাকাতের মাসআলা', 'Zakat masail')}</button>
            <button type="button" class="kz-btn kz-btn-ghost" data-kz-act="kc" data-kz-kc="fatwa||${topic}">${isK ? T('খুমুস-সংক্রান্ত ফতোয়া', 'Khums rulings') : T('যাকাত-সংক্রান্ত ফতোয়া', 'Zakat rulings')}</button>
        </div>
    </div>`;
}

// Extra click actions (kept out of the main handler so the original branches stay untouched)
function kzExtraAct(act, el) {
    const T = (b, e) => state.language === 'bn' ? b : e;
    if (act === 'padd') {
        const a = kzNum(kzState.pf.a);
        if (!a) { if (typeof showToast === 'function') showToast(T('পরিমাণ দিন', 'Enter an amount')); return true; }
        if (kzState.pays.length >= KZ_MAX_PAYS) { if (typeof showToast === 'function') showToast(T('সর্বোচ্চ ৬০টি এন্ট্রি — পুরনোগুলো মুছুন', 'Maximum 60 entries — delete old ones')); return true; }
        kzState.pays.push({ i: Math.random().toString(36).slice(2, 10), d: kzIsDate(kzState.pf.d) ? kzState.pf.d : kzToday(), a: String(Math.round(a * 100) / 100), k: kzState.pf.k, c: kzState.cur, n: kzState.pf.n });
        kzState.pf.a = ''; kzState.pf.n = '';
        kzSave(); kzRefresh(); return true;
    }
    if (act === 'pdel') { const id = el.getAttribute('data-kz-id'); kzState.pays = kzState.pays.filter(p => p.i !== id); kzSave(); kzRefresh(); return true; }
    if (act === 'pclr') {
        if (typeof confirm === 'function' && !confirm(T('পরিশোধের সব এন্ট্রি মুছে যাবে। নিশ্চিত?', 'All payment entries will be deleted. Continue?'))) return true;
        kzState.pays = []; kzSave(); kzRefresh(); return true;
    }
    if (act === 'pfill') { kzState.khums.paid = String(Math.round(kzPaySums().yearKhums * 100) / 100); kzSave(); kzRefresh(); return true; }
    if (act === 'ynext') { if (kzIsDate(kzState.year.start)) { kzState.year.start = kzIso(kzYearEnd(kzState.year.start, kzState.year.type)); kzSave(); kzRefresh(); } return true; }
    if (act === 'yclr') { kzState.year.start = ''; kzSave(); kzRefresh(); return true; }
    if (act === 'kc') {
        const p = String(el.getAttribute('data-kz-kc') || '').split('|');
        if (['masail', 'fatwa', 'qa', 'hadith'].indexOf(p[0]) < 0) return true;
        state.kcTab = p[0]; state.kcCategory = p[1] || ''; state.kcSearch = p[2] || ''; state.kcPage = 1; state.kcFilter = 'all'; state.kcFatwaMarja = '';
        if (typeof changePage === 'function') changePage('knowledgeCenter');
        return true;
    }
    return false;
}

function kzBodyBD() {
    const l = state.language, T = (b, e) => l === 'bn' ? b : e;
    return kzInfo(T('বাংলাদেশের প্রেক্ষাপটে খুমুস', 'Khums in the Bangladesh context'), `
        <ul>
            <li>${T('<b>আয় ধরুন:</b> বেতন, ঈদ/উৎসব বোনাস, ব্যবসার মুনাফা, বাড়ি-দোকান-জমির ভাড়া, ধান-পাট-সবজি ইত্যাদি ফসল বিক্রির আয় এবং প্রবাসীর রেমিট্যান্স।', '<b>Count as income:</b> salary, Eid/festival bonus, business profit, rent from houses, shops or land, sale of crops such as rice and jute, and overseas remittance.')}</li>
            <li>${T('<b>বাদ দিন:</b> আয় অর্জনের খরচ (বীজ, সার, সেচ, শ্রমিক, ব্যবসার খরচ, ট্যাক্স) এবং পরিবারের বার্ষিক প্রয়োজনীয় ব্যয় (খাদ্য, বাসা ভাড়া, চিকিৎসা, শিক্ষা, ঈদ-কোরবানি, বিয়ে, যিয়ারত)।', '<b>Deduct:</b> costs of earning (seed, fertiliser, irrigation, labour, business costs, tax) and yearly household needs (food, rent, medical, education, Eid/Qurbani, marriage, ziyarat).')}</li>
            <li>${T('ব্যাংকে জমা, ডিপিএস/এফডিআর বা সঞ্চয়ে রাখা অর্থ বছর শেষে উদ্বৃত্ত থাকলে তা খুমুসযোগ্য। প্রভিডেন্ট ফান্ড, গ্র্যাচুইটি ও সঞ্চয়পত্রের বিধান মারজাভেদে ভিন্ন — ⚖️ রিসালা বা মারজার দপ্তরে জিজ্ঞেস করুন।', 'Money saved in banks, DPS/FDR or savings that is left at year end is subject to khums. Rules on provident fund, gratuity and savings certificates differ by marja — ⚖️ ask your marja’s office.')}</li>
            <li>${T('কৃষক ও ব্যবসায়ীর খুমুস-বর্ষ কখন শুরু হবে তা রিসালায় দেখুন। ⚖️', 'For when a farmer’s or trader’s khums year begins, see your marja’s risala. ⚖️')}</li>
            <li>${T('সাহমে ইমাম মারজার অনুমতিতে বা তাঁর প্রতিনিধির মাধ্যমে দিতে হয়; সাহমে সাদাত অভাবী সাইয়্যেদদের প্রাপ্য। বাংলাদেশে আপনার মারজার প্রতিনিধি বা দপ্তরের নির্দেশনা নিন।', 'Sahm-e-Imam is paid through or with permission of your marja or his representative; Sahm-e-Sadat is for needy Sadat. Ask your marja’s representative or office in Bangladesh for guidance.')}</li>
        </ul>`);
}
function kzBodyUnits() {
    const l = state.language, T = (b, e) => l === 'bn' ? b : e;
    const rows = [
        [T('১ ভরি (১৬ আনা, ৯৬ রতি)', '1 bhori (16 ana, 96 roti)'), '11.664 g'],
        [T('১ আনা', '1 ana'), '0.729 g'],
        [T('১ রতি', '1 roti'), '0.1215 g'],
        [T('১ সের', '1 seer'), '0.9331 kg'],
        [T('১ মণ (৪০ সের)', '1 mon (40 seer)'), '37.3242 kg'],
        [T('ফসলের নিসাব', 'Crop nisab'), kzFmt(KZ_CROP_NISAB_KG, 0) + ' kg ≈ ' + kzMon(KZ_CROP_NISAB_KG)],
        [T('সোনার প্রথম নিসাব', 'Gold first nisab'), kzFmt(KZ_GOLD_NISAB_G, 2) + ' g ≈ ' + kzBh(KZ_GOLD_NISAB_G)],
        [T('রুপার প্রথম নিসাব', 'Silver first nisab'), kzFmt(KZ_SILVER_NISAB_G, 2) + ' g ≈ ' + kzBh(KZ_SILVER_NISAB_G)],
        [T('সাধারণ যাকাতের নিসাব', 'General zakat nisab'), T('৭.৫ ভরি সোনা / ৫২.৫ ভরি রুপা', '7.5 bhori gold / 52.5 bhori silver')]
    ];
    return kzInfo(T('বাংলাদেশি একক রূপান্তর (ভরি, মণ)', 'Bangladeshi units (bhori, mon)'),
        `<div class="kz-table-wrap"><table class="kz-table"><tbody>${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</tbody></table></div>`);
}

function kzBodyKhumsInfo() {
    const l = state.language, T = (b, e) => l === 'bn' ? b : e;
    return kzBodyBD() + kzInfo(T('খুমুস কোন কোন খাতে ওয়াজিব?', 'What is khums due on?'), `
        <ol>
            <li>${T('উপার্জনের মুনাফা — বেতন, ব্যবসা, পেশা (বছরের প্রয়োজন মিটিয়ে যা উদ্বৃত্ত)। <b>এই ক্যালকুলেটর শুধু এই খাতটি হিসাব করে।</b>', 'Profit from earnings — salary, business, trade (what remains after yearly needs). <b>This calculator covers this category only.</b>')}</li>
            <li>${T('খনিজ সম্পদ', 'Minerals')}</li>
            <li>${T('গুপ্তধন', 'Treasure trove')}</li>
            <li>${T('হারামের সাথে মিশ্রিত হালাল সম্পদ', 'Lawful wealth mixed with the unlawful')}</li>
            <li>${T('ডুব দিয়ে সমুদ্র থেকে তোলা মুক্তা ও রত্ন', 'Gems obtained by diving')}</li>
            <li>${T('যুদ্ধলব্ধ গনিমত', 'Spoils of war')}</li>
            <li>${T('মুসলিমের কাছ থেকে জিম্মি (অমুসলিম নাগরিক) কর্তৃক কেনা জমি', 'Land bought by a dhimmi from a Muslim')}</li>
        </ol>
        <p style="margin-top:8px">${T('২ থেকে ৭ নম্বর খাতে নিসাব ও খরচ বাদের নিয়ম আলাদা — মারজার তাওযীহুল মাসায়েল দেখুন।', 'Categories 2–7 have their own nisab and deduction rules — see your marja\'s manual.')}</p>`)
        + kzInfo(T('খুমুস-বর্ষ ও বণ্টন', 'Khums year & distribution'), `
        <ul>
            <li>${T('খুমুস-বর্ষ সাধারণত প্রথম আয়ের দিন থেকে ১২ চান্দ্র মাস; বছর শেষে উদ্বৃত্তের ২০% দিতে হয়।', 'The khums year normally runs 12 lunar months from your first earning; 20% of what is left at its end is due.')}</li>
            <li>${T('খুমুস দুই ভাগ: <b>সাহমে ইমাম</b> (অর্ধেক) ও <b>সাহমে সাদাত</b> (অর্ধেক — অভাবী সাইয়্যেদ, ইয়াতিম, মিসকিন ও মুসাফির)।', 'Khums is split into <b>Sahm-e-Imam</b> (half) and <b>Sahm-e-Sadat</b> (half — needy Sadat, orphans, poor and stranded travellers).')}</li>
            <li>${T('সাধারণত মারজা বা তাঁর অনুমোদিত প্রতিনিধির মাধ্যমে পরিশোধ করা হয়।', 'It is usually paid through your marja or his authorised representative.')}</li>
        </ul>`);
}

function kzBodyZakat() {
    const l = state.language, T = (b, e) => l === 'bn' ? b : e, d = state.darkMode;
    const subs = [['crop', T('ফসল', 'Crops')], ['gold', T('সোনা', 'Gold')], ['silver', T('রুপা', 'Silver')], ['cattle', T('গবাদিপশু', 'Livestock')], ['fitra', T('ফিতরা', 'Fitra')]];
    let inner = '';
    if (kzState.zsub === 'crop') {
        inner = `
        <div class="kz-card">
            <h3 class="kz-h">${T('গম, যব, খেজুর ও কিশমিশ', 'Wheat, barley, dates & raisins')}</h3>
            ${kzSelect('crop.kind', T('ফসলের ধরন', 'Crop'), [['wheat', T('গম', 'Wheat')], ['barley', T('যব', 'Barley')], ['dates', T('খেজুর (শুকনো)', 'Dates (dried)')], ['raisins', T('কিশমিশ', 'Raisins')], ['rice', T('ধান/চাল (নয়টির বাইরে)', 'Rice/paddy (outside the nine)')]])}
            ${kzCropUnitSel()}
            ${kzField('crop.kg', T('মোট ফসলের ওজন', 'Total harvest weight'), T('শুকনো অবস্থার ওজন (খেজুর ও কিশমিশের ক্ষেত্রে)', 'Dry weight (for dates and raisins)'), kzState.cunit === 'mon' ? T('মণ', 'mon') : 'kg')}
            ${kzSelect('crop.irrig', T('সেচের ধরন', 'Irrigation'), [['natural', T('বৃষ্টি/নদী/প্রাকৃতিক — ১০%', 'Rain/river/natural — 10%')], ['artificial', T('পাম্প/কৃত্রিম সেচ — ৫%', 'Pump/artificial — 5%')], ['mixed', T('উভয় সমান — ৭.৫%', 'Both equally — 7.5%')]])}
        </div>`;
    } else if (kzState.zsub === 'fitra') {
        const u = kzState.cur;
        inner = `
        <div class="kz-card">
            <h3 class="kz-h">${T('যাকাতুল ফিতরা', 'Zakat al-Fitra')}</h3>
            ${kzField('fit.people', T('সদস্য সংখ্যা', 'Number of people'), T('নিজে ও আপনার পোষ্য (যাদের ভরণপোষণ আপনার ওপর)', 'Yourself and your dependents'), T('জন', 'people'))}
            ${kzSelect('fit.kind', T('কী দিয়ে দেবেন', 'What you give'), [['rice', T('চাল', 'Rice')], ['wheat', T('গম', 'Wheat')], ['barley', T('যব', 'Barley')], ['dates', T('খেজুর', 'Dates')], ['raisins', T('কিশমিশ', 'Raisins')], ['corn', T('ভুট্টা', 'Corn')]])}
            ${kzField('fit.kg', T('জনপ্রতি পরিমাণ', 'Amount per person'), T('এক সা ≈ ৩ কেজি। আপনার মারজার ঘোষিত পরিমাণ ভিন্ন হলে সেটি বসান। ⚖️', 'One sa’ ≈ 3 kg. Enter your marja’s announced amount if it differs. ⚖️'), 'kg')}
            ${kzField('fit.price', T('নগদে দিলে প্রতি কেজির দাম', 'Price per kg (if paying cash)'), T('আপনার এলাকার ওই খাদ্যের বর্তমান বাজারদর', 'Current local market price of that staple'), u + '/kg')}
            ${kzMsg(T('ঈদুল ফিতরের রাতের সূর্যাস্তে যারা প্রাপ্তবয়স্ক, সুস্থ মস্তিষ্কের ও সামর্থ্যবান, তাদের ওপর ওয়াজিব। অতিথি, সাইয়্যেদকে দেওয়া, দেওয়ার সময়সীমা ও কোথায় দেওয়া যাবে এসব খুঁটিনাটি মাসআলা মারজাভেদে ভিন্ন — রিসালা বা দপ্তরের ঘোষণা দেখুন। ⚖️', 'Due from every adult, sane person who is able, at sunset on the night of Eid al-Fitr. Details such as guests, giving to sayyids, deadlines and where to give differ by marja — see your marja’s risala or announcement. ⚖️'), 'info')}
        </div>`;
    } else if (kzState.zsub === 'gold' || kzState.zsub === 'silver') {
        const isGold = kzState.zsub === 'gold';
        inner = `
        <div class="kz-card">
            <h3 class="kz-h">${isGold ? T('সোনার যাকাত', 'Zakat on gold') : T('রুপার যাকাত', 'Zakat on silver')}</h3>
            ${kzUnitSel()}
            ${kzField(isGold ? 'gold.g' : 'silver.g', isGold ? T('সোনার ওজন', 'Weight of gold') : T('রুপার ওজন', 'Weight of silver'), kzState.unit === 'bhori' ? T('ভরিতে', 'In bhori') : T('গ্রামে', 'In grams'), kzUnitName())}
            ${kzMsg(T('শিয়া ফিকহে সাধারণত প্রচলিত মুদ্রা হিসেবে ঢালাই (মিন্ট করা) সোনা-রুপার মুদ্রায় যাকাত ওয়াজিব; অলংকার ও বার/টুকরোর ক্ষেত্রে মারজাভেদে মত ভিন্ন। টানা ১২ চান্দ্র মাস মালিকানা শর্ত।', 'In Shia fiqh zakat is generally due on minted gold/silver coins used as currency; for ornaments and bullion rulings differ by marja. Ownership for 12 full lunar months is required.'), 'info')}
        </div>`;
    } else {
        inner = `
        <div class="kz-card">
            <h3 class="kz-h">${T('গবাদিপশুর যাকাত (সংক্ষেপ)', 'Livestock zakat (overview)')}</h3>
            <div class="kz-table-wrap"><table class="kz-table">
                <thead><tr><th>${T('পশু', 'Animal')}</th><th>${T('প্রথম নিসাব', 'First nisab')}</th><th>${T('প্রদেয়', 'Due')}</th></tr></thead>
                <tbody>
                    <tr><td>${T('উট', 'Camels')}</td><td>${kzFmt(5, 0)}</td><td>${T('১টি ভেড়া/ছাগল', '1 sheep/goat')}</td></tr>
                    <tr><td>${T('গরু/মহিষ', 'Cattle')}</td><td>${kzFmt(30, 0)}</td><td>${T('১ বছরের ১টি বাছুর', 'A 1-year-old calf')}</td></tr>
                    <tr><td>${T('ভেড়া/ছাগল', 'Sheep/goats')}</td><td>${kzFmt(40, 0)}</td><td>${T('১টি ভেড়া/ছাগল', '1 sheep/goat')}</td></tr>
                </tbody>
            </table></div>
            ${kzMsg(T('বাংলাদেশে গরু-মহিষ-ছাগল সাধারণত বাড়ি বা গোয়ালে খাবার দিয়ে পালন করা হয়, কৃষিকাজে খাটানো হয় বা কোরবানির জন্য কেনা হয়। এমন পশু বছরের অধিকাংশ সময় মুক্ত চারণভূমিতে চরে না, তাই এই শর্তে সাধারণত যাকাত ওয়াজিব নয়। লাভের উদ্দেশ্যে খামার/ব্যবসার আয়ের উদ্বৃত্ত খুমুসের অংশ। ⚖️ মারজাভেদে ভিন্ন হতে পারে।', 'In Bangladesh cattle, buffalo and goats are usually stall-fed at home, used for farm work or bought for Qurbani. Such animals do not graze freely for most of the year, so zakat is generally not obligatory under this condition. Surplus income from a farm or livestock trade is part of khums. ⚖️ May differ by marja.'), 'info')}
            ${kzMsg(T('শর্ত: পশু বছরের অধিকাংশ সময় প্রাকৃতিক চারণভূমিতে চরে খায় এবং (উট/গরুর ক্ষেত্রে) কাজে ব্যবহৃত নয়; টানা ১২ চান্দ্র মাস মালিকানা। পরবর্তী ধাপের সংখ্যা ও প্রদেয় পশুর বিস্তারিত হিসাব মারজার তাওযীহুল মাসায়েলে দেখুন।', 'Conditions: the animals graze freely for most of the year and (camels/cattle) are not used for work; 12 full lunar months of ownership. For later steps and exact dues see your marja\'s manual.'), 'info')}
        </div>`;
    }
    const hasResult = kzState.zsub !== 'cattle';
    return `
    <div class="kz-card text-center">
        <p class="arabic-text" dir="rtl" style="font-size:1.45rem;line-height:2.1;color:${d ? '#c9a227' : '#92400e'}">خُذْ مِنْ أَمْوَالِهِمْ صَدَقَةً تُطَهِّرُهُمْ وَتُزَكِّيهِم بِهَا</p>
        <p class="kz-hint" style="margin-top:6px">${T('সূরা আত-তাওবা: ১০৩', 'Surah At-Tawbah: 103')}</p>
    </div>
    <div class="kz-subtabs" role="tablist">
        ${subs.map(s => `<button type="button" role="tab" aria-selected="${kzState.zsub === s[0]}" class="kz-sub${kzState.zsub === s[0] ? ' on' : ''}" data-kz-sub="${s[0]}">${s[1]}</button>`).join('')}
    </div>
    ${inner}
    ${hasResult ? '<div id="kz-result" class="kz-result" aria-live="polite"></div>' : ''}`;
}

function kzBodyZakatInfo() {
    const l = state.language, T = (b, e) => l === 'bn' ? b : e;
    return kzInfo(T('যাকাত কোন কোন খাতে ওয়াজিব? (শিয়া ফিকহ)', 'What is zakat due on? (Shia fiqh)'), `
        <p>${T('নয়টি খাতে: গম, যব, খেজুর, কিশমিশ, সোনা, রুপা, উট, গরু ও ভেড়া/ছাগল। নিসাব পূর্ণ হতে হবে।', 'On nine items: wheat, barley, dates, raisins, gold, silver, camels, cattle and sheep/goats — once the nisab is reached.')}</p>
        <ul style="margin-top:8px">
            <li>${T('সোনা, রুপা ও গবাদিপশুর ক্ষেত্রে টানা ১২ চান্দ্র মাস মালিকানা শর্ত (১১ মাস পূর্ণ হয়ে ১২তম মাসে ঢুকলেই ওয়াজিব)।', 'For gold, silver and livestock, 12 full lunar months of ownership are needed (due once the 12th month begins).')}</li>
            <li>${T('ফসলে এক বছরের শর্ত নেই; ফসল তোলার সময় নিসাব পূর্ণ হলেই ওয়াজিব।', 'Crops have no one-year condition; zakat is due when the nisab is met at harvest.')}</li>
            <li>${T('ফসলের খরচ বাদ দেওয়ার বিধান মারজাভেদে ভিন্ন — এখানে মোট ফসলের ওপর হিসাব দেখানো হয়েছে।', 'Whether harvest costs may be deducted differs by marja — figures here use the gross harvest.')}</li>
        </ul>`)
        + kzInfo(T('যাকাত কারা পাবে?', 'Who can receive zakat?'), `
        <p>${T('(সূরা আত-তাওবা: ৬০) — ফকির, মিসকিন, যাকাত সংগ্রহ/বণ্টনকারী, যাদের মন জয় করা প্রয়োজন, দাসমুক্তি, ঋণগ্রস্ত, আল্লাহর পথে (ফি সাবিলিল্লাহ) ও অভাবী মুসাফির।', '(Surah At-Tawbah: 60) — the poor, the needy, zakat collectors, those whose hearts are to be reconciled, freeing captives, debtors, in the way of Allah, and the stranded traveller.')}</p>
        <p style="margin-top:8px">${T('যার ভরণপোষণ আপনার ওপর ওয়াজিব (বাবা-মা, সন্তান, স্ত্রী) তাকে যাকাত দেওয়া যায় না।', 'Zakat cannot be given to those whose maintenance is obligatory on you (parents, children, spouse).')}</p>`);
}

function kzBodyGeneral() {
    const l = state.language, T = (b, e) => l === 'bn' ? b : e, u = kzState.cur;
    return `
    <div class="kz-card">
        <h3 class="kz-h">${T('সম্পদের তালিকা', 'Your assets')}</h3>
        ${kzField('gen.cash', T('নগদ টাকা ও ব্যাংক জমা', 'Cash & bank balance'), '', u)}
        ${kzUnitSel()}
        ${kzField('gen.goldG', T('সোনার ওজন', 'Gold weight'), T('অলংকারসহ, ', 'Including jewellery, ') + (kzState.unit === 'bhori' ? T('ভরিতে', 'in bhori') : T('গ্রামে', 'in grams')), kzUnitName())}
        ${kzField('gen.goldP', kzState.unit === 'bhori' ? T('সোনার দাম (প্রতি ভরি)', 'Gold price per bhori') : T('সোনার দাম (প্রতি গ্রাম)', 'Gold price per gram'), T('বাজুস/স্থানীয় বাজারের বর্তমান দাম। ২২/২১/১৮ ক্যারেট হলে খাঁটি সমমান ওজন (ওজন × ক্যারেট ÷ ২৪) ও ২৪ ক্যারেটের দাম দিন', 'Current BAJUS/local rate. For 22/21/18 carat use pure-equivalent weight (weight × carat ÷ 24) and the 24-carat rate'), u)}
        ${kzField('gen.silverG', T('রুপার ওজন', 'Silver weight'), kzState.unit === 'bhori' ? T('ভরিতে', 'In bhori') : T('গ্রামে', 'In grams'), kzUnitName())}
        ${kzField('gen.silverP', kzState.unit === 'bhori' ? T('রুপার দাম (প্রতি ভরি)', 'Silver price per bhori') : T('রুপার দাম (প্রতি গ্রাম)', 'Silver price per gram'), T('নিসাব নির্ধারণে লাগে', 'Used to determine the nisab'), u)}
        ${kzField('gen.goods', T('ব্যবসার পণ্য/মজুত', 'Trade goods / stock'), T('বর্তমান বাজারদর', 'At current market value'), u)}
        ${kzField('gen.recv', T('পাওনা (আদায়যোগ্য ঋণ)', 'Money owed to you'), T('আদায়ের সম্ভাবনা আছে এমন', 'Collectible debts only'), u)}
        ${kzField('gen.debts', T('আপনার ঋণ/দেনা', 'Your debts'), T('এখনই পরিশোধযোগ্য', 'Currently payable'), u)}
    </div>
    <div id="kz-result" class="kz-result" aria-live="polite"></div>
    ${kzInfo(T('এই হিসাবটি কী?', 'About this method'), `
        <ul>
            <li>${T('নিট সম্পদ নিসাব ছুঁলে ২.৫% — টানা এক চান্দ্র বছর মালিকানা শর্ত। নিসাব: রুপা ৬১২.৩৬ গ্রাম (৫২.৫ তোলা) বা সোনা ৮৭.৪৮ গ্রাম (৭.৫ তোলা)।', '2.5% once net wealth reaches the nisab and is held for a lunar year. Nisab: 612.36 g silver (52.5 tola) or 87.48 g gold (7.5 tola).')}</li>
            <li>${T('শিয়া ফিকহে নয় খাতের বাইরে (যেমন নগদ টাকা) যাকাত ওয়াজিব নয়; ব্যবসার পণ্যে মুস্তাহাব বলা হয়েছে। অন্যান্য মাযহাবে এই ২.৫% যাকাত ওয়াজিব।', 'In Shia fiqh zakat is not obligatory outside the nine items (e.g. cash); it is recommended on trade goods. Other madhhabs treat this 2.5% as obligatory.')}</li>
        </ul>`)}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
function kzInner() {
    const l = state.language, T = (b, e) => l === 'bn' ? b : e, d = state.darkMode;
    const tabs = [['khums', T('খুমুস', 'Khums')], ['zakat', T('যাকাত (৯ খাত)', 'Zakat (9 items)')], ['general', T('সাধারণ যাকাত', 'General Zakat')]];
    let body = '', info = '';
    if (kzState.tab === 'khums') {
        body = kzBodyKhums() + '<div id="kz-result" class="kz-result" aria-live="polite"></div>';
        info = kzBodyYear() + kzBodyPays() + kzBodyKcLinks('khums') + kzBodyKhumsInfo();
    } else if (kzState.tab === 'zakat') {
        body = kzBodyZakat();
        info = kzBodyKcLinks('zakat') + kzBodyPays() + kzBodyUnits() + kzBodyZakatInfo();
    } else {
        body = kzBodyGeneral();
        info = kzBodyKcLinks('zakat') + kzBodyUnits();
    }
    const r = kzCalcCurrent();
    window._kzShareText = r ? r.text : '';
    // Pre-fill the result block into the markup (no post-render hook needed).
    // (function replacer: r.html may contain '$' from the currency symbol, which String.replace would treat specially)
    if (r) body = body.replace('<div id="kz-result" class="kz-result" aria-live="polite"></div>', () => `<div id="kz-result" class="kz-result" aria-live="polite">${r.html}</div>`);
    return `
    <div>
        <h2 class="text-3xl font-black" style="background:linear-gradient(135deg,#059669,#c9a227);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">🧮 ${T('খুমুস ও যাকাত ক্যালকুলেটর', 'Khums & Zakat Calculator')}</h2>
        <p class="text-sm ${d ? 'text-gray-400' : 'text-gray-500'} mt-1">${T('আপনার খুমুস ও যাকাতের আনুমানিক হিসাব', 'An indicative calculation of your khums and zakat')}</p>
    </div>
    <div class="kz-toolbar">
        <div class="kz-tabs" role="tablist">
            ${tabs.map(t => `<button type="button" role="tab" aria-selected="${kzState.tab === t[0]}" class="kz-tab${kzState.tab === t[0] ? ' on' : ''}" data-kz-tab="${t[0]}">${t[1]}</button>`).join('')}
        </div>
        <label class="kz-cur" title="${T('মুদ্রা', 'Currency')}">
            <span class="kz-hint" style="display:inline;margin:0">${T('মুদ্রা', 'Currency')}</span>
            <select class="kz-select" data-kz-cur aria-label="${T('মুদ্রা', 'Currency')}">
                ${KZ_CURS.map(c => `<option value="${c}"${c === kzState.cur ? ' selected' : ''}>${c}</option>`).join('')}
            </select>
        </label>
    </div>
    ${body}
    <div class="kz-actions">
        <button type="button" class="kz-btn" id="kz-share-btn" data-kz-act="share"${r && r.text ? '' : ' disabled'}>📤 ${T('ফলাফল শেয়ার', 'Share result')}</button>
        <button type="button" class="kz-btn kz-btn-ghost" data-kz-act="reset">↺ ${T('মুছে নতুন করে', 'Reset')}</button>
    </div>
    ${info}
    <p class="kz-disclaimer">${T('এটি আনুমানিক হিসাব। নিসাব, শর্ত ও খুমুস-বর্ষের বিধান মারজা অনুযায়ী ভিন্ন হতে পারে — চূড়ান্ত সিদ্ধান্তের জন্য আপনার মারজায়ে তাকলিদ বা তাঁর প্রতিনিধির সাথে যোগাযোগ করুন। আপনার দেওয়া তথ্য শুধু আপনার ডিভাইসেই থাকে।', 'This is an indicative calculation. Nisab, conditions and khums-year rules can differ between marajiʿ — consult your marja or his representative for a final ruling. Your inputs stay on your device only.')}</p>`;
}

function renderKhumsZakatPage() {
    if (!kzState) kzState = kzLoad();
    kzBindEvents();
    return `<div id="kz-root" class="kz space-y-6 page-enter">${kzInner()}</div>`;
}

function kzRefresh() {
    const root = document.getElementById('kz-root');
    if (!root) return;
    root.innerHTML = kzInner();
}

// ---------------------------------------------------------------------------
// Events (delegated, bound once)
// ---------------------------------------------------------------------------
function kzBindEvents() {
    if (window._kzBound) return;
    window._kzBound = true;

    const onField = e => {
        const t = e.target;
        if (!t || !t.getAttribute || !kzState) return;
        if (t.hasAttribute('data-kz-cur')) {
            if (KZ_CURS.indexOf(t.value) > -1 && t.value !== kzState.cur) { kzState.cur = t.value; kzSave(); kzRefresh(); }
            return;
        }
        if (t.hasAttribute('data-kz-unit')) {
            if (KZ_METAL_UNITS.indexOf(t.value) > -1 && t.value !== kzState.unit) { kzConvertUnits('metal', kzState.unit, t.value); kzState.unit = t.value; kzSave(); kzRefresh(); }
            return;
        }
        if (t.hasAttribute('data-kz-cunit')) {
            if (KZ_CROP_UNITS.indexOf(t.value) > -1 && t.value !== kzState.cunit) { kzConvertUnits('crop', kzState.cunit, t.value); kzState.cunit = t.value; kzSave(); kzRefresh(); }
            return;
        }
        if (t.hasAttribute('data-kz-ydate')) {
            if (e.type === 'change' && (t.value === '' || kzIsDate(t.value))) { kzState.year.start = t.value; kzSave(); kzRefresh(); }
            return;
        }
        if (t.hasAttribute('data-kz-ytype')) {
            if (KZ_YTYPES.indexOf(t.value) > -1) { kzState.year.type = t.value; kzSave(); kzRefresh(); }
            return;
        }
        if (t.hasAttribute('data-kz-pf')) {
            const pff = t.getAttribute('data-kz-pf');
            if (pff === 'd') { if (t.value === '' || kzIsDate(t.value)) kzState.pf.d = t.value; }
            else if (pff === 'k') { if (KZ_PKINDS.indexOf(t.value) > -1) kzState.pf.k = t.value; }
            else if (pff === 'n') { kzState.pf.n = String(t.value).replace(/[<>]/g, '').slice(0, 40); }
            kzSave();
            return;
        }
        const path = t.getAttribute('data-kz');
        if (!path) return;
        const p = path.split('.');
        if (!kzState[p[0]] || !Object.prototype.hasOwnProperty.call(kzState[p[0]], p[1])) return;
        let v;
        if (p[0] === 'crop' && p[1] === 'kind') { if (KZ_CROPS.indexOf(t.value) < 0) return; v = t.value; }
        else if (p[0] === 'fit' && p[1] === 'kind') { if (KZ_FKINDS.indexOf(t.value) < 0) return; v = t.value; }
        else if (p[0] === 'crop' && p[1] === 'irrig') { if (KZ_IRRIG.indexOf(t.value) < 0) return; v = t.value; }
        else v = kzCleanNum(t.value);
        kzState[p[0]][p[1]] = v;
        kzSave();
        kzCalc();
    };
    document.addEventListener('input', onField);
    document.addEventListener('change', onField);

    document.addEventListener('click', e => {
        const el = e.target.closest && e.target.closest('[data-kz-tab],[data-kz-sub],[data-kz-act]');
        if (!el || !kzState || !document.getElementById('kz-root')) return;
        if (el.hasAttribute('data-kz-tab')) {
            const v = el.getAttribute('data-kz-tab');
            if (KZ_TABS.indexOf(v) > -1) { kzState.tab = v; kzSave(); kzRefresh(); }
        } else if (el.hasAttribute('data-kz-sub')) {
            const v = el.getAttribute('data-kz-sub');
            if (KZ_SUBS.indexOf(v) > -1) { kzState.zsub = v; kzSave(); kzRefresh(); }
        } else {
            const act = el.getAttribute('data-kz-act');
            if (kzExtraAct(act, el)) return;
            if (act === 'share') {
                const txt = window._kzShareText;
                if (!txt) return;
                const l = state.language;
                if (typeof shareContent === 'function') shareContent('🧮 ' + (l === 'bn' ? 'খুমুস ও যাকাত' : 'Khums & Zakat'), txt, '');
            } else if (act === 'reset') {
                const def = kzDefault();
                if (kzState.tab === 'khums') kzState.khums = def.khums;
                else if (kzState.tab === 'general') kzState.gen = def.gen;
                else if (kzState.zsub === 'crop') kzState.crop = def.crop;
                else if (kzState.zsub === 'fitra') kzState.fit = def.fit;
                else if (kzState.zsub === 'gold') kzState.gold = def.gold;
                else if (kzState.zsub === 'silver') kzState.silver = def.silver;
                kzSave(); kzRefresh();
            }
        }
    });
}
