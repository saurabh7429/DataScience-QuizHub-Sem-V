/**
 * CipherBank — app.js
 * Cryptography & Blockchain MCQ Study Tool for BCA Exam Preparation
 *
 * Modes:
 *   1. Read All      — browse all 150 questions
 *   2. Read One by One
 *   3. Test — 150 questions (sequential, locked answers)
 *   4. Exam — 25 random questions (changeable answers, submit at end)
 */

'use strict';

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */
const DATA_PATH      = './data/QB-DataScience_withAnswers.json';
const EXPECTED_COUNT = 172;
const EXAM_COUNT     = 25;
const LS_THEME       = 'cb_theme';
const LS_MISTAKES    = 'cb_mistakes';

/* ═══════════════════════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════════════════════ */
let questions = [];   // validated full bank
let theme     = 'dark';
let mistakes  = [];   // { questionId, userAnswer, correctAnswer }

// Per-mode session state (cleared on exit)
let session = null;

/* Session shapes:
   readAll  → { revealed: Map<srno, { selected, correct }> }
   readOne  → { index: 0, revealed: Map<srno, { selected, correct }> }
   test     → { index: 0, correctCount: 0, wrongCount: 0,
                 answers: Map<srno, { selected, correct, isCorrect }> }
   exam     → { questions: Q[], index: 0,
                 answers: Map<srno, { selected, correct, isCorrect }> }
   results  → { mode, data }
*/

/* ═══════════════════════════════════════════════════════════
   DOM HELPERS
   ═══════════════════════════════════════════════════════════ */
const $  = (id)          => document.getElementById(id);
const el = (tag, cls='') => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };

function show(id)  { $(id).classList.remove('hidden'); }
function hide(id)  { $(id).classList.add('hidden'); }
function toggle(el, condition) { el.classList.toggle('hidden', !condition); }

function showScreen(name) {
  ['home', 'study'].forEach(s => {
    const el = $(`screen-${s}`);
    if (el) el.classList.toggle('active', s === name);
    if (el) el.classList.toggle('hidden', s !== name);
  });
}

function showMode(name) {
  ['readall','readone','test','exam','results'].forEach(m => {
    const el = $(`mode-${m}`);
    if (el) el.classList.toggle('hidden', m !== name);
  });
}

/* ═══════════════════════════════════════════════════════════
   ICON SVG STRINGS
   ═══════════════════════════════════════════════════════════ */
const ICON = {
  check: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
  x:     `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  minus: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  sun:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>`,
  moon:  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
};

/* ═══════════════════════════════════════════════════════════
   THEME
   ═══════════════════════════════════════════════════════════ */
function loadTheme() {
  try { theme = localStorage.getItem(LS_THEME) || 'dark'; } catch { theme = 'dark'; }
  applyTheme();
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', theme);
  const isDark = theme === 'dark';
  ['home-theme-icon','study-theme-icon'].forEach(id => {
    const el = $(id);
    if (el) el.innerHTML = isDark ? ICON.sun : ICON.moon;
  });
}

function toggleTheme() {
  theme = theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(LS_THEME, theme); } catch {}
  applyTheme();
}

/* ═══════════════════════════════════════════════════════════
   FULLSCREEN
   ═══════════════════════════════════════════════════════════ */
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.()
      .then(() => updateFullscreenIcon(true))
      .catch(() => {});
  } else {
    document.exitFullscreen?.()
      .then(() => updateFullscreenIcon(false))
      .catch(() => {});
  }
}

function updateFullscreenIcon(isFs) {
  toggle($('fullscreen-icon-enter'), !isFs);
  toggle($('fullscreen-icon-exit'), isFs);
}

document.addEventListener('fullscreenchange', () => {
  updateFullscreenIcon(!!document.fullscreenElement);
});

/* ═══════════════════════════════════════════════════════════
   LOCALSTORAGE — MISTAKES
   ═══════════════════════════════════════════════════════════ */
function loadMistakes() {
  try {
    const raw = localStorage.getItem(LS_MISTAKES);
    mistakes = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(mistakes)) mistakes = [];
  } catch { mistakes = []; }
}

function saveMistakes() {
  try { localStorage.setItem(LS_MISTAKES, JSON.stringify(mistakes)); } catch {}
}

function recordMistake(questionId, userAnswer, correctAnswer) {
  const idx = mistakes.findIndex(m => m.questionId === questionId);
  const entry = { questionId, userAnswer, correctAnswer };
  if (idx >= 0) {
    mistakes[idx] = entry;
  } else {
    mistakes.push(entry);
  }
  saveMistakes();
}

function clearMistakes() {
  mistakes = [];
  saveMistakes();
}

/* ═══════════════════════════════════════════════════════════
   DATA LOADING & VALIDATION
   ═══════════════════════════════════════════════════════════ */
async function loadData() {
  let raw;
  try {
    const res = await fetch(DATA_PATH);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    raw = await res.json();
  } catch (err) {
    throw new Error(`Failed to fetch/parse question bank:\n${err.message}`);
  }

  const qs = raw.questions;
  if (!Array.isArray(qs)) throw new Error('questions field is not an array.');
  const expectedCount = raw.metadata?.expected_question_count || raw.metadata?.total_questions || EXPECTED_COUNT;
  if (qs.length !== expectedCount)
    throw new Error(`Expected ${expectedCount} questions, found ${qs.length}.`);

  const seenIds = new Set();
  const VALID_OPTIONS = ['A','B','C','D'];

  for (let i = 0; i < qs.length; i++) {
    const q = qs[i];
    if (q.srno === undefined || q.srno === null) {
      q.srno = q.id !== undefined && q.id !== null ? q.id : i + 1;
    }
    const loc = `Question #${q.srno}`;

    if (seenIds.has(q.srno))
      throw new Error(`Duplicate srno/id: ${q.srno}.`);
    seenIds.add(q.srno);

    if (!q.question || typeof q.question !== 'string')
      throw new Error(`${loc}: missing or invalid question text.`);

    if (!q.options || typeof q.options !== 'object')
      throw new Error(`${loc}: missing options object.`);

    // Normalize option keys to uppercase
    const normOptions = {};
    for (const [k, v] of Object.entries(q.options)) {
      normOptions[k.toUpperCase()] = v;
    }
    q.options = normOptions;

    const optKeys = Object.keys(q.options);
    if (optKeys.length !== 4 || !VALID_OPTIONS.every(k => optKeys.includes(k)))
      throw new Error(`${loc}: options must have exactly keys A, B, C, D.`);

    if (q.correct_option) q.correct_option = String(q.correct_option).toUpperCase();
    if (!q.correct_option || !VALID_OPTIONS.includes(q.correct_option))
      throw new Error(`${loc}: invalid correct_option "${q.correct_option}".`);
  }

  return qs;
}

/* ═══════════════════════════════════════════════════════════
   QUESTION CARD RENDERING
   ═══════════════════════════════════════════════════════════ */

/**
 * Build a question card DOM element.
 * @param {object} q             - question object
 * @param {number} displayNum    - e.g. 1-based index
 * @param {number} totalNum      - total count
 * @param {string|null} selected - option key user selected (or null)
 * @param {boolean} revealed     - whether answer is revealed/locked
 * @param {function} onSelect    - callback(optionKey)
 * @param {boolean} locked       - if true, options are non-interactive (test mode after answer)
 */
function buildQuestionCard(q, displayNum, totalNum, selected, revealed, onSelect, locked=false) {
  const card = el('div', 'question-card');

  // Header
  const header = el('div', 'q-header');
  const num = el('div', 'q-num');
  num.innerHTML = `<span class="num-accent">${String(displayNum).padStart(3,'0')}</span> / ${totalNum}`;
  header.appendChild(num);
  card.appendChild(header);

  // Question text
  const text = el('div', 'q-text');
  text.textContent = q.question;
  card.appendChild(text);

  // Options
  const list = el('ul', 'options-list');
  list.setAttribute('role', 'list');
  ['A','B','C','D'].forEach(key => {
    const li = el('li');
    li.setAttribute('role', 'listitem');
    const btn = el('button', 'option-btn');
    btn.setAttribute('type', 'button');
    btn.setAttribute('data-key', key);

    // Badge
    const badge = el('span', 'option-badge');
    badge.textContent = key;
    badge.setAttribute('aria-hidden', 'true');

    // Text
    const optText = el('span', 'option-text');
    optText.textContent = q.options[key];

    // Status icon
    const statusIcon = el('span', 'option-status-icon');
    statusIcon.setAttribute('aria-hidden', 'true');

    btn.appendChild(badge);
    btn.appendChild(optText);
    btn.appendChild(statusIcon);

    // Determine visual state
    if (revealed || locked) {
      const isCorrect = key === q.correct_option;
      const isSelected = key === selected;

      if (isSelected && isCorrect) {
        btn.classList.add('correct');
        statusIcon.innerHTML = ICON.check;
        btn.setAttribute('aria-label', `${key}: ${q.options[key]} — Correct`);
      } else if (isSelected && !isCorrect) {
        btn.classList.add('wrong');
        statusIcon.innerHTML = ICON.x;
        btn.setAttribute('aria-label', `${key}: ${q.options[key]} — Wrong`);
      } else if (!isSelected && isCorrect) {
        btn.classList.add('revealed-correct');
        statusIcon.innerHTML = ICON.check;
        btn.setAttribute('aria-label', `${key}: ${q.options[key]} — Correct answer`);
      } else {
        btn.classList.add('locked');
        btn.setAttribute('aria-label', `${key}: ${q.options[key]}`);
      }
      btn.disabled = true;
    } else {
      btn.setAttribute('aria-label', `${key}: ${q.options[key]}`);
      btn.addEventListener('click', () => onSelect(key));
    }

    li.appendChild(btn);
    list.appendChild(li);
  });

  card.appendChild(list);
  return card;
}

/**
 * Animate a shake on the wrong option button.
 */
function shakeButton(btn) {
  btn.classList.remove('shake');
  void btn.offsetWidth; // reflow
  btn.classList.add('shake');
  btn.addEventListener('animationend', () => btn.classList.remove('shake'), { once: true });
}

/**
 * Animate a pop on the correct option button.
 */
function popButton(btn) {
  btn.classList.remove('pop');
  void btn.offsetWidth;
  btn.classList.add('pop');
  btn.addEventListener('animationend', () => btn.classList.remove('pop'), { once: true });
}

/* ═══════════════════════════════════════════════════════════
   HOME SCREEN — WRONG ANSWER HISTORY
   ═══════════════════════════════════════════════════════════ */
function renderHistorySection() {
  const container   = $('history-container');
  const countBadge  = $('history-count-badge');
  const clearBtn    = $('btn-clear-history');

  // Fully rebuild the container each time
  container.innerHTML = '';

  if (mistakes.length === 0) {
    const emptyDiv = el('div', 'history-empty');
    emptyDiv.id = 'history-empty';
    emptyDiv.textContent = 'No mistakes recorded yet. Start a Test or Exam to track wrong answers.';
    container.appendChild(emptyDiv);
    countBadge.textContent = '';
    clearBtn.classList.add('hidden');
    return;
  }

  clearBtn.classList.remove('hidden');
  countBadge.textContent = `${mistakes.length} mistake${mistakes.length === 1 ? '' : 's'}`;

  container.innerHTML = '';
  const list = el('div', 'history-list');

  const SHOW_COUNT = 5;
  const toShow = mistakes.slice(0, SHOW_COUNT);
  const rest   = mistakes.length - SHOW_COUNT;

  toShow.forEach(m => {
    const q = questions.find(q => q.srno === m.questionId);
    if (!q) return;

    const item = el('div', 'history-item');
    const qNum = el('div', 'history-q-num');
    qNum.textContent = `Q${String(q.srno).padStart(3,'0')}`;

    const qText = el('div', 'history-q-text');
    qText.textContent = q.question;

    const answers = el('div', 'history-answers');
    const yourAns = el('span', 'history-your');
    yourAns.textContent = `Your: ${m.userAnswer}) ${q.options[m.userAnswer] || m.userAnswer}`;
    const correctAns = el('span', 'history-correct');
    correctAns.textContent = `Correct: ${m.correctAnswer}) ${q.options[m.correctAnswer] || m.correctAnswer}`;

    answers.appendChild(yourAns);
    answers.appendChild(correctAns);
    item.appendChild(qNum);
    item.appendChild(qText);
    item.appendChild(answers);
    list.appendChild(item);
  });

  if (rest > 0) {
    const moreBtn = el('button', 'history-show-more');
    moreBtn.textContent = `+ ${rest} more mistake${rest === 1 ? '' : 's'}`;
    moreBtn.addEventListener('click', () => showAllHistory(list, moreBtn));
    list.appendChild(moreBtn);
  }

  container.appendChild(list);
}

function showAllHistory(list, moreBtn) {
  moreBtn.remove();
  mistakes.slice(5).forEach(m => {
    const q = questions.find(q => q.srno === m.questionId);
    if (!q) return;

    const item = el('div', 'history-item');
    const qNum = el('div', 'history-q-num');
    qNum.textContent = `Q${String(q.srno).padStart(3,'0')}`;

    const qText = el('div', 'history-q-text');
    qText.textContent = q.question;

    const answers = el('div', 'history-answers');
    const yourAns = el('span', 'history-your');
    yourAns.textContent = `Your: ${m.userAnswer}) ${q.options[m.userAnswer] || m.userAnswer}`;
    const correctAns = el('span', 'history-correct');
    correctAns.textContent = `Correct: ${m.correctAnswer}) ${q.options[m.correctAnswer] || m.correctAnswer}`;

    answers.appendChild(yourAns);
    answers.appendChild(correctAns);
    item.appendChild(qNum);
    item.appendChild(qText);
    item.appendChild(answers);
    list.appendChild(item);
  });
}

/* ═══════════════════════════════════════════════════════════
   NAVIGATION HELPERS
   ═══════════════════════════════════════════════════════════ */
function updateProgressBar(current, total) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  $('progress-bar-fill').style.width = `${pct}%`;
}

function updateBottomNav(current, total, prevDisabled, nextText='Next') {
  $('nav-counter').textContent = `${current} / ${total}`;
  $('nav-prev').disabled = prevDisabled;
  // Rebuild next button content safely
  const navNext = $('nav-next');
  navNext.textContent = '';
  const nextSpan = document.createTextNode(nextText + ' ');
  const nextIcon = document.createElementNS('http://www.w3.org/2000/svg','svg');
  nextIcon.setAttribute('width','14'); nextIcon.setAttribute('height','14');
  nextIcon.setAttribute('viewBox','0 0 24 24'); nextIcon.setAttribute('fill','none');
  nextIcon.setAttribute('stroke','currentColor'); nextIcon.setAttribute('stroke-width','2');
  nextIcon.setAttribute('stroke-linecap','round'); nextIcon.setAttribute('stroke-linejoin','round');
  nextIcon.setAttribute('aria-hidden','true');
  const poly = document.createElementNS('http://www.w3.org/2000/svg','polyline');
  poly.setAttribute('points','9 18 15 12 9 6'); nextIcon.appendChild(poly);
  navNext.appendChild(nextSpan); navNext.appendChild(nextIcon);
}

/* ═══════════════════════════════════════════════════════════
   SCREEN MANAGEMENT
   ═══════════════════════════════════════════════════════════ */
function goHome() {
  session = null;
  showScreen('home');
  hide('bottom-nav');
  hide('exam-map-btn');
  hide('progress-bar-wrap');
  $('header-mode-title').textContent = '';
  renderHistorySection();
  window.scrollTo(0, 0);
}

function startStudyScreen(modeName, modeTitle, showProgress, showNav) {
  showScreen('study');
  showMode(modeName);
  $('header-mode-title').textContent = modeTitle;
  toggle($('progress-bar-wrap'), showProgress);
  toggle($('bottom-nav'), showNav);
  hide('exam-map-btn');
  window.scrollTo(0, 0);
}

/* ═══════════════════════════════════════════════════════════
   MODE 1 — READ ALL (Pre-ticked Answers)
   ═══════════════════════════════════════════════════════════ */
function startReadAll() {
  session = { mode: 'readall' };
  startStudyScreen('readall', 'Read — All Questions', false, false);

  const list = $('readall-list');
  list.innerHTML = '';

  questions.forEach((q, i) => {
    // In Read All mode, correct answers are pre-selected & revealed for easy reading
    const card = buildQuestionCard(
      q, i + 1, questions.length,
      q.correct_option, true,
      null,
      true
    );
    card.id = `ra-card-${q.srno}`;
    card.classList.add('read-all-question');
    list.appendChild(card);
  });
}

function revealReadAll(q, selectedKey, index) {
  // Retained for safety
}

/* ═══════════════════════════════════════════════════════════
   MODE 2 — READ ONE BY ONE (Pre-ticked Answers)
   ═══════════════════════════════════════════════════════════ */
function startReadOne() {
  session = { mode: 'readone', index: 0 };
  startStudyScreen('readone', 'Read — One by One', true, true);
  updateProgressBar(0, questions.length);
  renderReadOne(false);
}

function renderReadOne(goingBack) {
  const { index } = session;
  const q = questions[index];
  const container = $('readone-card');

  // In Read One mode, correct answer is pre-selected & revealed for easy reading
  const card = buildQuestionCard(
    q, index + 1, questions.length,
    q.correct_option, true,
    null,
    true
  );

  card.classList.add(goingBack ? 'question-entering-back' : 'question-entering');
  container.innerHTML = '';
  container.appendChild(card);

  $('readone-current').textContent = index + 1;
  updateProgressBar(index, questions.length);

  const isLast = index === questions.length - 1;
  updateBottomNav(index + 1, questions.length, index === 0, isLast ? 'Finish' : 'Next');
  $('nav-prev').classList.remove('hidden');
  $('nav-next').classList.remove('hidden');
  $('nav-prev').disabled = index === 0;
  $('nav-next').disabled = false;
}

function revealReadOne(q, selectedKey) {
  // Retained for safety
}

function readOneNav(dir) {
  const { index } = session;
  if (dir === -1 && index === 0) return;
  if (dir === 1 && index === questions.length - 1) {
    goHome();
    return;
  }
  session.index += dir;
  renderReadOne(dir === -1);
}

/* ═══════════════════════════════════════════════════════════
   MODE 3 — TEST (150 Questions)
   ═══════════════════════════════════════════════════════════ */
function startTest() {
  session = {
    mode: 'test',
    index: 0,
    correctCount: 0,
    wrongCount: 0,
    answers: new Map(),
  };
  startStudyScreen('test', `Test — ${questions.length} Questions`, true, true);
  updateProgressBar(0, questions.length);
  renderTest(false);
}

function renderTest(goingBack) {
  const { index, answers } = session;
  const q = questions[index];
  const ans = answers.get(q.srno);
  const container = $('test-card');

  const card = buildQuestionCard(
    q, index + 1, questions.length,
    ans?.selected || null,
    !!ans,
    (key) => submitTestAnswer(q, key),
    false
  );

  card.classList.add(goingBack ? 'question-entering-back' : 'question-entering');
  container.innerHTML = '';
  container.appendChild(card);

  $('test-current').textContent = index + 1;
  $('test-correct-count').textContent = session.correctCount;
  $('test-wrong-count').textContent = session.wrongCount;
  updateProgressBar(index, questions.length);

  const answered = !!ans;
  const isLast   = index === questions.length - 1;
  const nextLabel = isLast ? 'Results' : 'Next';
  updateBottomNav(index + 1, questions.length, true, answered ? nextLabel : 'Next');
  $('nav-next').disabled = !answered;
  $('nav-prev').disabled = true;
  $('nav-prev').classList.add('hidden'); // Test mode: no going back
}

function submitTestAnswer(q, selectedKey) {
  if (session.answers.has(q.srno)) return; // already answered

  const isCorrect = selectedKey === q.correct_option;
  session.answers.set(q.srno, {
    selected:  selectedKey,
    correct:   q.correct_option,
    isCorrect,
  });

  if (isCorrect) session.correctCount++;
  else {
    session.wrongCount++;
    recordMistake(q.srno, selectedKey, q.correct_option);
  }

  // Animate then re-render the card locked
  const container = $('test-card');
  const btns = container.querySelectorAll('.option-btn');
  const selectedBtn = container.querySelector(`[data-key="${selectedKey}"]`);

  if (!isCorrect && selectedBtn) shakeButton(selectedBtn);

  // Re-render with locked state
  renderTest(false);

  // Animate after re-render
  requestAnimationFrame(() => {
    const newBtns = $('test-card').querySelectorAll('.option-btn');
    newBtns.forEach(btn => {
      if (btn.classList.contains('wrong'))    shakeButton(btn);
      if (btn.classList.contains('correct') || btn.classList.contains('revealed-correct')) popButton(btn);
    });
  });
}

function testNav() {
  const { index, answers } = session;
  const q = questions[index];
  const ans = answers.get(q.srno);
  if (!ans) return; // must answer first

  if (index === questions.length - 1) {
    // Last question answered → show results
    showTestResults();
    return;
  }

  session.index++;
  renderTest(false);
}

function showTestResults() {
  const { answers, correctCount, wrongCount } = session;
  const total = questions.length;
  const wrongQuestions = questions.filter(q => {
    const a = answers.get(q.srno);
    return a && !a.isCorrect;
  });

  const resultData = {
    mode: 'test',
    total,
    correctCount,
    wrongCount,
    wrongQuestions,
    answers,
  };

  session = { mode: 'results', data: resultData };
  renderResults(resultData);
}

/* ═══════════════════════════════════════════════════════════
   MODE 4 — EXAM (25 Random Questions)
   ═══════════════════════════════════════════════════════════ */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startExam() {
  const picked = shuffle(questions).slice(0, EXAM_COUNT);
  session = {
    mode: 'exam',
    questions: picked,
    index: 0,
    answers: new Map(), // srno → { selected, correct, isCorrect }
  };

  startStudyScreen('exam', 'Exam — 25 Questions', true, true);
  show('exam-map-btn');
  updateProgressBar(0, EXAM_COUNT);
  renderExam(false);
}

function renderExam(goingBack) {
  const { questions: eq, index, answers } = session;
  const q = eq[index];
  const ans = answers.get(q.srno);
  const container = $('exam-card');

  // In exam mode: options are not locked — user can change
  const card = buildQuestionCard(
    q, index + 1, EXAM_COUNT,
    ans?.selected || null,
    false, // not revealed/locked
    (key) => selectExamAnswer(q, key),
    false
  );

  // If already answered, show the selected state visually (not locked, just highlighted)
  if (ans) {
    const btns = card.querySelectorAll('.option-btn');
    btns.forEach(btn => {
      const key = btn.getAttribute('data-key');
      if (key === ans.selected) {
        btn.style.background = 'var(--cyan-dim)';
        btn.style.borderColor = 'var(--cyan-border)';
        const badge = btn.querySelector('.option-badge');
        if (badge) {
          badge.style.background = 'var(--cyan)';
          badge.style.borderColor = 'var(--cyan)';
          badge.style.color = '#fff';
        }
      }
    });
  }

  card.classList.add(goingBack ? 'question-entering-back' : 'question-entering');
  container.innerHTML = '';
  container.appendChild(card);

  $('exam-current').textContent = index + 1;
  $('exam-answered-count').textContent = answers.size;

  updateProgressBar(index, EXAM_COUNT);
  updateBottomNav(index + 1, EXAM_COUNT, index === 0);
  $('nav-prev').classList.remove('hidden');
  $('nav-next').disabled = false;

  // Update map badge
  $('exam-map-badge').textContent = answers.size;
  refreshMapGrid();
}

function selectExamAnswer(q, key) {
  const prev = session.answers.get(q.srno);
  session.answers.set(q.srno, {
    selected:  key,
    correct:   q.correct_option,
    isCorrect: key === q.correct_option,
  });

  // Just re-render current card to show selection
  renderExam(false);
}

function examNav(dir) {
  const { index, questions: eq } = session;
  if (dir === -1 && index === 0) return;
  if (dir === 1 && index === eq.length - 1) return;
  session.index += dir;
  renderExam(dir === -1);
}

function jumpToExamQuestion(i) {
  session.index = i;
  closeOverlay('overlay-map');
  renderExam(false);
}

function refreshMapGrid() {
  const { questions: eq, index, answers } = session;
  const grid = $('map-grid');
  if (!grid) return;
  grid.innerHTML = '';
  eq.forEach((q, i) => {
    const chip = el('button', 'map-chip');
    chip.textContent = i + 1;
    chip.setAttribute('aria-label', `Question ${i + 1}${answers.has(q.srno) ? ', answered' : ', unanswered'}`);
    chip.setAttribute('role', 'listitem');
    if (answers.has(q.srno)) chip.classList.add('answered');
    if (i === index)         chip.classList.add('current');
    chip.addEventListener('click', () => jumpToExamQuestion(i));
    grid.appendChild(chip);
  });
}

function submitExam() {
  const { answers, questions: eq } = session;
  const unanswered = eq.filter(q => !answers.has(q.srno)).length;

  if (unanswered > 0) {
    $('confirm-msg').textContent = `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. Submit anyway?`;
    openOverlay('overlay-confirm');
  } else {
    finalizeExam();
  }
}

function finalizeExam() {
  const { answers, questions: eq } = session;
  let correct = 0, wrong = 0, unanswered = 0;

  eq.forEach(q => {
    const ans = answers.get(q.srno);
    if (!ans) { unanswered++; return; }
    if (ans.isCorrect) correct++;
    else {
      wrong++;
      recordMistake(q.srno, ans.selected, q.correct_option);
    }
  });

  const resultData = {
    mode: 'exam',
    total: eq.length,
    correctCount: correct,
    wrongCount: wrong,
    unansweredCount: unanswered,
    examQuestions: eq,
    answers,
  };

  closeOverlay('overlay-map');
  closeOverlay('overlay-confirm');
  hide('exam-map-btn');
  session = { mode: 'results', data: resultData };
  renderResults(resultData);
}

/* ═══════════════════════════════════════════════════════════
   RESULTS SCREEN
   ═══════════════════════════════════════════════════════════ */
function renderResults(data) {
  showMode('results');
  hide('bottom-nav');
  $('header-mode-title').textContent = data.mode === 'test' ? 'Test Results' : 'Exam Results';

  // Score percentage
  const answered = data.total - (data.unansweredCount || 0);
  const pct = answered > 0 ? Math.round((data.correctCount / data.total) * 100) : 0;

  $('results-pct').textContent = `${pct}%`;

  // Grade label
  let grade = '';
  if (pct >= 90) grade = 'Excellent';
  else if (pct >= 75) grade = 'Good';
  else if (pct >= 50) grade = 'Pass';
  else grade = 'Needs Work';

  $('results-grade').textContent = grade;
  $('results-subtitle').textContent = `${data.correctCount} correct out of ${data.total}`;

  // Animate ring
  const circumference = 2 * Math.PI * 65; // r=65 → 408.41
  const fill = $('results-ring-fill');
  fill.style.strokeDasharray  = circumference;
  fill.style.strokeDashoffset = circumference;

  // Change ring color based on score
  fill.style.stroke =
    pct >= 75 ? 'var(--correct)' :
    pct >= 50 ? 'var(--accent)' :
                'var(--wrong)';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fill.style.strokeDashoffset = circumference * (1 - pct / 100);
    });
  });

  // Stats
  const statsEl = $('results-stats');
  statsEl.innerHTML = '';
  const statItems = [
    { val: data.correctCount,        cls: 'correct',    label: 'Correct' },
    { val: data.wrongCount,          cls: 'wrong',      label: 'Wrong' },
  ];
  if (data.unansweredCount !== undefined) {
    statItems.push({ val: data.unansweredCount, cls: 'unanswered', label: 'Skipped' });
  }
  statItems.push({ val: data.total, cls: 'neutral', label: 'Total' });

  statItems.forEach(s => {
    const stat = el('div', 'score-stat');
    const valEl = el('div', `score-stat-val ${s.cls}`);
    valEl.textContent = s.val;
    const lblEl = el('div', 'score-stat-label');
    lblEl.textContent = s.label;
    stat.appendChild(valEl);
    stat.appendChild(lblEl);
    statsEl.appendChild(stat);
  });

  // CTA buttons
  $('results-retry-btn').onclick = () => {
    if (data.mode === 'test') startTest();
    else startExam();
  };
  $('results-home-btn').onclick = () => goHome();

  // Review
  renderReview(data);

  window.scrollTo(0, 0);
}

function renderReview(data) {
  const list = $('results-review-list');
  list.innerHTML = '';

  if (data.mode === 'test') {
    // Only wrong questions
    const wrongQs = data.wrongQuestions || [];
    $('review-header-label').textContent = 'Wrong Answers';
    $('review-header-count').textContent = wrongQs.length > 0 ? `${wrongQs.length} questions` : 'None';

    if (wrongQs.length === 0) {
      const none = el('div', 'history-empty');
      none.textContent = 'Perfect score! No wrong answers.';
      none.style.padding = '20px';
      list.appendChild(none);
      return;
    }

    wrongQs.forEach((q, i) => {
      const ans = data.answers.get(q.srno);
      list.appendChild(buildReviewItem(q, ans, 'wrong', i + 1));
    });

  } else {
    // Exam: all 25 questions
    $('review-header-label').textContent = 'Full Review';
    $('review-header-count').textContent = `${data.total} questions`;

    data.examQuestions.forEach((q, i) => {
      const ans = data.answers.get(q.srno);
      let status = 'unanswered';
      if (ans) status = ans.isCorrect ? 'correct' : 'wrong';
      list.appendChild(buildReviewItem(q, ans, status, i + 1));
    });
  }
}

function buildReviewItem(q, ans, status, displayNum) {
  const item = el('div', 'review-item');

  const statusBar = el('div', 'review-item-status');
  if (status === 'correct') {
    statusBar.innerHTML = `${ICON.check}<span class="status-correct">Correct</span>`;
  } else if (status === 'wrong') {
    statusBar.innerHTML = `${ICON.x}<span class="status-wrong">Wrong</span>`;
  } else {
    statusBar.innerHTML = `${ICON.minus}<span class="status-unanswered">Unanswered</span>`;
  }

  const qNum = el('div', 'review-q-num');
  qNum.textContent = `Question ${displayNum} · Q${String(q.srno).padStart(3,'0')}`;

  const qText = el('div', 'review-q-text');
  qText.textContent = q.question;

  const answers = el('div', 'review-answers');

  if (ans && status !== 'unanswered') {
    if (status === 'wrong') {
      const yourLine = el('div', 'review-ans-line');
      const yourLabel = el('span', 'review-ans-label your');
      yourLabel.textContent = 'Your';
      const yourVal = el('span', 'review-ans-val wrong');
      yourVal.textContent = `${ans.selected}) ${q.options[ans.selected]}`;
      yourLine.appendChild(yourLabel);
      yourLine.appendChild(yourVal);
      answers.appendChild(yourLine);
    }

    const correctLine = el('div', 'review-ans-line');
    const correctLabel = el('span', 'review-ans-label correct');
    correctLabel.textContent = 'Correct';
    const correctVal = el('span', 'review-ans-val correct');
    correctVal.textContent = `${q.correct_option}) ${q.options[q.correct_option]}`;
    correctLine.appendChild(correctLabel);
    correctLine.appendChild(correctVal);
    answers.appendChild(correctLine);
  } else if (status === 'unanswered') {
    const correctLine = el('div', 'review-ans-line');
    const correctLabel = el('span', 'review-ans-label correct');
    correctLabel.textContent = 'Answer';
    const correctVal = el('span', 'review-ans-val correct');
    correctVal.textContent = `${q.correct_option}) ${q.options[q.correct_option]}`;
    correctLine.appendChild(correctLabel);
    correctLine.appendChild(correctVal);
    answers.appendChild(correctLine);
  } else if (status === 'correct') {
    const correctLine = el('div', 'review-ans-line');
    const correctLabel = el('span', 'review-ans-label correct');
    correctLabel.textContent = 'Your';
    const correctVal = el('span', 'review-ans-val correct');
    correctVal.textContent = `${ans.selected}) ${q.options[ans.selected]}`;
    correctLine.appendChild(correctLabel);
    correctLine.appendChild(correctVal);
    answers.appendChild(correctLine);
  }

  item.appendChild(statusBar);
  item.appendChild(qNum);
  item.appendChild(qText);
  item.appendChild(answers);
  return item;
}

/* ═══════════════════════════════════════════════════════════
   OVERLAY MANAGEMENT
   ═══════════════════════════════════════════════════════════ */
function openOverlay(id) {
  $(id).classList.add('visible');
  document.body.style.overflow = 'hidden';

  if (id === 'overlay-map') {
    refreshMapGrid();
  }
}

function closeOverlay(id) {
  $(id).classList.remove('visible');
  // Only restore scroll if no other overlay is open
  const anyOpen = document.querySelector('.overlay.visible');
  if (!anyOpen) document.body.style.overflow = '';
}

/* ═══════════════════════════════════════════════════════════
   EVENT WIRING
   ═══════════════════════════════════════════════════════════ */
function wireEvents() {
  // Home mode buttons
  $('btn-mode-readall').addEventListener('click', startReadAll);
  $('btn-mode-readone').addEventListener('click', startReadOne);
  $('btn-mode-test').addEventListener('click', startTest);
  $('btn-mode-exam').addEventListener('click', startExam);

  // Theme toggles
  $('home-theme-btn').addEventListener('click', toggleTheme);
  $('study-theme-btn').addEventListener('click', toggleTheme);

  // Fullscreen
  $('fullscreen-btn').addEventListener('click', toggleFullscreen);

  // Back to home
  $('btn-back').addEventListener('click', goHome);

  // Clear history
  $('btn-clear-history').addEventListener('click', () => {
    clearMistakes();
    renderHistorySection();
  });

  // Bottom nav
  $('nav-prev').addEventListener('click', () => {
    if (!session) return;
    if (session.mode === 'readone') readOneNav(-1);
    else if (session.mode === 'exam') examNav(-1);
  });

  $('nav-next').addEventListener('click', () => {
    if (!session) return;
    if (session.mode === 'readone') readOneNav(1);
    else if (session.mode === 'test') testNav();
    else if (session.mode === 'exam') examNav(1);
  });

  // Exam map
  $('exam-map-btn').addEventListener('click', () => openOverlay('overlay-map'));
  $('overlay-map-close').addEventListener('click', () => closeOverlay('overlay-map'));

  // Exam submit
  $('exam-submit-btn').addEventListener('click', submitExam);
  $('confirm-cancel').addEventListener('click', () => closeOverlay('overlay-confirm'));
  $('confirm-submit').addEventListener('click', () => {
    closeOverlay('overlay-confirm');
    finalizeExam();
  });

  // Close overlays on backdrop click
  ['overlay-map','overlay-confirm'].forEach(id => {
    $(id).addEventListener('click', (e) => {
      if (e.target === $(id)) closeOverlay(id);
    });
  });

  // Close overlays on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      ['overlay-map','overlay-confirm'].forEach(id => closeOverlay(id));
    }
  });

  // Keyboard: arrow keys for navigation
  document.addEventListener('keydown', (e) => {
    if (!session) return;
    if (document.querySelector('.overlay.visible')) return;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      if (session.mode === 'readone') readOneNav(1);
      else if (session.mode === 'exam') examNav(1);
      else if (session.mode === 'test') testNav();
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      if (session.mode === 'readone') readOneNav(-1);
      else if (session.mode === 'exam') examNav(-1);
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   BOOT
   ═══════════════════════════════════════════════════════════ */
async function boot() {
  loadTheme();
  loadMistakes();

  try {
    questions = await loadData();
  } catch (err) {
    hide('screen-loading');
    show('screen-error');
    $('error-message').textContent = err.message;
    return;
  }

  hide('screen-loading');
  wireEvents();
  renderHistorySection();
  showScreen('home');
  $('screen-home').classList.remove('hidden');
}

boot();
