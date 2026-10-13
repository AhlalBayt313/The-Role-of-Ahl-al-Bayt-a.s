// ============================================================================
// QUIZ PLUS  (v121)
// ----------------------------------------------------------------------------
// Adds a learning/progress layer on top of the existing quiz (script-1-core.js
// quiz actions + script-3-pages.js quiz screens — both unchanged in spirit,
// they just call the hooks below):
//
//   1. XP, 8 levels and 12 badges           (persisted: ahlbayt_quiz_profile)
//   2. Daily-quiz completion + day streak   (same profile object)
//   3. Mistake bank — wrong questions are remembered across sessions and can
//      be practised; 2 correct answers in a row clears a question
//                                           (persisted: ahlbayt_quiz_mistakes)
//   4. Flashcard study mode                 (session-only)
//   5. "My progress" page                   (stage 'stats')
//   6. Result-screen summary (XP, level-up, new badges, per-category split)
//
// Loads after script-3-pages.js and before script-4-boot.js. Needs (all from
// earlier scripts): state, saveState, showToast, sanitize, toBengaliDigits,
// quizCategories, quizCatLabel, quizCatColor, quizDiffLabel, getAllQuizQuestions,
// getFilteredQuizQuestions, buildQuizSession, shuffleArray, quizTimerClear.
//
// Persisted values are validated on first use (qpNormalizeProfile /
// qpNormalizeMistakes) — nothing read from localStorage reaches innerHTML or
// is used as an object key without a whitelist check.
// ============================================================================

const QP_LEVELS = [0, 100, 250, 500, 900, 1400, 2100, 3000];
const QP_LEVEL_NAMES = [
    { bn: 'তালিবে ইলম', en: 'Seeker' }, { bn: 'শিক্ষার্থী', en: 'Learner' },
    { bn: 'পাঠক', en: 'Reader' }, { bn: 'জ্ঞানান্বেষী', en: 'Inquirer' },
    { bn: 'জ্ঞানী', en: 'Knowledgeable' }, { bn: 'নিবেদিত', en: 'Devoted' },
    { bn: 'বিশিষ্ট', en: 'Distinguished' }, { bn: 'ওস্তাদ', en: 'Master' }
];
const QP_XP = { easy: 10, medium: 15, hard: 20 };
const QP_MAX = 1e7;

const QP_BADGES = [
    { id: 'first',    ic: '🌱', bn: 'প্রথম পদক্ষেপ', en: 'First Step',   dbn: 'প্রথম কুইজ শেষ করুন', den: 'Finish your first quiz', t: p => p.quizzes >= 1 },
    { id: 'perfect',  ic: '🎯', bn: 'নিখুঁত', en: 'Flawless',             dbn: '৫+ প্রশ্নের কুইজে ১০০%', den: 'Score 100% on a quiz of 5+ questions', t: p => p.perfect >= 1 },
    { id: 'row10',    ic: '⚡', bn: 'টানা ১০', en: 'On a Roll',           dbn: 'টানা ১০টি সঠিক উত্তর', den: '10 correct answers in a row', t: p => p.bestRow >= 10 },
    { id: 'ans100',   ic: '📚', bn: 'শত প্রশ্ন', en: 'Century',            dbn: 'মোট ১০০ প্রশ্নের উত্তর দিন', den: 'Answer 100 questions', t: p => p.answered >= 100 },
    { id: 'ans500',   ic: '🏛️', bn: 'পাঁচশো', en: '500 Club',            dbn: 'মোট ৫০০ প্রশ্নের উত্তর দিন', den: 'Answer 500 questions', t: p => p.answered >= 500 },
    { id: 'hard10',   ic: '🧗', bn: 'কঠিন জয়', en: 'Hard Hitter',        dbn: '১০টি কঠিন প্রশ্নের সঠিক উত্তর', den: 'Get 10 hard questions right', t: p => p.hardCorrect >= 10 },
    { id: 'spec',     ic: '🎓', bn: 'বিশেষজ্ঞ', en: 'Specialist',         dbn: 'কোনো ক্যাটাগরিতে ২০+ উত্তরে ৮০%+ সঠিক', den: '80%+ accuracy over 20+ answers in one category',
      t: p => Object.keys(p.cats).some(k => p.cats[k].a >= 20 && p.cats[k].c / p.cats[k].a >= 0.8) },
    { id: 'fixer',    ic: '🔧', bn: 'ভুল শুধরানো', en: 'Error Fixer',     dbn: '১০টি ভুল প্রশ্ন আয়ত্ত করুন', den: 'Master 10 questions from your mistake bank', t: p => p.mastered >= 10 },
    { id: 'streak3',  ic: '🔥', bn: '৩ দিনের ধারা', en: '3-Day Streak',   dbn: 'টানা ৩ দিন আজকের কুইজ শেষ করুন', den: 'Finish the daily quiz 3 days in a row', t: p => p.daily.best >= 3 },
    { id: 'streak7',  ic: '✨', bn: '৭ দিনের ধারা', en: '7-Day Streak',   dbn: 'টানা ৭ দিন আজকের কুইজ শেষ করুন', den: 'Finish the daily quiz 7 days in a row', t: p => p.daily.best >= 7 },
    { id: 'streak30', ic: '👑', bn: '৩০ দিনের ধারা', en: '30-Day Streak', dbn: 'টানা ৩০ দিন আজকের কুইজ শেষ করুন', den: 'Finish the daily quiz 30 days in a row', t: p => p.daily.best >= 30 },
    { id: 'lvl5',     ic: '⭐', bn: 'লেভেল ৫', en: 'Level 5',             dbn: 'লেভেল ৫-এ পৌঁছান', den: 'Reach level 5', t: p => qpLevelInfo(p.xp).num >= 5 }
];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
function qpT(b, e) { return state.language === 'bn' ? b : e; }
function qpN(n) { return state.language === 'bn' ? toBengaliDigits(n) : String(n); }
function qpInt(v, max) {
    const n = Math.floor(Number(v));
    return (isFinite(n) && n > 0) ? Math.min(n, max || QP_MAX) : 0;
}
function qpSafeKey(k) { return typeof k === 'string' && /^[A-Za-z0-9-]{1,24}$/.test(k); }   // no "_" → "__proto__" can never match
function qpSafeId(k) { return typeof k === 'string' && /^[A-Za-z0-9-]{1,40}$/.test(k); }
function qpIsDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }
function qpDateStr(dt) { return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0'); }
function qpToday() { return qpDateStr(new Date()); }
function qpYesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return qpDateStr(d); }

// ---------------------------------------------------------------------------
// Profile / mistakes — load-time validation (lazy, once per state object)
// ---------------------------------------------------------------------------
function qpDefaultProfile() {
    return { xp: 0, answered: 0, correct: 0, hardCorrect: 0, bestRow: 0, quizzes: 0, perfect: 0, mastered: 0,
        cats: {}, daily: { last: '', streak: 0, best: 0, done: {} }, badges: {} };
}
function qpNormalizeProfile(raw) {
    const p = qpDefaultProfile();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return p;
    ['xp', 'answered', 'correct', 'hardCorrect', 'bestRow', 'quizzes', 'perfect', 'mastered'].forEach(k => { p[k] = qpInt(raw[k]); });
    if (p.correct > p.answered) p.correct = p.answered;
    if (raw.cats && typeof raw.cats === 'object' && !Array.isArray(raw.cats)) {
        Object.keys(raw.cats).slice(0, 40).forEach(k => {
            const v = raw.cats[k];
            if (!qpSafeKey(k) || !v || typeof v !== 'object') return;
            const a = qpInt(v.a), c = Math.min(qpInt(v.c), a);
            if (a > 0) p.cats[k] = { a: a, c: c };
        });
    }
    const d = raw.daily;
    if (d && typeof d === 'object') {
        p.daily.last = qpIsDate(d.last) ? d.last : '';
        p.daily.streak = qpInt(d.streak, 100000);
        p.daily.best = Math.max(qpInt(d.best, 100000), p.daily.streak);
        if (d.done && typeof d.done === 'object' && !Array.isArray(d.done)) {
            Object.keys(d.done).filter(qpIsDate).sort().slice(-60).forEach(k => {
                const v = d.done[k];
                if (v && typeof v === 'object') p.daily.done[k] = { s: qpInt(v.s, 100), t: qpInt(v.t, 100) };
            });
        }
    }
    if (raw.badges && typeof raw.badges === 'object' && !Array.isArray(raw.badges)) {
        QP_BADGES.forEach(b => {
            if (Object.prototype.hasOwnProperty.call(raw.badges, b.id) && qpIsDate(raw.badges[b.id])) p.badges[b.id] = raw.badges[b.id];
        });
    }
    return p;
}
function qpNormalizeMistakes(raw) {
    const m = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return m;
    Object.keys(raw).slice(0, 600).forEach(id => {
        const v = raw[id];
        if (!qpSafeId(id) || !v || typeof v !== 'object') return;
        m[id] = { s: Math.min(qpInt(v.s, 1), 1), w: qpInt(v.w, 1000) || 1, d: qpIsDate(v.d) ? v.d : qpToday() };
    });
    return m;
}
let _qpProfRef = null, _qpMistRef = null;
function qpP() {
    if (!state.quizProfile || state.quizProfile !== _qpProfRef) { state.quizProfile = qpNormalizeProfile(state.quizProfile); _qpProfRef = state.quizProfile; }
    return state.quizProfile;
}
function qpM() {
    if (!state.quizMistakes || state.quizMistakes !== _qpMistRef) { state.quizMistakes = qpNormalizeMistakes(state.quizMistakes); _qpMistRef = state.quizMistakes; }
    return state.quizMistakes;
}

// ---------------------------------------------------------------------------
// Levels, streak, mistakes lookups
// ---------------------------------------------------------------------------
function qpLevelInfo(xp) {
    let lv = 0;
    for (let i = 0; i < QP_LEVELS.length; i++) if (xp >= QP_LEVELS[i]) lv = i;
    const max = lv >= QP_LEVELS.length - 1;
    const base = QP_LEVELS[lv], next = max ? base : QP_LEVELS[lv + 1];
    return { lv: lv, num: lv + 1, name: QP_LEVEL_NAMES[lv], xp: xp, base: base, next: next, max: max,
        pct: max ? 100 : Math.max(0, Math.min(100, Math.round((xp - base) / (next - base) * 100))) };
}
function qpLevelName(info) { return state.language === 'bn' ? info.name.bn : info.name.en; }
function qpStreakNow() {
    const d = qpP().daily;
    return (d.last === qpToday() || d.last === qpYesterday()) ? d.streak : 0;
}
function qpDailyDoneToday() { return qpP().daily.done[qpToday()] || null; }
function qpAccuracy(a, c) { return a > 0 ? Math.round(c / a * 100) : 0; }
function qpMistakeQuestions() {
    const m = qpM(), byId = {};
    getAllQuizQuestions().forEach(q => { if (qpSafeId(q.id)) byId[q.id] = q; });
    return Object.keys(m).filter(id => Object.prototype.hasOwnProperty.call(byId, id)).map(id => byId[id]);
}
function qpBadgeDef(id) { return QP_BADGES.find(b => b.id === id); }
function qpCheckBadges() {
    const p = qpP(), out = [];
    QP_BADGES.forEach(b => { if (!p.badges[b.id] && b.t(p)) { p.badges[b.id] = qpToday(); out.push(b.id); } });
    return out;
}

// ---------------------------------------------------------------------------
// Hooks called from script-1-core.js
// ---------------------------------------------------------------------------
function quizPlusSessionStart(mode) {
    state.quizMode = mode || 'normal';
    state.quizRow = 0;
    state.quizSessionXp = 0;
    state.quizSessionMastered = 0;
    state.quizSessionStartXp = qpP().xp;
    state.quizSummary = null;
}

// One call per answered (or timed-out) question.
function quizPlusRecordAnswer(q, correct) {
    if (!q) return;
    const p = qpP(), m = qpM();
    const ck = qpSafeKey(q.category) ? q.category : 'general';
    if (!p.cats[ck]) p.cats[ck] = { a: 0, c: 0 };
    p.answered = Math.min(p.answered + 1, QP_MAX);
    p.cats[ck].a++;
    if (correct) {
        p.correct = Math.min(p.correct + 1, QP_MAX);
        p.cats[ck].c++;
        if (q.difficulty === 'hard') p.hardCorrect++;
        const gain = QP_XP[q.difficulty] || 10;
        p.xp = Math.min(p.xp + gain, QP_MAX);
        state.quizSessionXp = (state.quizSessionXp || 0) + gain;
        state.quizRow = (state.quizRow || 0) + 1;
        if (state.quizRow > p.bestRow) p.bestRow = state.quizRow;
        if (qpSafeId(q.id) && Object.prototype.hasOwnProperty.call(m, q.id)) {
            m[q.id].s++;
            if (m[q.id].s >= 2) { delete m[q.id]; p.mastered++; state.quizSessionMastered = (state.quizSessionMastered || 0) + 1; }
        }
    } else {
        state.quizRow = 0;
        if (qpSafeId(q.id)) {
            const prev = Object.prototype.hasOwnProperty.call(m, q.id) ? m[q.id].w : 0;
            m[q.id] = { s: 0, w: Math.min(prev + 1, 1000), d: qpToday() };
        }
    }
    saveState();
}

// Called by finishQuiz(). Applies bonuses, daily streak, badges; returns the
// summary object the result screen renders.
function quizPlusFinish(total, pct) {
    const p = qpP();
    const mode = state.quizMode || 'normal';
    p.quizzes++;
    let bonusPerfect = 0, dailyBonus = 0, dailyFirst = false;
    if (pct === 100 && total >= 5) { p.perfect++; bonusPerfect = 25; }
    if (mode === 'daily') {
        const today = qpToday();
        if (!p.daily.done[today]) {
            dailyFirst = true;
            p.daily.streak = (p.daily.last === qpYesterday()) ? p.daily.streak + 1 : 1;
            p.daily.last = today;
            if (p.daily.streak > p.daily.best) p.daily.best = p.daily.streak;
            p.daily.done[today] = { s: state.quizScore, t: total };
            Object.keys(p.daily.done).sort().slice(0, -60).forEach(k => { delete p.daily.done[k]; });
            dailyBonus = 30 + Math.min(p.daily.streak, 7) * 5;
        }
    }
    const bonus = bonusPerfect + dailyBonus;
    p.xp = Math.min(p.xp + bonus, QP_MAX);
    state.quizSessionXp = (state.quizSessionXp || 0) + bonus;
    const from = qpLevelInfo(state.quizSessionStartXp || 0).num, to = qpLevelInfo(p.xp).num;
    const newBadges = qpCheckBadges();

    // per-category split of this session (only useful when >1 category)
    const cats = {};
    state.quizPool.forEach(q => { const k = q.category || 'general'; if (!cats[k]) cats[k] = { t: 0, c: 0 }; cats[k].t++; cats[k].c++; });
    state.quizWrong.forEach(w => { const k = w.q.category || 'general'; if (cats[k]) cats[k].c--; });

    saveState();
    return { mode: mode, xp: state.quizSessionXp, bonusPerfect: bonusPerfect, dailyBonus: dailyBonus, dailyFirst: dailyFirst,
        streak: qpStreakNow(), lvFrom: from, lvTo: to, newBadges: newBadges, mastered: state.quizSessionMastered || 0, cats: cats };
}

function quizPlusReset() {
    if (!confirm(qpT('কুইজের XP, লেভেল, ব্যাজ, স্ট্রিক ও ভুলের ব্যাংক মুছে ফেলবেন? এটা ফেরানো যাবে না।', 'Delete your quiz XP, levels, badges, streak and mistake bank? This cannot be undone.'))) return;
    state.quizProfile = qpDefaultProfile();
    state.quizMistakes = {};
    saveState();
    render();
    showToast(qpT('অগ্রগতি মুছে ফেলা হয়েছে', 'Progress reset'), 'success');
}

// ---------------------------------------------------------------------------
// Session starters: mistake practice + flashcards
// ---------------------------------------------------------------------------
function quizPlusStartMistakes() {
    const qs = qpMistakeQuestions();
    if (!qs.length) { showToast(qpT('ভুলের ব্যাংক খালি — চমৎকার! 🎉', 'Your mistake bank is empty — well done! 🎉'), 'success'); return; }
    const m = qpM();
    const sorted = shuffleArray(qs).sort((a, b) => m[a.id].s - m[b.id].s);
    const n = Math.min(Math.max(state.quizLength || 10, 5), sorted.length);
    quizTimerClear();
    state.quizPool = buildQuizSession(sorted.slice(0, n), n);
    state.quizIndex = 0; state.quizScore = 0; state.quizAnswered = null; state.quizWrong = [];
    state.quizFinished = false; state.quizIsDaily = false;
    state.quizStage = 'playing';
    quizPlusSessionStart('mistakes');
    if (state.quizTimerEnabled) quizTimerStart();
    render();
}

function quizPlusStartFlash() {
    const pool = getFilteredQuizQuestions(state.quizCategory, state.quizDifficulty);
    if (!pool.length) { showToast(qpT('এই ফিল্টারে কোনো প্রশ্ন নেই', 'No questions for this filter'), 'warning'); return; }
    const n = Math.min(state.quizLength || 10, pool.length);
    quizTimerClear();
    state.quizFlash = { deck: shuffleArray(pool).slice(0, n), i: 0, flipped: false, known: 0, again: 0 };
    state.quizStage = 'flash';
    render();
}
function quizPlusFlashFlip() {
    if (!state.quizFlash) return;
    state.quizFlash.flipped = true;
    render();
}
function quizPlusFlashMark(known) {
    const f = state.quizFlash;
    if (!f || !f.flipped) return;
    const q = f.deck[f.i];
    if (known) f.known++;
    else {
        f.again++;
        if (q && qpSafeId(q.id)) {
            const m = qpM();
            const prev = Object.prototype.hasOwnProperty.call(m, q.id) ? m[q.id].w : 0;
            m[q.id] = { s: 0, w: Math.min(prev + 1, 1000), d: qpToday() };
            saveState();
        }
    }
    f.i++; f.flipped = false;
    if (f.i >= f.deck.length) state.quizStage = 'flashDone';
    render();
}

// ---------------------------------------------------------------------------
// Setup-screen pieces
// ---------------------------------------------------------------------------
function quizPlusProfileCard(d, l) {
    const p = qpP(), L = qpLevelInfo(p.xp);
    const got = Object.keys(p.badges).length;
    const xpText = L.max ? (qpN(L.xp) + ' XP · MAX') : (qpN(L.xp) + ' / ' + qpN(L.next) + ' XP');
    return `
    <button type="button" data-action="quizShowStats" class="qp-profile reveal" aria-label="${qpT('আমার অগ্রগতি দেখুন', 'View my progress')}">
        <span class="qp-lvl" aria-hidden="true">${qpN(L.num)}</span>
        <span class="qp-prof-main">
            <span class="qp-prof-top"><b>${qpT('লেভেল', 'Level')} ${qpN(L.num)} · ${sanitize(qpLevelName(L))}</b><span class="qp-xp">${xpText}</span></span>
            <span class="qp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${L.pct}" aria-label="XP"><i style="width:${L.pct}%"></i></span>
            <span class="qp-chips">
                <span>🔥 ${qpN(qpStreakNow())} ${qpT('দিন', 'day')}</span>
                <span>🎯 ${qpN(qpAccuracy(p.answered, p.correct))}%</span>
                <span>🏅 ${qpN(got)}/${qpN(QP_BADGES.length)}</span>
            </span>
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true" style="flex-shrink:0;opacity:.5"><path d="M9 5l7 7-7 7"/></svg>
    </button>`;
}

// Subtitle line of the red "Quiz of the Day" card.
function quizPlusDailySub(l) {
    const done = qpDailyDoneToday(), streak = qpStreakNow();
    const base = done
        ? ('✅ ' + qpT('আজকের কুইজ সম্পন্ন', 'Done today') + ' (' + qpN(done.s) + '/' + qpN(done.t) + ') — ' + qpT('আবার অনুশীলন করুন', 'practise again'))
        : qpT('৫টি প্রশ্ন — প্রতিদিন নতুন', '5 questions — new every day');
    return `<p style="font-size:.8rem;color:rgba(255,255,255,.82)">${base}${streak > 0 ? ' · 🔥 ' + qpN(streak) + ' ' + qpT('দিনের ধারা', 'day streak') : ''}</p>`;
}

function quizPlusSetupExtras(d, l) {
    const nM = qpMistakeQuestions().length;
    const nF = getFilteredQuizQuestions(state.quizCategory, state.quizDifficulty).length;
    const nFlash = Math.min(state.quizLength || 10, nF);
    return `
    <div class="reveal">
        <p class="text-sm font-bold mb-3 ${d ? 'text-gray-300' : 'text-gray-600'}">${qpT('অনুশীলন', 'Practice')}</p>
        <div class="qp-tiles">
            ${nM > 0 ? `
            <button type="button" data-action="quizStartMistakes" class="qp-tile qp-tile-warn">
                <span class="qp-tile-ic" aria-hidden="true">🔁</span>
                <span class="qp-tile-t">${qpT('ভুল অনুশীলন', 'Practise mistakes')}</span>
                <span class="qp-tile-s">${qpN(nM)} ${qpT('টি প্রশ্ন বাকি', 'to review')}</span>
            </button>` : ''}
            <button type="button" data-action="quizStartFlash" class="qp-tile" ${nF === 0 ? 'disabled="disabled"' : ''}>
                <span class="qp-tile-ic" aria-hidden="true">🃏</span>
                <span class="qp-tile-t">${qpT('ফ্ল্যাশকার্ড', 'Flashcards')}</span>
                <span class="qp-tile-s">${qpN(nFlash)} ${qpT('টি কার্ড (বর্তমান ফিল্টার)', 'cards (current filter)')}</span>
            </button>
        </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Playing-screen chips
// ---------------------------------------------------------------------------
function quizPlusPlayChips(l) {
    let h = '';
    if (state.quizMode === 'mistakes') h += `<span class="qp-chip qp-chip-warn">🔁 ${qpT('ভুল অনুশীলন', 'Mistake practice')}</span>`;
    if ((state.quizRow || 0) >= 2) h += `<span class="qp-chip qp-chip-fire" aria-live="polite">🔥 ${qpN(state.quizRow)} ${qpT('টানা', 'in a row')}</span>`;
    return h;
}

// ---------------------------------------------------------------------------
// Result-screen summary
// ---------------------------------------------------------------------------
function quizPlusResultExtras(d, l) {
    const s = state.quizSummary;
    if (!s) return '';
    const p = qpP(), L = qpLevelInfo(p.xp);
    const lines = [];
    if (s.bonusPerfect) lines.push(`🎯 ${qpT('নিখুঁত বোনাস', 'Flawless bonus')} +${qpN(s.bonusPerfect)}`);
    if (s.dailyBonus) lines.push(`🔥 ${qpT('দৈনিক বোনাস', 'Daily bonus')} +${qpN(s.dailyBonus)}`);
    const catKeys = Object.keys(s.cats);
    const nM = qpMistakeQuestions().length;
    return `
    <div class="qp-sum reveal max-w-lg mx-auto">
        <div class="qp-sum-head">
            <span class="qp-sum-xp">+${qpN(s.xp)} XP</span>
            <span class="qp-sum-lv">${qpT('লেভেল', 'Level')} ${qpN(L.num)} · ${sanitize(qpLevelName(L))}</span>
        </div>
        <span class="qp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${L.pct}" aria-label="XP"><i style="width:${L.pct}%"></i></span>
        ${lines.length ? `<p class="qp-sum-line">${lines.join(' &nbsp;·&nbsp; ')}</p>` : ''}
        ${s.lvTo > s.lvFrom ? `<div class="qp-banner">🎉 ${qpT('লেভেল আপ!', 'Level up!')} ${qpT('এখন আপনি', 'You are now')} <b>${sanitize(qpLevelName(L))}</b></div>` : ''}
        ${s.mode === 'daily' ? `<p class="qp-sum-line">🔥 ${s.dailyFirst
            ? qpT('আজকের ধারা: ', 'Streak: ') + qpN(s.streak) + ' ' + qpT('দিন', 'day(s)')
            : qpT('আজকের কুইজ আগেই সম্পন্ন — এটা অনুশীলন, ধারায় যোগ হয়নি', 'Daily quiz already done today — this was practice, streak unchanged')}</p>` : ''}
        ${s.mastered ? `<p class="qp-sum-line">🔧 ${qpN(s.mastered)} ${qpT('টি ভুল প্রশ্ন আয়ত্তে এসেছে', 'mistake(s) mastered')}</p>` : ''}
        ${s.newBadges.length ? `
        <div class="qp-newbadges">
            <p class="qp-sum-line" style="font-weight:800">🏅 ${qpT('নতুন ব্যাজ!', 'New badge!')}</p>
            <div class="qp-badge-row">${s.newBadges.map(id => { const b = qpBadgeDef(id); return b ? `<span class="qp-badge-pill"><span aria-hidden="true">${b.ic}</span> ${sanitize(l === 'bn' ? b.bn : b.en)}</span>` : ''; }).join('')}</div>
        </div>` : ''}
        ${catKeys.length > 1 ? `
        <div class="qp-catsplit">
            <p class="qp-sum-line" style="font-weight:800">${qpT('ক্যাটাগরি অনুযায়ী', 'By category')}</p>
            ${catKeys.map(k => { const v = s.cats[k], pc = Math.round(Math.max(0, v.c) / v.t * 100), cc = quizCatColor(k);
                return `<div class="qp-catrow"><span class="qp-catname">${sanitize(quizCatLabel(k, l))}</span><span class="qp-mini"><i style="width:${pc}%;background:${cc.c}"></i></span><span class="qp-catnum">${qpN(Math.max(0, v.c))}/${qpN(v.t)}</span></div>`; }).join('')}
        </div>` : ''}
        ${nM > 0 && s.mode !== 'mistakes' ? `<button type="button" data-action="quizStartMistakes" class="qp-sum-btn">🔁 ${qpT('ভুলগুলো অনুশীলন করুন', 'Practise your mistakes')} (${qpN(nM)})</button>` : ''}
        <button type="button" data-action="quizShowStats" class="qp-sum-btn qp-sum-btn-ghost">📊 ${qpT('আমার অগ্রগতি', 'My progress')}</button>
    </div>`;
}

// ---------------------------------------------------------------------------
// Page: My progress
// ---------------------------------------------------------------------------
function renderQuizStatsPage() {
    const d = state.darkMode, l = state.language;
    const p = qpP(), L = qpLevelInfo(p.xp);
    const nM = qpMistakeQuestions().length;
    const tiles = [
        ['📝', qpT('মোট উত্তর', 'Answered'), qpN(p.answered)],
        ['🎯', qpT('সঠিকের হার', 'Accuracy'), qpN(qpAccuracy(p.answered, p.correct)) + '%'],
        ['✅', qpT('শেষ করা কুইজ', 'Quizzes done'), qpN(p.quizzes)],
        ['🏆', qpT('সেরা স্কোর', 'Best score'), qpN(state.quizBest || 0) + '%'],
        ['⚡', qpT('সেরা টানা সঠিক', 'Best streak'), qpN(p.bestRow)],
        ['🔥', qpT('দৈনিক ধারা (সেরা)', 'Daily streak (best)'), qpN(qpStreakNow()) + ' (' + qpN(p.daily.best) + ')'],
        ['🔁', qpT('ভুলের ব্যাংক', 'Mistake bank'), qpN(nM)],
        ['🔧', qpT('আয়ত্ত করা ভুল', 'Mistakes mastered'), qpN(p.mastered)]
    ];
    const cats = quizCategories.map(c => ({ key: c.key, a: p.cats[c.key] ? p.cats[c.key].a : 0, c: p.cats[c.key] ? p.cats[c.key].c : 0 }));
    return `
    <div class="space-y-8 qp-stats page-enter">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <h1 class="text-3xl font-bold">📊 ${qpT('আমার অগ্রগতি', 'My Progress')}</h1>
            <button type="button" data-action="quizBackToSetup" class="qp-back">← ${qpT('কুইজে ফিরুন', 'Back to quiz')}</button>
        </div>

        <div class="qp-hero">
            <span class="qp-lvl qp-lvl-lg" aria-hidden="true">${qpN(L.num)}</span>
            <div class="qp-prof-main">
                <p class="qp-hero-t">${qpT('লেভেল', 'Level')} ${qpN(L.num)} · ${sanitize(qpLevelName(L))}</p>
                <span class="qp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${L.pct}" aria-label="XP"><i style="width:${L.pct}%"></i></span>
                <p class="qp-hero-s">${L.max ? qpN(L.xp) + ' XP · ' + qpT('সর্বোচ্চ লেভেল', 'max level') : qpN(L.xp) + ' XP · ' + qpT('পরের লেভেলে আর', '') + qpN(L.next - L.xp) + ' XP' + (l === 'bn' ? ' বাকি' : ' to next level')}</p>
            </div>
        </div>

        <div class="qp-grid">
            ${tiles.map(t => `<div class="qp-stat"><span class="qp-stat-ic" aria-hidden="true">${t[0]}</span><b>${t[2]}</b><span>${t[1]}</span></div>`).join('')}
        </div>

        <div>
            <p class="text-sm font-bold mb-3 ${d ? 'text-gray-300' : 'text-gray-600'}">${qpT('ক্যাটাগরি অনুযায়ী সঠিকের হার', 'Accuracy by category')}</p>
            <div class="qp-cats">
                ${cats.map(c => { const cc = quizCatColor(c.key), pc = qpAccuracy(c.a, c.c);
                    return `<div class="qp-catrow qp-catrow-lg"><span class="qp-catname">${sanitize(quizCatLabel(c.key, l))}</span><span class="qp-mini"><i style="width:${pc}%;background:${cc.c}"></i></span><span class="qp-catnum">${c.a ? qpN(pc) + '% (' + qpN(c.c) + '/' + qpN(c.a) + ')' : '—'}</span></div>`; }).join('')}
            </div>
        </div>

        <div>
            <p class="text-sm font-bold mb-3 ${d ? 'text-gray-300' : 'text-gray-600'}">🏅 ${qpT('ব্যাজ', 'Badges')} (${qpN(Object.keys(p.badges).length)}/${qpN(QP_BADGES.length)})</p>
            <div class="qp-badges">
                ${QP_BADGES.map(b => { const got = p.badges[b.id];
                    return `<div class="qp-badge${got ? ' on' : ''}" title="${sanitize(l === 'bn' ? b.dbn : b.den)}">
                        <span class="qp-badge-ic" aria-hidden="true">${got ? b.ic : '🔒'}</span>
                        <b>${sanitize(l === 'bn' ? b.bn : b.en)}</b>
                        <span>${got ? sanitize(got) : sanitize(l === 'bn' ? b.dbn : b.den)}</span>
                    </div>`; }).join('')}
            </div>
        </div>

        <div class="text-center"><button type="button" data-action="quizResetProgress" class="qp-reset">🗑️ ${qpT('অগ্রগতি মুছুন', 'Reset progress')}</button></div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Page: Flashcards
// ---------------------------------------------------------------------------
function renderQuizFlashPage() {
    const d = state.darkMode, l = state.language;
    const f = state.quizFlash;
    const q = f && f.deck[f.i];
    if (!q) return renderQuizFlashDonePage();
    const total = f.deck.length, pct = Math.round(f.i / total * 100), cc = quizCatColor(q.category);
    const ans = q.options[q.correct] || { bn: '', en: '' };
    return `
    <div class="space-y-6 page-enter">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <h1 class="text-3xl font-bold">🃏 ${qpT('ফ্ল্যাশকার্ড', 'Flashcards')}</h1>
            <div class="flex items-center gap-3">
                <span class="${d ? 'text-gray-400' : 'text-gray-500'} text-sm">${qpN(f.i + 1)} / ${qpN(total)}</span>
                <button type="button" data-action="quizBackToSetup" class="qp-back">✕ ${qpT('বন্ধ', 'Close')}</button>
            </div>
        </div>
        <div class="${d ? 'bg-gray-900' : 'bg-gray-100'} rounded-full h-2 overflow-hidden" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${qpT('অগ্রগতি', 'Progress')}">
            <div class="bg-green-500 h-2 rounded-full transition-all" style="width:${pct}%"></div>
        </div>
        <div class="qp-card ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} border">
            <div class="flex items-center gap-2 mb-4">
                <span class="text-xs font-bold px-2.5 py-1 rounded-full" style="background:${d ? cc.bgD : cc.bg};color:${cc.c}">${sanitize(quizCatLabel(q.category, l))}</span>
                <span class="text-xs font-semibold px-2.5 py-1 rounded-full ${d ? 'bg-gray-900 text-gray-400' : 'bg-gray-100 text-gray-500'}">${sanitize(quizDiffLabel(q.difficulty, l))}</span>
            </div>
            <h2 class="text-xl font-bold">${sanitize(l === 'bn' ? q.qBn : q.qEn)}</h2>
            ${f.flipped ? `
            <div class="qp-answer" aria-live="polite">
                <p class="qp-answer-l">${qpT('সঠিক উত্তর', 'Correct answer')}</p>
                <p class="qp-answer-t">${sanitize(l === 'bn' ? ans.bn : ans.en)}</p>
                <p class="text-sm leading-relaxed" style="margin-top:10px">${sanitize(l === 'bn' ? q.explanationBn : q.explanationEn)}</p>
                ${(q.sourceBn || q.sourceEn) ? `<p class="text-xs mt-2" style="opacity:.75">— ${sanitize(l === 'bn' ? q.sourceBn : q.sourceEn)}</p>` : ''}
            </div>
            <div class="qp-flash-btns">
                <button type="button" data-action="quizFlashMark" data-param="0" class="qp-fbtn qp-fbtn-again">🔁 ${qpT('আবার দেখব', 'Review again')}</button>
                <button type="button" data-action="quizFlashMark" data-param="1" class="qp-fbtn qp-fbtn-know">✅ ${qpT('জানতাম', 'I knew it')}</button>
            </div>` : `
            <button type="button" data-action="quizFlashFlip" class="qp-reveal">👁️ ${qpT('উত্তর দেখুন', 'Show answer')}</button>`}
        </div>
        <p class="text-center text-xs ${d ? 'text-gray-500' : 'text-gray-400'}">${qpT('"আবার দেখব" চাপলে প্রশ্নটি ভুলের ব্যাংকে যাবে।', '"Review again" adds the question to your mistake bank.')}</p>
    </div>`;
}

function renderQuizFlashDonePage() {
    const d = state.darkMode, l = state.language;
    const f = state.quizFlash || { deck: [], known: 0, again: 0 };
    const nM = qpMistakeQuestions().length;
    return `
    <div class="space-y-8 page-enter">
        <h1 class="text-3xl font-bold">🃏 ${qpT('ফ্ল্যাশকার্ড', 'Flashcards')}</h1>
        <div class="${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} border rounded-2xl p-10 text-center max-w-lg mx-auto">
            <div class="text-6xl mb-4" aria-hidden="true">🎉</div>
            <h2 class="text-2xl font-bold mb-5">${qpT('সবগুলো কার্ড দেখা শেষ!', 'Deck complete!')}</h2>
            <div class="qp-grid" style="grid-template-columns:1fr 1fr">
                <div class="qp-stat"><span class="qp-stat-ic" aria-hidden="true">✅</span><b>${qpN(f.known)}</b><span>${qpT('জানতাম', 'Knew it')}</span></div>
                <div class="qp-stat"><span class="qp-stat-ic" aria-hidden="true">🔁</span><b>${qpN(f.again)}</b><span>${qpT('আবার দেখতে হবে', 'To review')}</span></div>
            </div>
            <div class="flex flex-col gap-3" style="margin-top:22px">
                <button type="button" data-action="quizStartFlash" class="${d ? 'bg-green-700 hover:bg-green-600' : 'bg-green-600 hover:bg-green-700'} text-white px-6 py-3 rounded-xl font-semibold">🔄 ${qpT('নতুন কার্ড সেট', 'New deck')}</button>
                ${nM > 0 ? `<button type="button" data-action="quizStartMistakes" class="qp-sum-btn" style="margin:0">🔁 ${qpT('ভুলগুলো অনুশীলন করুন', 'Practise your mistakes')} (${qpN(nM)})</button>` : ''}
                <button type="button" data-action="quizBackToSetup" class="${d ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} px-6 py-3 rounded-xl font-semibold">⚙️ ${qpT('কুইজে ফিরুন', 'Back to quiz')}</button>
            </div>
        </div>
    </div>`;
}
