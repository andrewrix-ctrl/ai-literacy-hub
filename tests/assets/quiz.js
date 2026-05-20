const params = new URLSearchParams(window.location.search);
const track = params.get('track') || 'technical';

const el = {
  title: document.getElementById('quizTitle'),
  audience: document.getElementById('quizAudience'),
  qCount: document.getElementById('qCount'),
  progressBar: document.getElementById('progressBar'),
  card: document.getElementById('quizCard'),
  qText: document.getElementById('qText'),
  difficultyTag: document.getElementById('difficultyTag'),
  options: document.getElementById('options'),
  submitBtn: document.getElementById('submitBtn'),
  nextBtn: document.getElementById('nextBtn'),
  feedback: document.getElementById('feedback'),
  resultCard: document.getElementById('resultCard'),
  scoreText: document.getElementById('scoreText'),
  gradeText: document.getElementById('gradeText'),
  downloadCertBtn: document.getElementById('downloadCertBtn'),
  summaryBody: document.getElementById('summaryBody')
};

let data = null;
let index = 0;
let selected = null;
let locked = false;
let score = 0;
const answers = [];

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
  if (qId <= 7) return { label: 'Beginner', emoji: '🌱', className: 'difficulty-beginner' };
  if (qId <= 14) return { label: 'Intermediate', emoji: '⚡', className: 'difficulty-intermediate' };
  return { label: 'Advanced', emoji: '🚀', className: 'difficulty-advanced' };
}

function getGradeInfo(pct) {
  if (pct >= 75) return { grade: 'Advanced', emoji: '🚀', className: 'grade-advanced' };
  if (pct >= 45) return { grade: 'Intermediate', emoji: '⚡', className: 'grade-intermediate' };
  return { grade: 'Beginner', emoji: '🌱', className: 'grade-beginner' };
}

function fireConfetti() {
  if (typeof confetti !== 'function') return;
  confetti({
    particleCount: 90,
    spread: 70,
    origin: { y: 0.6 },
    scalar: 0.95
  });
}

function renderProgress() {
  const pct = (index / data.questions.length) * 100;
  el.progressBar.style.width = `${pct}%`;
}

function renderQuestion() {
  const q = data.questions[index];
  selected = null;
  locked = false;
  el.feedback.style.display = 'none';
  el.nextBtn.style.display = 'none';
  el.submitBtn.style.display = 'inline-block';

  el.qText.textContent = `${q.id}. ${q.text}`;
  el.qCount.textContent = `Question ${index + 1} of ${data.questions.length}`;

  const diff = getDifficultyLabel(q.id);
  if (el.difficultyTag) {
    el.difficultyTag.className = `difficulty-tag ${diff.className}`;
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

  const q = data.questions[index];
  const correct = q.answerIndex;
  const isRight = selected === correct;
  if (isRight) {
    score += 1;
    fireConfetti();
  }

  const diff = getDifficultyLabel(q.id);

  answers.push({
    q: q.id,
    difficulty: `${diff.emoji} ${diff.label}`,
    selected,
    selectedText: q.options[selected],
    correct,
    correctText: q.options[correct],
    isRight
  });

  [...el.options.querySelectorAll('.option')].forEach((o, i) => {
    if (i === correct) o.classList.add('correct');
    if (i === selected && !isRight) o.classList.add('wrong');
  });

  el.feedback.className = `feedback ${isRight ? 'good' : 'bad'}`;
  el.feedback.textContent = isRight
    ? 'Correct ✅ Nice one.'
    : `Not quite. Correct answer is ${String.fromCharCode(65 + correct)}. ${q.options[correct]}`;
  el.feedback.style.display = 'block';

  el.submitBtn.style.display = 'none';
  el.nextBtn.style.display = 'inline-block';
}

function downloadCertificate() {
  const total = data.questions.length;
  const pct = Math.round((score / total) * 100);
  const g = getGradeInfo(pct);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' });

  const certHtml = `<!doctype html>
<html><head><meta charset="utf-8"><title>AI Literacy Certificate</title>
<style>
body{font-family:Arial,sans-serif;background:#0f172a;color:#e2e8f0;padding:24px}
.card{max-width:760px;margin:0 auto;background:#111b35;border:1px solid #334155;border-radius:14px;padding:24px}
h1{margin:0 0 8px;font-size:28px}p{margin:6px 0}.badge{display:inline-block;padding:6px 12px;border-radius:999px;border:1px solid #475569;background:#1e293b;font-weight:700}
.small{color:#94a3b8;font-size:13px;margin-top:14px}
</style></head><body>
<div class="card">
<h1>AI Literacy Completion Certificate</h1>
<p><strong>Track:</strong> ${data.title}</p>
<p><strong>Score:</strong> ${score}/${total} (${pct}%)</p>
<p><strong>Level:</strong> <span class="badge">${g.emoji} ${g.grade}</span></p>
<p><strong>Date:</strong> ${dateStr}</p>
<p class="small">Issued by Diego Claw • https://andrewrix-ctrl.github.io/ai-literacy-hub/</p>
</div></body></html>`;

  const blob = new Blob([certHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ai-literacy-certificate-${track}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function showResults() {
  el.card.style.display = 'none';
  el.resultCard.style.display = 'block';
  el.progressBar.style.width = '100%';

  const pct = Math.round((score / data.questions.length) * 100);
  const g = getGradeInfo(pct);

  el.scoreText.textContent = `You scored ${score}/${data.questions.length} (${pct}%).`;
  if (el.gradeText) {
    el.gradeText.className = `grade-pill ${g.className}`;
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

el.submitBtn.addEventListener('click', gradeCurrent);
el.nextBtn.addEventListener('click', () => {
  index += 1;
  if (index >= data.questions.length) {
    showResults();
    return;
  }
  renderQuestion();
});

if (el.downloadCertBtn) {
  el.downloadCertBtn.addEventListener('click', downloadCertificate);
}

(async function init() {
  try {
    const res = await fetch(`/ai-literacy-hub/tests/data/${track}.json`);
    if (!res.ok) throw new Error('Track not found');
    data = await res.json();
    data.questions = randomizeQuestionOptions(data.questions);
  } catch {
    el.title.textContent = 'Track not found';
    el.audience.textContent = 'Please return to the hub and select a valid track.';
    return;
  }

  el.title.textContent = `${data.emoji} ${data.title}`;
  el.audience.textContent = data.audience;
  el.card.style.display = 'block';
  renderQuestion();
})();
