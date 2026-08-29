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
const soundHeading = document.querySelector('#sound-heading');

const tracks = [
  { title: '내 검이 너에게 닿기까지', version: 'A', work: '무신 고려 제일검객들', heading: '무신 고려 제일검객들 OST_A', src: 'track-musinsa-a.MP3' },
  { title: '내 검이 너에게 닿기까지', version: 'B', work: '무신 고려 제일검객들', heading: '무신 고려 제일검객들 OST_B', src: 'track-musinsa-b.MP3' },
  { title: 'BLACKHOUNDS', version: 'A', work: 'FRONTIS 2042', heading: 'BLACKHOUNDS OST_A', src: 'track-frontis-a.MP3' },
  { title: 'BLACKHOUNDS', version: 'B', work: 'FRONTIS 2042', heading: 'BLACKHOUNDS OST_B', src: 'track-frontis-b.MP3' },
  { title: 'CODE BLACK', version: 'A', work: 'CODE BLACK', heading: 'CODE BLACK OST_A', src: 'track-codeblack-a.MP3' },
  { title: 'CODE BLACK', version: 'B', work: 'CODE BLACK', heading: 'CODE BLACK OST_B', src: 'track-codeblack-b.MP3' },
  { title: '내 남친은 사체술사', version: 'A', work: '내 남친은 사체술사', heading: '내 남친은 사체술사 OST_A', src: 'track-necromancer-1-a.MP3' },
  { title: '내 남친은 사체술사', version: 'B', work: '내 남친은 사체술사', heading: '내 남친은 사체술사 OST_B', src: 'track-necromancer-1-b.MP3' },
  { title: '남친이 죽은 나를 사랑한다', version: 'A', work: '내 남친은 사체술사', heading: '내 남친은 사체술사 OST_A', src: 'track-necromancer-2-a.MP3' },
  { title: '남친이 죽은 나를 사랑한다', version: 'B', work: '내 남친은 사체술사', heading: '내 남친은 사체술사 OST_B', src: 'track-necromancer-2-b.MP3' },
  { title: '수취인 불명 OST', version: 'A', work: '수취인 불명', heading: '수취인 불명 OST_A', src: 'track-recipient-a.MP3' },
  { title: '수취인 불명 OST', version: 'B', work: '수취인 불명', heading: '수취인 불명 OST_B', src: 'track-recipient-b.MP3' },
  { title: '수취인 불명 OST', version: 'C', work: '수취인 불명', heading: '수취인 불명 OST_C', src: 'track-recipient-c.MP3' },
  { title: '수취인 불명 OST', version: 'D', work: '수취인 불명', heading: '수취인 불명 OST_D', src: 'track-recipient-d.MP3' }
];

const previousButton = document.querySelector('#previous-track');
const nextButton = document.querySelector('#next-track');
const shuffleButton = document.querySelector('#shuffle');
const repeatButton = document.querySelector('#repeat');
const allButton = document.querySelector('#all-tracks');
const savedButton = document.querySelector('#saved-tracks');
const allCount = document.querySelector('#all-count');
const savedCount = document.querySelector('#saved-count');
const playlistEmpty = document.querySelector('#playlist-empty');
const playlistNote = document.querySelector('#playlist-note');
const playerStatus = document.querySelector('#player-status');
const muteButton = document.querySelector('#mute');
const volumeSlider = document.querySelector('#volume');
const volumeValue = document.querySelector('#volume-value');
const storageKey = 'peanutmami-archive-player-v1';
const indexBySource = new Map(tracks.map((track, index) => [track.src, index]));
let storageUnavailable = false;

function readPreferences() {
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch (error) {
    storageUnavailable = error.name !== 'SyntaxError';
    return {};
  }
}

const preferences = readPreferences();
let savedSources = Array.isArray(preferences.saved)
  ? [...new Set(preferences.saved.filter((src) => indexBySource.has(src)))] : [];
let playlistView = preferences.view === 'saved' ? 'saved' : 'all';
let shuffleEnabled = preferences.shuffle === true;
let repeatMode = ['off', 'all', 'one'].includes(preferences.repeat) ? preferences.repeat : 'off';
const storedVolume = typeof preferences.volume === 'number' && Number.isFinite(preferences.volume)
  ? preferences.volume : 0.8;
let volumeLevel = Math.min(1, Math.max(0, storedVolume));
let muted = preferences.muted === true;
let lastAudibleVolume = volumeLevel > 0 ? volumeLevel : 0.8;
let activeTrackIndex = -1;
let playOrder = [];
let queueCursor = -1;
let queueCompleted = false;
let playbackToken = 0;

function updateStorageNote() {
  if (!playlistNote) return;
  playlistNote.textContent = storageUnavailable
    ? '이 브라우저에서는 목록을 저장할 수 없어요. 담은 곡은 이번 방문에서만 유지됩니다.'
    : '선택한 목록을 이어서 재생해요. 내 재생목록은 이 브라우저에만 저장되며, 다른 기기와 동기화되지 않아요.';
}

function persistPreferences() {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify({
      saved: savedSources,
      view: playlistView,
      shuffle: shuffleEnabled,
      repeat: repeatMode,
      volume: volumeLevel,
      muted
    }));
    storageUnavailable = false;
  } catch {
    storageUnavailable = true;
  }
  updateStorageNote();
}

function visibleTrackIndices() {
  return playlistView === 'saved'
    ? savedSources.map((src) => indexBySource.get(src))
    : tracks.map((_, index) => index);
}

function shuffled(indices) {
  const result = [...indices];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function setStatus(message = '') {
  if (playerStatus) playerStatus.textContent = message;
}

function renderVolume() {
  const percent = Math.round(volumeLevel * 100);
  const silent = muted || volumeLevel === 0;
  if (audio) {
    audio.volume = volumeLevel;
    audio.muted = muted;
  }
  if (volumeSlider) {
    volumeSlider.value = String(percent);
    volumeSlider.setAttribute('aria-valuetext', `${percent}%`);
  }
  if (volumeValue) volumeValue.textContent = `${percent}%`;
  if (muteButton) {
    muteButton.textContent = silent ? '소리 켜기' : '음소거';
    muteButton.setAttribute('aria-label', silent ? '소리 켜기' : '음소거');
    muteButton.setAttribute('aria-pressed', String(silent));
  }
}

function formatTime(value) {
  if (!Number.isFinite(value) || value < 0) return '00:00';
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
}

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function syncPlaybackState() {
  const playing = activeTrackIndex >= 0 && audio && !audio.paused && !audio.ended;
  deck?.classList.toggle('is-playing', Boolean(playing));
  if (playButton) {
    playButton.textContent = playing ? 'Ⅱ' : '▶';
    playButton.setAttribute('aria-label', playing ? '일시정지' : '재생');
  }
}

function renderControls() {
  const empty = playOrder.length === 0;
  if (playButton) playButton.disabled = empty;
  if (restartButton) restartButton.disabled = empty;
  if (previousButton) previousButton.disabled = empty || (queueCursor <= 0 && repeatMode !== 'all');
  if (nextButton) nextButton.disabled = empty || (queueCursor >= playOrder.length - 1 && repeatMode !== 'all');
  if (trackPosition) trackPosition.textContent = `${String(empty ? 0 : queueCursor + 1).padStart(2, '0')} / ${String(playOrder.length).padStart(2, '0')}`;
  if (shuffleButton) {
    shuffleButton.textContent = shuffleEnabled ? '랜덤 켜짐' : '랜덤 꺼짐';
    shuffleButton.setAttribute('aria-pressed', String(shuffleEnabled));
  }
  if (repeatButton) {
    const labels = { off: '반복 끔', all: '전체 반복', one: '한 곡 반복' };
    const nextModes = { off: 'all', all: 'one', one: 'off' };
    repeatButton.textContent = labels[repeatMode];
    repeatButton.dataset.mode = repeatMode;
    repeatButton.setAttribute('aria-label', `${labels[repeatMode]}. 누르면 ${labels[nextModes[repeatMode]]}`);
  }
  syncPlaybackState();
}

function renderSelection() {
  trackSelector?.querySelectorAll('[data-track]').forEach((button) => {
    const selected = Number(button.dataset.track) === activeTrackIndex;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  renderControls();
}

function renderPlaylist() {
  if (!trackSelector) return;
  const indices = visibleTrackIndices();
  const focused = document.activeElement?.closest?.('[data-save], [data-track]');
  const focusKind = focused?.hasAttribute('data-save') ? 'save' : 'track';
  const focusIndex = focused ? Number(focused.dataset[focusKind]) : -1;
  const previousIndices = [...trackSelector.querySelectorAll('[data-track]')].map((button) => Number(button.dataset.track));
  trackSelector.innerHTML = indices.map((index) => {
    const track = tracks[index];
    const saved = savedSources.includes(track.src);
    const label = escapeText(`${track.title} ${track.version}`);
    return `<div class="track-row">
      <button type="button" class="track-option" data-track="${index}" aria-pressed="false" aria-label="${label} 재생">
        <span>${escapeText(track.work)}</span><strong>${escapeText(track.title)}</strong><i>${escapeText(track.version)}</i>
      </button>
      <button type="button" class="save-track" data-save="${index}" aria-pressed="${saved}" aria-label="${label} · ${saved ? '내 재생목록에서 빼기' : '내 재생목록에 담기'}" title="${saved ? '내 재생목록에서 빼기' : '내 재생목록에 담기'}">${saved ? '♥' : '♡'}</button>
    </div>`;
  }).join('');
  if (allCount) allCount.textContent = String(tracks.length);
  if (savedCount) savedCount.textContent = String(savedSources.length);
  allButton?.setAttribute('aria-pressed', String(playlistView === 'all'));
  savedButton?.setAttribute('aria-pressed', String(playlistView === 'saved'));
  if (playlistEmpty) playlistEmpty.hidden = indices.length > 0;
  trackSelector.setAttribute('aria-label', playlistView === 'saved' ? '내 재생목록' : '전체 음원');
  renderSelection();
  if (focused) {
    const fallback = indices[Math.min(Math.max(previousIndices.indexOf(focusIndex), 0), indices.length - 1)];
    const target = trackSelector.querySelector(`[data-${focusKind}="${focusIndex}"]`)
      || trackSelector.querySelector(`[data-${focusKind}="${fallback}"]`) || allButton;
    target?.focus({ preventScroll: true });
  }
}

function resetTimeline() {
  if (currentTime) currentTime.textContent = '00:00';
  if (duration) duration.textContent = '00:00';
  if (timeline) {
    timeline.value = '0';
    timeline.max = '0';
    timeline.disabled = true;
    timeline.style.setProperty('--progress', '0%');
  }
}

async function startPlayback() {
  if (!audio || activeTrackIndex < 0) return;
  const request = ++playbackToken;
  setStatus();
  try {
    await audio.play();
    if (request === playbackToken) syncPlaybackState();
  } catch (error) {
    if (request !== playbackToken || error.name === 'AbortError') return;
    syncPlaybackState();
    setStatus(error.name === 'NotAllowedError'
      ? '재생 버튼을 눌러 음악을 시작해 주세요.'
      : '음원을 재생하지 못했어요. 다시 시도하거나 다음 곡을 선택해 주세요.');
  }
}

function loadTrack(index, autoplay = false) {
  if (!audio) return;
  playbackToken += 1;
  audio.pause();
  activeTrackIndex = index;
  queueCompleted = false;
  resetTimeline();
  setStatus();
  const track = tracks[index];
  if (track) {
    audio.src = track.src;
    if (trackTitle) trackTitle.textContent = `${track.title} · ${track.version}`;
    if (trackCredit) trackCredit.textContent = `${track.work} · 땅콩마미`;
    if (soundHeading) soundHeading.textContent = track.heading;
    if (trackNumber) trackNumber.textContent = `TRACK ${String(index + 1).padStart(2, '0')}`;
  } else {
    audio.removeAttribute('src');
    if (trackTitle) trackTitle.textContent = '담은 곡이 없어요';
    if (trackCredit) trackCredit.textContent = '전체 음원에서 ♡를 눌러 곡을 담아주세요.';
    if (soundHeading) soundHeading.textContent = '내 재생목록';
    if (trackNumber) trackNumber.textContent = 'TRACK —';
  }
  audio.load();
  renderSelection();
  if (autoplay && track) void startPlayback();
}

function rebuildQueue(preferredIndex = activeTrackIndex, autoplay = false) {
  const indices = visibleTrackIndices();
  const keepTrack = indices.includes(preferredIndex);
  playOrder = shuffleEnabled
    ? (keepTrack ? [preferredIndex, ...shuffled(indices.filter((index) => index !== preferredIndex))] : shuffled(indices))
    : [...indices];
  queueCursor = indices.length ? (keepTrack ? playOrder.indexOf(preferredIndex) : 0) : -1;
  queueCompleted = false;
  const nextIndex = playOrder[queueCursor] ?? -1;
  if (nextIndex !== activeTrackIndex || !indices.length) loadTrack(nextIndex, autoplay);
  else renderSelection();
}

function startNewCycle(autoplay = true) {
  const indices = visibleTrackIndices();
  if (!indices.length) return;
  playOrder = shuffleEnabled ? shuffled(indices) : [...indices];
  if (shuffleEnabled && playOrder.length > 1 && playOrder[0] === activeTrackIndex) {
    [playOrder[0], playOrder[1]] = [playOrder[1], playOrder[0]];
  }
  queueCursor = 0;
  loadTrack(playOrder[queueCursor], autoplay);
}

function advanceTrack(direction, autoplay = true) {
  if (!playOrder.length) return;
  const nextCursor = queueCursor + direction;
  if (nextCursor >= playOrder.length) {
    if (repeatMode === 'all') startNewCycle(autoplay);
    else {
      queueCompleted = true;
      playbackToken += 1;
      audio.pause();
      renderControls();
      setStatus('목록의 마지막 곡까지 재생했어요.');
    }
    return;
  }
  if (nextCursor < 0 && repeatMode !== 'all') return;
  queueCursor = nextCursor < 0 ? playOrder.length - 1 : nextCursor;
  loadTrack(playOrder[queueCursor], autoplay);
}

function selectTrack(index) {
  const indices = visibleTrackIndices();
  if (!indices.includes(index)) return;
  playOrder = shuffleEnabled ? [index, ...shuffled(indices.filter((item) => item !== index))] : [...indices];
  queueCursor = playOrder.indexOf(index);
  loadTrack(index, true);
}

function changePlaylist(view) {
  if (playlistView === view) return;
  const wasPlaying = audio && !audio.paused && !audio.ended;
  playlistView = view;
  rebuildQueue(activeTrackIndex, wasPlaying);
  renderPlaylist();
  persistPreferences();
}

function toggleSavedTrack(index) {
  const track = tracks[index];
  if (!track) return;
  const previousIndices = visibleTrackIndices();
  const previousPosition = previousIndices.indexOf(activeTrackIndex);
  const wasPlaying = audio && !audio.paused && !audio.ended;
  const wasSaved = savedSources.includes(track.src);
  savedSources = wasSaved ? savedSources.filter((src) => src !== track.src) : [...savedSources, track.src];
  if (playlistView === 'saved') {
    const indices = visibleTrackIndices();
    const preferred = indices.includes(activeTrackIndex) ? activeTrackIndex
      : indices[Math.min(Math.max(previousPosition, 0), indices.length - 1)];
    rebuildQueue(preferred, wasPlaying);
  }
  renderPlaylist();
  persistPreferences();
  setStatus(wasSaved ? '내 재생목록에서 뺐어요.' : '내 재생목록에 담았어요.');
}

if (waveform) {
  for (let i = 0; i < 48; i += 1) {
    const bar = document.createElement('i');
    bar.style.setProperty('--h', `${12 + ((i * 17) % 44)}%`);
    waveform.appendChild(bar);
  }
}

if (audio && deck && playButton && trackSelector) {
  audio.loop = false;
  renderVolume();
  trackSelector.addEventListener('click', (event) => {
    const save = event.target.closest('[data-save]');
    if (save) toggleSavedTrack(Number(save.dataset.save));
    else {
      const button = event.target.closest('[data-track]');
      if (button) selectTrack(Number(button.dataset.track));
    }
  });
  allButton?.addEventListener('click', () => changePlaylist('all'));
  savedButton?.addEventListener('click', () => changePlaylist('saved'));
  shuffleButton?.addEventListener('click', () => {
    shuffleEnabled = !shuffleEnabled;
    rebuildQueue();
    persistPreferences();
  });
  repeatButton?.addEventListener('click', () => {
    repeatMode = { off: 'all', all: 'one', one: 'off' }[repeatMode];
    renderControls();
    persistPreferences();
  });
  muteButton?.addEventListener('click', () => {
    if (muted || volumeLevel === 0) {
      if (volumeLevel === 0) volumeLevel = lastAudibleVolume;
      muted = false;
    } else muted = true;
    renderVolume();
    persistPreferences();
    setStatus(muted ? '음소거했어요.' : `음량 ${Math.round(volumeLevel * 100)}%`);
  });
  volumeSlider?.addEventListener('input', () => {
    volumeLevel = Math.min(1, Math.max(0, Number(volumeSlider.value) / 100));
    if (volumeLevel > 0) {
      lastAudibleVolume = volumeLevel;
      muted = false;
    }
    renderVolume();
    persistPreferences();
  });
  volumeSlider?.addEventListener('change', () => {
    setStatus(volumeLevel === 0 ? '음량을 0%로 낮췄어요.' : `음량 ${Math.round(volumeLevel * 100)}%`);
  });
  previousButton?.addEventListener('click', () => advanceTrack(-1, !audio.paused));
  nextButton?.addEventListener('click', () => advanceTrack(1, !audio.paused));
  playButton.addEventListener('click', () => {
    if (audio.paused || audio.ended) {
      if (queueCompleted) startNewCycle();
      else {
        if (audio.ended) audio.currentTime = 0;
        void startPlayback();
      }
    } else {
      playbackToken += 1;
      audio.pause();
    }
  });
  restartButton?.addEventListener('click', () => {
    if (activeTrackIndex < 0) return;
    audio.currentTime = 0;
    queueCompleted = false;
    setStatus();
  });
  timeline?.addEventListener('input', () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = Math.min(audio.duration, Math.max(0, Number(timeline.value)));
    }
  });
  function updateDuration() {
    const length = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
    if (timeline) {
      timeline.max = String(length);
      timeline.disabled = !length;
    }
    if (duration) duration.textContent = formatTime(length);
  }
  audio.addEventListener('loadedmetadata', updateDuration);
  audio.addEventListener('durationchange', updateDuration);
  audio.addEventListener('timeupdate', () => {
    if (currentTime) currentTime.textContent = formatTime(audio.currentTime);
    if (timeline) {
      timeline.value = String(audio.currentTime || 0);
      const progress = Number.isFinite(audio.duration) && audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0;
      timeline.style.setProperty('--progress', `${Math.min(100, Math.max(0, progress))}%`);
    }
  });
  audio.addEventListener('play', syncPlaybackState);
  audio.addEventListener('pause', syncPlaybackState);
  audio.addEventListener('playing', () => { syncPlaybackState(); setStatus(); });
  audio.addEventListener('waiting', () => {
    if (!audio.paused) setStatus('음원을 불러오는 중이에요…');
  });
  audio.addEventListener('ended', () => {
    if (activeTrackIndex < 0) return;
    if (repeatMode === 'one') {
      audio.currentTime = 0;
      void startPlayback();
    } else advanceTrack(1, true);
  });
  audio.addEventListener('error', () => {
    if (activeTrackIndex < 0 || !audio.error) return;
    playbackToken += 1;
    audio.pause();
    syncPlaybackState();
    setStatus('음원을 불러오지 못했어요. 다음 곡을 선택하거나 음원 파일을 확인해 주세요.');
  });
  renderPlaylist();
  rebuildQueue();
  updateStorageNote();
}
