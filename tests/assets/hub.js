const tracks = [
  { slug: 'general', title: 'General AI Literacy', emoji: '🌐' },
  { slug: 'technical', title: 'Technical Specialist / Engineer', emoji: '🛠️' },
  { slug: 'delivery', title: 'Delivery / Operations Professional', emoji: '🚚' },
  { slug: 'architect', title: 'Architect / Designer', emoji: '🏗️' },
  { slug: 'risk', title: 'Risk / GRC / Assurance', emoji: '🛡️' },
  { slug: 'leader', title: 'Leader / Manager', emoji: '📈' },
  { slug: 'business', title: 'Business / Corporate Professional', emoji: '💼' }
];

const grid = document.getElementById('trackGrid');
if (grid) {
  grid.innerHTML = tracks.map(t => `
    <article class="track-card">
      <h3>${t.emoji} ${t.title}</h3>
      <p>20-question role-based AI literacy assessment.</p>
      <a class="btn" href="/ai-literacy-hub/tests/quiz.html?track=${t.slug}">Start quiz</a>
    </article>
  `).join('');
}
