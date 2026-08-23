const workGrid = document.querySelector('#work-grid');

if (workGrid && Array.isArray(window.WORKS)) {
  workGrid.innerHTML = window.WORKS.map((work, index) => `
    <a class="work-card" href="work.html?id=${encodeURIComponent(work.id)}" style="--card-accent:${work.accent}">
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
const trackSelector = document.querySelector('#track-selector');
const trackTitle = document.querySelector('#track-title');
const trackCredit = document.querySelector('#track-credit');
const trackNumber = document.querySelector('#track-number');
const trackPosition = document.querySelector('#track-position');

const tracks = [
  { title: '내 검이 너에게 닿기까지', version: 'A', work: '무신 고려 제일검객들', src: 'track-musinsa-a.mp3' },
  { title: '내 검이 너에게 닿기까지', version: 'B', work: '무신 고려 제일검객들', src: 'track-musinsa-b.mp3' },
  { title: 'BLACKHOUNDS', version: 'A', work: 'FRONTIS 2042', src: 'track-frontis-a.mp3' },
  { title: 'BLACKHOUNDS', version: 'B', work: 'FRONTIS 2042', src: 'track-frontis-b.mp3' },
  { title: 'CODE BLACK', version: 'A', work: 'CODE BLACK', src: 'track-codeblack-a.mp3' },
  { title: 'CODE BLACK', version: 'B', work: 'CODE BLACK', src: 'track-codeblack-b.mp3' }
];

let activeTrackIndex = 0;

function updateTrack(index, autoplay = false) {
  const track = tracks[index];
  if (!track || !audio) return;
  activeTrackIndex = index;
  audio.pause();
  audio.src = track.src;
  audio.load();
  deck?.classList.remove('is-playing');
  if (playButton) playButton.textContent = '▶';
  if (currentTime) currentTime.textContent = '00:00';
  if (duration) duration.textContent = '00:00';
  if (timeline) {
    timeline.value = '0';
    timeline.style.setProperty('--progress', '0%');
  }
  if (trackTitle) trackTitle.textContent = `${track.title} · ${track.version}`;
  if (trackCredit) trackCredit.textContent = `${track.work} · 땅콩마미`;
  if (trackNumber) trackNumber.textContent = `TRACK ${String(index + 1).padStart(2, '0')}`;
  if (trackPosition) trackPosition.textContent = `${String(index + 1).padStart(2, '0')} / ${String(tracks.length).padStart(2, '0')}`;
  trackSelector?.querySelectorAll('button').forEach((button, buttonIndex) => {
    button.classList.toggle('active', buttonIndex === index);
    button.setAttribute('aria-pressed', buttonIndex === index ? 'true' : 'false');
  });
  if (autoplay) {
    audio.play().then(() => {
      deck?.classList.add('is-playing');
      if (playButton) playButton.textContent = 'Ⅱ';
    }).catch(() => {});
  }
}

if (trackSelector) {
  trackSelector.innerHTML = tracks.map((track, index) => `
    <button type="button" class="track-option ${index === 0 ? 'active' : ''}" data-track="${index}" aria-pressed="${index === 0 ? 'true' : 'false'}">
      <span>${track.work}</span><strong>${track.title}</strong><i>${track.version}</i>
    </button>
  `).join('');
  trackSelector.addEventListener('click', (event) => {
    const button = event.target.closest('[data-track]');
    if (button) updateTrack(Number(button.dataset.track), true);
  });
}

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
