const workGrid = document.querySelector('#work-grid');

if (workGrid && Array.isArray(window.WORKS)) {
  workGrid.innerHTML = window.WORKS.map((work, index) => `
    <a class="work-card ${index === 0 ? 'featured' : ''}" href="work.html?id=${encodeURIComponent(work.id)}" style="--card-accent:${work.accent}">
      <div class="card-cover">
        <img src="${work.cover}" alt="${work.title} 대표 이미지" ${index > 1 ? 'loading="lazy"' : ''}>
        <span class="card-no">${String(index + 1).padStart(2, '0')}</span>
        <span class="card-open">DETAIL ↗</span>
      </div>
      <div class="card-content">
        <p>${work.subtitle}</p>
        <h3>${work.title}</h3>
        <div class="rule"></div>
        <p class="description">${work.summary}</p>
        <ul aria-label="${work.title} 장르">${work.tags.map((tag) => `<li>${tag}</li>`).join('')}</ul>
      </div>
    </a>
  `).join('');
}

const audio = document.querySelector('#audio');
const deck = document.querySelector('#audio-deck');
const playButton = document.querySelector('#play');
const restartButton = document.querySelector('#restart');
const timeline = document.querySelector('#timeline');
const currentTime = document.querySelector('#current-time');
const duration = document.querySelector('#duration');
const waveform = document.querySelector('#waveform');

function formatTime(value) {
  if (!Number.isFinite(value)) return '00:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

if (waveform) {
  for (let i = 0; i < 48; i += 1) {
    const bar = document.createElement('i');
    bar.style.setProperty('--h', `${12 + ((i * 17) % 44)}%`);
    waveform.appendChild(bar);
  }
}

if (audio && deck && playButton && restartButton && timeline && currentTime && duration) {
  audio.addEventListener('loadedmetadata', () => {
    timeline.max = String(audio.duration);
    duration.textContent = formatTime(audio.duration);
  });

  audio.addEventListener('timeupdate', () => {
    timeline.value = String(audio.currentTime);
    currentTime.textContent = formatTime(audio.currentTime);
    const progress = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    timeline.style.setProperty('--progress', `${progress}%`);
  });

  audio.addEventListener('ended', () => {
    deck.classList.remove('is-playing');
    playButton.textContent = '▶';
    playButton.setAttribute('aria-label', '재생');
  });

  playButton.addEventListener('click', async () => {
    if (audio.paused) {
      await audio.play();
      deck.classList.add('is-playing');
      playButton.textContent = 'Ⅱ';
      playButton.setAttribute('aria-label', '일시정지');
    } else {
      audio.pause();
      deck.classList.remove('is-playing');
      playButton.textContent = '▶';
      playButton.setAttribute('aria-label', '재생');
    }
  });

  restartButton.addEventListener('click', () => { audio.currentTime = 0; });
  timeline.addEventListener('input', () => { audio.currentTime = Number(timeline.value); });
}
