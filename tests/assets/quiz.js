const params = new URLSearchParams(window.location.search);
const track = params.get('track') || 'technical';

const el = {
  title:         document.getElementById('quizTitle'),
  audience:      document.getElementById('quizAudience'),
  qCount:        document.getElementById('qCount'),
  progressBar:   document.getElementById('progressBar'),
  card:          document.getElementById('quizCard'),
  qText:         document.getElementById('qText'),
  difficultyTag: document.getElementById('difficultyTag'),
  options:       document.getElementById('options'),
  submitBtn:     document.getElementById('submitBtn'),
  nextBtn:       document.getElementById('nextBtn'),
  feedback:      document.getElementById('feedback'),
  resultCard:    document.getElementById('resultCard'),
  scoreText:     document.getElementById('scoreText'),
  gradeText:     document.getElementById('gradeText'),
  downloadCertBtn: document.getElementById('downloadCertBtn'),
  summaryBody:   document.getElementById('summaryBody'),
  timerWrap:     document.getElementById('timerWrap'),
  timerDisplay:  document.getElementById('timerDisplay'),
  certModal:     document.getElementById('certModal'),
  certName:      document.getElementById('certName'),
  certCompany:   document.getElementById('certCompany'),
  certGenerateBtn: document.getElementById('certGenerateBtn'),
  certCancelBtn:   document.getElementById('certCancelBtn'),
};

let data      = null;
let index     = 0;
let selected  = null;
let locked    = false;
let score     = 0;
const answers = [];

/* ── TIMER ── */
const TIMER_SECONDS = 30 * 60;
let timerRemaining = TIMER_SECONDS;
let timerInterval  = null;

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function startTimer() {
  timerRemaining = TIMER_SECONDS;
  el.timerWrap.style.display = 'flex';
  el.timerDisplay.textContent = formatTime(timerRemaining);

  timerInterval = setInterval(() => {
    timerRemaining -= 1;
    el.timerDisplay.textContent = formatTime(timerRemaining);

    el.timerWrap.classList.toggle('warn',   timerRemaining <= 300 && timerRemaining > 120);
    el.timerWrap.classList.toggle('danger', timerRemaining <= 120);

    if (timerRemaining <= 0) {
      clearInterval(timerInterval);
      showResults();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

/* ── HELPERS ── */
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomizeQuestionOptions(questions) {
  return questions.map((q) => {
    const indexed = q.options.map((text, idx) => ({ text, idx }));
    const shuffled = shuffleArray(indexed);
    return {
      ...q,
      options: shuffled.map((x) => x.text),
      answerIndex: shuffled.findIndex((x) => x.idx === q.answerIndex)
    };
  });
}

function getDifficultyLabel(qId) {
  if (qId <= 7)  return { label: 'Beginner',     emoji: '🌱', className: 'difficulty-beginner' };
  if (qId <= 14) return { label: 'Intermediate', emoji: '⚡', className: 'difficulty-intermediate' };
  return               { label: 'Advanced',      emoji: '🚀', className: 'difficulty-advanced' };
}

function getGradeInfo(pct) {
  if (pct >= 75) return { grade: 'Advanced',     emoji: '🚀', className: 'grade-advanced',     color: '#41d28f', bg: '#0d2e1e' };
  if (pct >= 45) return { grade: 'Intermediate', emoji: '⚡', className: 'grade-intermediate', color: '#f0c05f', bg: '#2a200a' };
  return               { grade: 'Beginner',      emoji: '🌱', className: 'grade-beginner',     color: '#ef5e7a', bg: '#2d0d18' };
}

function fireConfetti() {
  if (typeof confetti !== 'function') return;
  confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, scalar: 0.95 });
}

function renderProgress() {
  el.progressBar.style.width = `${(index / data.questions.length) * 100}%`;
}

/* ── QUIZ RENDER ── */
function renderQuestion() {
  const q = data.questions[index];
  selected = null;
  locked   = false;
  el.feedback.style.display = 'none';
  el.nextBtn.style.display  = 'none';
  el.submitBtn.style.display = 'inline-block';

  el.qText.textContent  = `${q.id}. ${q.text}`;
  el.qCount.textContent = `Question ${index + 1} of ${data.questions.length}`;

  const diff = getDifficultyLabel(q.id);
  if (el.difficultyTag) {
    el.difficultyTag.className   = `difficulty-tag ${diff.className}`;
    el.difficultyTag.textContent = `${diff.emoji} ${diff.label}`;
  }

  el.options.innerHTML = q.options.map((opt, i) => `
    <button class="option" data-i="${i}" type="button">${String.fromCharCode(65 + i)}. ${opt}</button>
  `).join('');

  [...el.options.querySelectorAll('.option')].forEach(btn => {
    btn.addEventListener('click', () => {
      if (locked) return;
      selected = Number(btn.dataset.i);
      [...el.options.querySelectorAll('.option')].forEach(o => o.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  renderProgress();
}

function gradeCurrent() {
  if (selected === null || locked) return;
  locked = true;

  const q       = data.questions[index];
  const correct = q.answerIndex;
  const isRight = selected === correct;
  if (isRight) { score++; fireConfetti(); }

  const diff = getDifficultyLabel(q.id);
  answers.push({
    q: q.id,
    difficulty: `${diff.emoji} ${diff.label}`,
    selected, selectedText: q.options[selected],
    correct,  correctText:  q.options[correct],
    isRight
  });

  [...el.options.querySelectorAll('.option')].forEach((o, i) => {
    if (i === correct) o.classList.add('correct');
    if (i === selected && !isRight) o.classList.add('wrong');
  });

  el.feedback.className   = `feedback ${isRight ? 'good' : 'bad'}`;
  el.feedback.textContent = isRight
    ? 'Correct ✅ Nice one.'
    : `Not quite. Correct answer is ${String.fromCharCode(65 + correct)}. ${q.options[correct]}`;
  el.feedback.style.display  = 'block';
  el.submitBtn.style.display = 'none';
  el.nextBtn.style.display   = 'inline-block';
}

function showResults() {
  stopTimer();
  el.card.style.display       = 'none';
  el.resultCard.style.display = 'block';
  el.progressBar.style.width  = '100%';

  const pct = Math.round((score / data.questions.length) * 100);
  const g   = getGradeInfo(pct);

  el.scoreText.textContent = `You scored ${score}/${data.questions.length} (${pct}%).`;
  if (el.gradeText) {
    el.gradeText.className   = `grade-pill ${g.className}`;
    el.gradeText.textContent = `${g.emoji} ${g.grade}`;
  }

  el.summaryBody.innerHTML = answers.map((a, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${a.difficulty}</td>
      <td><strong>${String.fromCharCode(65 + a.selected)}</strong>. ${a.selectedText}</td>
      <td><strong>${String.fromCharCode(65 + a.correct)}</strong>. ${a.correctText}</td>
      <td>${a.isRight ? '✅' : '❌'}</td>
    </tr>
  `).join('');
}

/* ── CERTIFICATE MODAL ── */
function openCertModal() {
  el.certModal.setAttribute('aria-hidden', 'false');
  el.certModal.classList.add('open');
  el.certName.focus();
}

function closeCertModal() {
  el.certModal.setAttribute('aria-hidden', 'true');
  el.certModal.classList.remove('open');
}

el.certCancelBtn.addEventListener('click', closeCertModal);
el.certModal.addEventListener('click', (e) => {
  if (e.target === el.certModal) closeCertModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeCertModal();
});

el.certGenerateBtn.addEventListener('click', () => {
  const name = el.certName.value.trim();
  if (!name) { el.certName.focus(); el.certName.style.borderColor = '#f87171'; return; }
  el.certName.style.borderColor = '';
  generateCertificate(name, el.certCompany.value.trim());
  closeCertModal();
});

/* ── CERTIFICATE GENERATION ── */
function generateCertificate(recipientName, company) {
  const total   = data.questions.length;
  const pct     = Math.round((score / total) * 100);
  const g       = getGradeInfo(pct);
  const dateStr = new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' });
  const certId  = 'AIL-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const trackTitle = `${data.emoji || ''} ${data.title}`.trim();
  const companyLine = company ? `<div class="cert-company">${company}</div>` : '';

  const gradeColors = { '#41d28f': '#41d28f', '#f0c05f': '#f0c05f', '#ef5e7a': '#ef5e7a' };
  const gradeColor  = g.color;
  const gradeBg     = g.bg;

  const certHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>AI Literacy Certificate – ${recipientName}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @page { size: A4 landscape; margin: 0; }

  html, body {
    width: 100%; height: 100%;
    font-family: Georgia, 'Times New Roman', serif;
    background: #080f1e;
  }

  body {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 16px;
  }

  .cert {
    width: 100%;
    max-width: 960px;
    aspect-ratio: 1.414 / 1;
    background:
      radial-gradient(ellipse at 15% 15%, rgba(201,162,39,.18) 0%, transparent 38%),
      radial-gradient(ellipse at 85% 85%, rgba(201,162,39,.14) 0%, transparent 38%),
      radial-gradient(ellipse at 82% 12%, rgba(56,189,248,.08) 0%, transparent 30%),
      radial-gradient(ellipse at 18% 88%, rgba(56,189,248,.08) 0%, transparent 30%),
      linear-gradient(160deg, #0d1b3e 0%, #0a1c35 50%, #0d1b3e 100%);
    border: 2px solid #c9a227;
    border-radius: 6px;
    position: relative;
    overflow: hidden;
    padding: 5% 8%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    text-align: center;
    color: #e8dfc8;
  }

  /* outer glow border */
  .cert::before {
    content: "";
    position: absolute;
    inset: 6px;
    border: 1px solid rgba(201,162,39,.28);
    border-radius: 3px;
    pointer-events: none;
  }

  /* decorative corner diamonds */
  .corner {
    position: absolute;
    width: 28px; height: 28px;
    border: 2px solid #c9a227;
    transform: rotate(45deg);
    background: #0d1b3e;
  }
  .corner.tl { top: -8px;  left: -8px; }
  .corner.tr { top: -8px;  right: -8px; }
  .corner.bl { bottom: -8px; left: -8px; }
  .corner.br { bottom: -8px; right: -8px; }

  /* watermark seal */
  .cert-seal {
    position: absolute;
    bottom: 10%;
    right: 7%;
    width: 100px; height: 100px;
    border-radius: 50%;
    border: 3px solid rgba(201,162,39,.22);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    opacity: .18;
  }
  .cert-seal-inner {
    width: 84px; height: 84px;
    border-radius: 50%;
    border: 1px solid rgba(201,162,39,.8);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    letter-spacing: .15em;
    text-transform: uppercase;
    color: #c9a227;
    font-family: Arial, sans-serif;
    font-weight: 700;
    line-height: 1.5;
  }
  .cert-seal-star { font-size: 20px; }

  /* top section */
  .cert-top { width: 100%; }
  .cert-brand {
    font-family: Arial, Helvetica, sans-serif;
    font-size: clamp(9px, 1.1vw, 13px);
    font-weight: 700;
    letter-spacing: .28em;
    text-transform: uppercase;
    color: #c9a227;
    margin-bottom: .5em;
  }
  .cert-rule {
    display: flex;
    align-items: center;
    gap: .8em;
    margin: .4em 0;
  }
  .cert-rule-line {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, #c9a227, transparent);
  }
  .cert-rule-diamond { color: #c9a227; font-size: .75em; }
  .cert-title {
    font-size: clamp(16px, 2.6vw, 30px);
    font-weight: 400;
    letter-spacing: .08em;
    color: #f5eed8;
    margin: .2em 0;
  }

  /* middle section */
  .cert-body { width: 100%; }
  .cert-certifies {
    font-family: Arial, sans-serif;
    font-size: clamp(8px, 1vw, 11px);
    letter-spacing: .18em;
    text-transform: uppercase;
    color: #9aaccc;
    margin-bottom: .6em;
  }
  .cert-name {
    font-size: clamp(22px, 3.8vw, 46px);
    font-weight: 700;
    font-style: italic;
    color: #fff;
    letter-spacing: .02em;
    line-height: 1.1;
    text-shadow: 0 2px 20px rgba(201,162,39,.4);
    border-bottom: 2px solid rgba(201,162,39,.5);
    padding-bottom: .15em;
    display: inline-block;
    margin-bottom: .25em;
  }
  .cert-company {
    font-family: Arial, sans-serif;
    font-size: clamp(9px, 1.1vw, 13px);
    color: #8899bb;
    letter-spacing: .06em;
    margin-bottom: .5em;
  }
  .cert-has-demonstrated {
    font-family: Arial, sans-serif;
    font-size: clamp(8px, 1vw, 11px);
    letter-spacing: .16em;
    text-transform: uppercase;
    color: #7a8daa;
    margin: .4em 0 .3em;
  }
  .cert-track {
    font-size: clamp(12px, 1.7vw, 20px);
    font-weight: 700;
    color: #e0d0a0;
    letter-spacing: .03em;
  }

  /* bottom section */
  .cert-footer {
    width: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: .5em;
  }
  .cert-score-block {
    display: flex;
    gap: 1.8em;
    align-items: center;
  }
  .cert-stat { text-align: left; }
  .cert-stat-label {
    font-family: Arial, sans-serif;
    font-size: clamp(7px, .85vw, 9px);
    letter-spacing: .16em;
    text-transform: uppercase;
    color: #6879a0;
    display: block;
    margin-bottom: .2em;
  }
  .cert-stat-value {
    font-size: clamp(11px, 1.5vw, 17px);
    font-weight: 700;
    color: #e8dfc8;
  }
  .cert-grade-badge {
    display: inline-block;
    padding: .25em .8em;
    border-radius: 999px;
    font-family: Arial, sans-serif;
    font-size: clamp(9px, 1.1vw, 13px);
    font-weight: 700;
    border: 1.5px solid ${gradeColor};
    color: ${gradeColor};
    background: ${gradeBg};
  }
  .cert-meta { text-align: right; }
  .cert-meta-line {
    font-family: Arial, sans-serif;
    font-size: clamp(7px, .85vw, 9px);
    color: #566880;
    letter-spacing: .1em;
    line-height: 2;
  }
  .cert-meta-line strong { color: #7a8fa8; }

  @media print {
    html, body { background: #080f1e; }
    .cert { border-color: #c9a227 !important; }
  }
</style>
</head>
<body>
<div class="cert">
  <div class="corner tl"></div>
  <div class="corner tr"></div>
  <div class="corner bl"></div>
  <div class="corner br"></div>

  <div class="cert-seal">
    <div class="cert-seal-inner">
      <span class="cert-seal-star">✦</span>
      AI Literacy<br/>Hub<br/>Verified
    </div>
  </div>

  <div class="cert-top">
    <div class="cert-brand">AI Literacy Hub</div>
    <div class="cert-rule">
      <div class="cert-rule-line"></div>
      <span class="cert-rule-diamond">◆</span>
      <div class="cert-rule-line"></div>
    </div>
    <div class="cert-title">Certificate of Achievement</div>
    <div class="cert-rule">
      <div class="cert-rule-line"></div>
      <span class="cert-rule-diamond">◆</span>
      <div class="cert-rule-line"></div>
    </div>
  </div>

  <div class="cert-body">
    <div class="cert-certifies">This certifies that</div>
    <div class="cert-name">${recipientName}</div>
    ${companyLine}
    <div class="cert-has-demonstrated">has demonstrated AI literacy proficiency in</div>
    <div class="cert-track">${trackTitle}</div>
  </div>

  <div class="cert-footer">
    <div class="cert-score-block">
      <div class="cert-stat">
        <span class="cert-stat-label">Score</span>
        <span class="cert-stat-value">${score} / ${total} &nbsp;(${pct}%)</span>
      </div>
      <div class="cert-stat">
        <span class="cert-stat-label">Level achieved</span>
        <span class="cert-grade-badge">${g.emoji} ${g.grade}</span>
      </div>
    </div>
    <div class="cert-meta">
      <div class="cert-meta-line"><strong>Date issued</strong> &nbsp; ${dateStr}</div>
      <div class="cert-meta-line"><strong>Certificate ID</strong> &nbsp; ${certId}</div>
      <div class="cert-meta-line">andrewrix-ctrl.github.io/ai-literacy-hub</div>
    </div>
  </div>
</div>
</body>
</html>`;

  const blob = new Blob([certHtml], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `ai-literacy-certificate-${track}-${Date.now()}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ── WIRING ── */
el.submitBtn.addEventListener('click', gradeCurrent);
el.nextBtn.addEventListener('click', () => {
  index += 1;
  if (index >= data.questions.length) { showResults(); return; }
  renderQuestion();
});

if (el.downloadCertBtn) {
  el.downloadCertBtn.addEventListener('click', openCertModal);
}

/* ── INIT ── */
(async function init() {
  try {
    const res = await fetch(`/ai-literacy-hub/tests/data/${track}.json`);
    if (!res.ok) throw new Error('Track not found');
    data = await res.json();
    data.questions = randomizeQuestionOptions(data.questions);
  } catch {
    el.title.textContent    = 'Track not found';
    el.audience.textContent = 'Please return to the hub and select a valid track.';
    return;
  }

  el.title.textContent    = `${data.emoji} ${data.title}`;
  el.audience.textContent = data.audience;
  el.card.style.display   = 'block';
  renderQuestion();
  startTimer();
})();
