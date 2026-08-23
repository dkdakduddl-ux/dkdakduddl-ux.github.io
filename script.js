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

for (let i = 0; i < 48; i += 1) {
  const bar = document.createElement('i');
  bar.style.setProperty('--h', `${12 + ((i * 17) % 44)}%`);
  waveform.appendChild(bar);
}

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

restartButton.addEventListener('click', () => {
  audio.currentTime = 0;
});

timeline.addEventListener('input', () => {
  audio.currentTime = Number(timeline.value);
});
