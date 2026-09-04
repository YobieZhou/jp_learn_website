import {
  readingLessons,
  readingCatalogSummary,
  readingDiscIntro
} from './reading-data.mjs?v=minna-v2-audio-v1';

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const STORAGE_KEY = 'kotoba-reading-n5-minna-v2-state-v1';

const elements = {
  stage: $('#reading-stage'),
  stageScroll: $('#stage-scroll'),
  lessonList: $('#lesson-list'),
  search: $('#lesson-search'),
  unitFilters: $('#unit-filters'),
  sidebar: $('#lesson-sidebar'),
  sidebarOpen: $('#sidebar-open'),
  sidebarClose: $('#sidebar-close'),
  sidebarScrim: $('#sidebar-scrim'),
  mobileLessonLabel: $('#mobile-lesson-label'),
  level: $('#lesson-level'),
  number: $('#lesson-number'),
  topic: $('#lesson-topic'),
  title: $('#lesson-title'),
  titleZh: $('#lesson-title-zh'),
  goal: $('#lesson-goal'),
  readingText: $('#reading-text'),
  instruction: $('#reading-instruction'),
  completedCount: $('#completed-count'),
  sentenceTotal: $('#sentence-total'),
  vocabularyPanel: $('#vocabulary-panel'),
  grammarPanel: $('#grammar-panel'),
  notesTabs: $('#notes-tabs'),
  startSession: $('#start-session'),
  displayModes: $('#display-modes'),
  furiganaToggle: $('#furigana-toggle'),
  translationToggle: $('#translation-toggle'),
  speedSelect: $('#speed-select'),
  gapSelect: $('#gap-select'),
  loopButton: $('#loop-button'),
  audio: $('#reading-audio'),
  audioProgress: $('#audio-progress'),
  playingIndex: $('#playing-index'),
  nowPlayingText: $('#now-playing-text'),
  previous: $('#previous-sentence'),
  replay: $('#replay-sentence'),
  play: $('#main-play'),
  next: $('#next-sentence'),
  skipNext: $('#skip-next'),
  record: $('#record-button'),
  recordPlay: $('#record-play'),
  countdown: $('#countdown'),
  countdownNumber: $('#countdown b'),
  toast: $('#toast'),
  discIntroLines: $('#disc-intro-lines')
};

const defaultState = {
  lessonId: 1,
  unit: 'ALL',
  speed: 1,
  gap: 800,
  display: 'study',
  furigana: true,
  translation: false,
  loop: 'off',
  completed: {}
};

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...defaultState, ...stored, completed: stored?.completed ?? {} };
  } catch {
    return { ...defaultState };
  }
}

let state = loadState();
let currentLesson = readingLessons[0];
let currentSentenceIndex = 0;
let sequenceMode = false;
let sequenceTimer = 0;
let toastTimer = 0;
let mediaRecorder = null;
let recordingStream = null;
let recordingChunks = [];
let recordingUrl = '';
let clipStart = 0;
let clipEnd = 0;
let clipCompletionHandled = false;
let playRequestId = 0;
let clipAnimationFrame = 0;
let discIntroClipEnd = 0;
let currentDiscIntroIndex = -1;
const recordingPlayback = new Audio();
const discIntroPlayback = new Audio(readingDiscIntro.audio);
discIntroPlayback.preload = 'metadata';

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* Storage can be unavailable in private mode. */ }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderMarkup(markup) {
  const value = String(markup);
  const pattern = /｜([^《]+)《([^》]+)》|([々〆ヵヶ一-龯]+)\[([^\]]+)\]/g;
  let cursor = 0;
  let html = '';
  for (const match of value.matchAll(pattern)) {
    html += escapeHtml(value.slice(cursor, match.index));
    const surface = match[1] ?? match[3];
    const reading = match[2] ?? match[4];
    html += `<ruby>${escapeHtml(surface)}<rt>${escapeHtml(reading)}</rt></ruby>`;
    cursor = match.index + match[0].length;
  }
  return html + escapeHtml(value.slice(cursor));
}

function formatTimestamp(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

function lessonNumber(value) {
  return String(value).padStart(2, '0');
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => elements.toast.classList.remove('show'), 2600);
}

function renderDiscIntro() {
  elements.discIntroLines.innerHTML = readingDiscIntro.lines.map((line, index) => `
    <button type="button" data-disc-line="${index}" aria-label="播放光盘说明 ${formatTimestamp(line.start)}：${escapeHtml(line.jp)}">
      <span>${formatTimestamp(line.start)}</span><b>${escapeHtml(line.jp)}</b><i aria-hidden="true">▶</i>
    </button>`).join('');
}

function stopDiscIntro() {
  discIntroPlayback.pause();
  currentDiscIntroIndex = -1;
  $$('[data-disc-line]', elements.discIntroLines).forEach((button) => button.classList.remove('active'));
}

async function playDiscIntroLine(index) {
  const line = readingDiscIntro.lines[index];
  if (!line) return;
  if (currentDiscIntroIndex === index && !discIntroPlayback.paused) {
    stopDiscIntro();
    return;
  }
  stopSequence();
  elements.audio.pause();
  stopDiscIntro();
  currentDiscIntroIndex = index;
  discIntroClipEnd = line.end;
  $$('[data-disc-line]', elements.discIntroLines).forEach((button) => {
    button.classList.toggle('active', Number(button.dataset.discLine) === index);
  });
  try {
    if (discIntroPlayback.readyState < HTMLMediaElement.HAVE_METADATA) {
      await new Promise((resolve, reject) => {
        discIntroPlayback.addEventListener('loadedmetadata', resolve, { once: true });
        discIntroPlayback.addEventListener('error', reject, { once: true });
      });
    }
    discIntroPlayback.currentTime = line.start;
    await discIntroPlayback.play();
  } catch {
    stopDiscIntro();
    showToast('光盘说明音频加载失败，请刷新页面后重试。');
  }
}

function completedFor(lesson) {
  const stored = state.completed[String(lesson.id)] ?? [];
  return new Set(stored.filter((index) => index >= 0 && index < lesson.sentences.length));
}

function updateCompletedDisplay() {
  const completed = completedFor(currentLesson);
  elements.completedCount.textContent = String(completed.size);
  elements.sentenceTotal.textContent = String(currentLesson.sentences.length);
  $$('.reading-sentence', elements.readingText).forEach((button) => {
    button.classList.toggle('completed', completed.has(Number(button.dataset.index)));
  });
}

function markSentenceCompleted(index) {
  const key = String(currentLesson.id);
  const completed = completedFor(currentLesson);
  completed.add(index);
  state.completed[key] = [...completed].sort((a, b) => a - b);
  saveState();
  updateCompletedDisplay();
  renderLessonList();
}

function filteredLessons() {
  const query = elements.search.value.trim().toLocaleLowerCase('ja');
  return readingLessons.filter((lesson) => {
    if (state.unit !== 'ALL' && Math.ceil(lesson.id / 5) !== Number(state.unit)) return false;
    if (!query) return true;
    const searchText = [
      lesson.title,
      lesson.titleZh,
      lesson.topic,
      lesson.goal,
      ...lesson.vocabulary.flatMap((item) => [item.word, item.reading, item.meaning]),
      ...lesson.grammar.flatMap((item) => [item.pattern, item.note])
    ].join(' ').toLocaleLowerCase('ja');
    return searchText.includes(query);
  });
}

function renderLessonList() {
  const lessons = filteredLessons();
  if (!lessons.length) {
    elements.lessonList.innerHTML = '<p class="lesson-list-empty">没有找到匹配的课文。</p>';
    return;
  }

  elements.lessonList.innerHTML = lessons.map((lesson) => {
    const completion = completedFor(lesson).size;
    const active = lesson.id === currentLesson.id;
    return `<button class="lesson-list-button ready ${active ? 'active' : ''}" type="button" data-lesson-id="${lesson.id}" ${active ? 'aria-current="page"' : ''}>
      <em>${lessonNumber(lesson.id)}</em>
      <b>${escapeHtml(lesson.title)}</b>
      <small>${escapeHtml(lesson.titleZh)} · ${escapeHtml(lesson.topic)}</small>
      <mark class="lesson-level-tag source">N5<sup>文</sup></mark>
      <i aria-hidden="true"></i>
      <span class="lesson-status">${completion}/${lesson.sentences.length} 段</span>
    </button>`;
  }).join('');
}

function renderReadingText() {
  const completed = completedFor(currentLesson);
  let previousTrack = null;
  elements.readingText.innerHTML = currentLesson.sentences.map((sentence, index) => {
    const active = index === currentSentenceIndex;
    const trackHeading = sentence.track !== previousTrack
      ? `<div class="track-divider"><span>MP3 ${lessonNumber(sentence.track)}</span><b>${escapeHtml(sentence.section)}</b><i>${currentLesson.sentences.filter((item) => item.track === sentence.track).length} 段</i></div>`
      : '';
    previousTrack = sentence.track;
    const translation = sentence.zh
      ? `<span class="reading-translation" lang="zh-CN">${escapeHtml(sentence.zh)}</span>`
      : '';
    return `${trackHeading}<button class="reading-sentence ${sentence.kind === 'cue' ? 'cue' : ''} ${active ? 'active' : ''} ${completed.has(index) ? 'completed' : ''}" type="button" data-index="${index}" aria-pressed="${active}" aria-label="播放 MP3 ${lessonNumber(sentence.track)} ${formatTimestamp(sentence.start)}：${escapeHtml(sentence.jp)}">
      <span class="speaker-label"><small>MP3</small>${lessonNumber(sentence.track)}<em>${formatTimestamp(sentence.start)}</em></span>
      <span class="reading-copy">
        <span class="reading-jp" lang="ja">${renderMarkup(sentence.markup)}</span>
        ${translation}
      </span>
      <span class="sentence-play-mark" aria-hidden="true">▶</span>
    </button>`;
  }).join('');
  const hasTranslations = currentLesson.sentences.some((sentence) => sentence.zh);
  elements.translationToggle.hidden = !hasTranslations;
  if (!hasTranslations) setTranslationVisibility(false);
  updateCompletedDisplay();
}

function renderNotes() {
  elements.vocabularyPanel.innerHTML = currentLesson.vocabulary.map((item) => `
    <div class="vocabulary-item"><b lang="ja">${escapeHtml(item.word)}</b><i lang="ja">${escapeHtml(item.reading)}</i><span>${escapeHtml(item.meaning)}</span></div>`).join('');
  elements.grammarPanel.innerHTML = currentLesson.grammar.map((item) => `
    <div class="grammar-item"><b lang="ja">${escapeHtml(item.pattern)}</b><p>${escapeHtml(item.note)}</p></div>`).join('');
}

function stopSequence() {
  sequenceMode = false;
  clearTimeout(sequenceTimer);
  playRequestId += 1;
}

function updatePlayButton() {
  const playing = !elements.audio.paused && !elements.audio.ended;
  elements.play.classList.toggle('is-playing', playing);
  elements.play.querySelector('span').textContent = playing ? 'Ⅱ' : '▶';
  elements.play.setAttribute('aria-label', playing ? '暂停当前句' : '播放当前句');
}

function waitForAudioMetadata() {
  if (elements.audio.readyState >= HTMLMediaElement.HAVE_METADATA) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      elements.audio.removeEventListener('loadedmetadata', handleLoaded);
      elements.audio.removeEventListener('error', handleError);
    };
    const handleLoaded = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error('Audio metadata failed to load.'));
    };
    elements.audio.addEventListener('loadedmetadata', handleLoaded);
    elements.audio.addEventListener('error', handleError);
  });
}

function finishCurrentClip() {
  if (clipCompletionHandled) return;
  clipCompletionHandled = true;
  elements.audio.pause();
  updatePlayButton();
  markSentenceCompleted(currentSentenceIndex);
  scheduleFollowingSentence();
}

function stopClipMonitor() {
  cancelAnimationFrame(clipAnimationFrame);
  clipAnimationFrame = 0;
}

function startClipMonitor() {
  stopClipMonitor();
  const checkBoundary = () => {
    if (elements.audio.paused || elements.audio.ended) {
      stopClipMonitor();
      return;
    }
    if (clipEnd > clipStart && elements.audio.currentTime >= clipEnd - 0.015) {
      finishCurrentClip();
      return;
    }
    clipAnimationFrame = requestAnimationFrame(checkBoundary);
  };
  clipAnimationFrame = requestAnimationFrame(checkBoundary);
}

function setSentence(index, { scroll = false, autoplay = false, keepSequence = false, restart = true } = {}) {
  const bounded = Math.max(0, Math.min(Number(index), currentLesson.sentences.length - 1));
  const wasPlaying = !elements.audio.paused;
  if (!keepSequence) stopSequence();
  currentSentenceIndex = bounded;
  const sentence = currentLesson.sentences[bounded];

  stopDiscIntro();
  elements.audio.pause();
  const nextSource = new URL(sentence.audio, document.baseURI).href;
  if (elements.audio.src !== nextSource) {
    elements.audio.src = sentence.audio;
    elements.audio.load();
  }
  clipStart = Number(sentence.start) || 0;
  clipEnd = Math.max(clipStart + 0.08, Number(sentence.end) || clipStart + 0.08);
  clipCompletionHandled = false;
  elements.audio.playbackRate = Number(elements.speedSelect.value);
  elements.audioProgress.value = '0';
  elements.audioProgress.style.setProperty('--progress', '0%');
  elements.playingIndex.textContent = lessonNumber(sentence.track);
  elements.nowPlayingText.textContent = sentence.jp;

  $$('.reading-sentence', elements.readingText).forEach((button) => {
    const active = Number(button.dataset.index) === bounded;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  if (scroll) {
    const button = $(`.reading-sentence[data-index="${bounded}"]`, elements.readingText);
    button?.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'center'
    });
  }

  if (autoplay || (wasPlaying && keepSequence)) void playCurrent({ restart, sequence: keepSequence });
  else updatePlayButton();
}

async function playCurrent({ restart = false, sequence = false } = {}) {
  if (sequence) sequenceMode = true;
  if (!elements.audio.src) setSentence(currentSentenceIndex, { keepSequence: sequence });
  const requestId = ++playRequestId;
  try {
    await waitForAudioMetadata();
    if (requestId !== playRequestId) return;
    const safeEnd = Number.isFinite(elements.audio.duration)
      ? Math.min(clipEnd, elements.audio.duration)
      : clipEnd;
    clipEnd = Math.max(clipStart + 0.08, safeEnd);
    if (restart || elements.audio.currentTime < clipStart || elements.audio.currentTime >= clipEnd - 0.025) {
      elements.audio.currentTime = clipStart;
    }
    clipCompletionHandled = false;
    elements.audio.playbackRate = Number(elements.speedSelect.value);
    await elements.audio.play();
  } catch {
    if (requestId !== playRequestId) return;
    stopSequence();
    showToast('浏览器阻止了自动播放，或当前音频尚未载入，请再次点击播放。');
  }
}

function moveSentence(delta) {
  const wasPlaying = !elements.audio.paused;
  const nextIndex = Math.max(0, Math.min(currentSentenceIndex + delta, currentLesson.sentences.length - 1));
  setSentence(nextIndex, { scroll: true });
  if (wasPlaying) playCurrent({ restart: true });
}

function scheduleFollowingSentence() {
  if (state.loop === 'sentence') {
    sequenceTimer = window.setTimeout(
      () => playCurrent({ restart: true, sequence: sequenceMode }),
      Number(elements.gapSelect.value)
    );
    return;
  }

  const shouldContinue = sequenceMode || state.loop === 'lesson';
  if (!shouldContinue) return;
  let nextIndex = currentSentenceIndex + 1;
  if (nextIndex >= currentLesson.sentences.length) {
    if (state.loop === 'lesson') nextIndex = 0;
    else {
      stopSequence();
      showToast('本课跟读完成。可以切换到盲听模式再挑战一次。');
      return;
    }
  }

  sequenceTimer = window.setTimeout(() => {
    setSentence(nextIndex, { scroll: true, keepSequence: true });
    playCurrent({ restart: true, sequence: true });
  }, Number(elements.gapSelect.value));
}

function setLoopMode(mode) {
  const labels = { off: '不循环', sentence: '单句循环', lesson: '整课循环' };
  state.loop = mode;
  elements.loopButton.dataset.mode = mode;
  elements.loopButton.querySelector('b').textContent = labels[mode];
  elements.loopButton.setAttribute('aria-label', `循环模式：${labels[mode]}`);
  saveState();
}

function setDisplayMode(mode) {
  state.display = mode;
  elements.stage.dataset.display = mode;
  $$('[data-mode]', elements.displayModes).forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  saveState();
}

function setFuriganaVisibility(visible) {
  state.furigana = Boolean(visible);
  elements.stage.classList.toggle('furigana-visible', state.furigana);
  elements.furiganaToggle.classList.toggle('active', state.furigana);
  elements.furiganaToggle.setAttribute('aria-pressed', String(state.furigana));
  elements.furiganaToggle.querySelector('b').textContent = state.furigana ? '隐藏假名' : '显示假名';
  saveState();
}

function setTranslationVisibility(visible) {
  state.translation = Boolean(visible);
  elements.stage.classList.toggle('translation-visible', state.translation);
  elements.translationToggle.classList.toggle('active', state.translation);
  elements.translationToggle.setAttribute('aria-pressed', String(state.translation));
  elements.translationToggle.querySelector('b').textContent = state.translation ? '隐藏译文' : '显示译文';
  saveState();
}

function closeSidebar() {
  document.body.classList.remove('sidebar-open');
  elements.sidebarOpen.setAttribute('aria-expanded', 'false');
  elements.sidebarScrim.hidden = true;
}

function openSidebar() {
  elements.sidebarScrim.hidden = false;
  document.body.classList.add('sidebar-open');
  elements.sidebarOpen.setAttribute('aria-expanded', 'true');
  window.setTimeout(() => elements.search.focus(), 230);
}

function selectLesson(id, { updateUrl = true, scrollTop = true } = {}) {
  const lesson = readingLessons.find((item) => item.id === Number(id));
  if (!lesson) return;
  stopSequence();
  elements.audio.pause();
  currentLesson = lesson;
  currentSentenceIndex = 0;
  state.lessonId = lesson.id;
  saveState();

  elements.level.textContent = lesson.level;
  elements.number.textContent = `LESSON ${lessonNumber(lesson.id)}`;
  elements.mobileLessonLabel.textContent = `LESSON ${lessonNumber(lesson.id)}`;
  elements.topic.textContent = lesson.topic;
  elements.title.textContent = lesson.title;
  elements.titleZh.textContent = lesson.titleZh;
  elements.goal.textContent = lesson.goal;
  document.title = `${lesson.title}｜N5 课文跟读｜言葉 Kotoba`;

  renderReadingText();
  renderNotes();
  renderLessonList();
  setSentence(0);

  if (updateUrl) {
    const url = new URL(location.href);
    url.searchParams.set('lesson', String(lesson.id));
    history.replaceState({ lessonId: lesson.id }, '', url);
  }
  if (scrollTop) elements.stageScroll.scrollTo({ top: 0, behavior: 'auto' });
  closeSidebar();
}

async function startWholeSession() {
  stopSequence();
  elements.audio.pause();
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    elements.countdown.hidden = false;
    for (const value of ['3', '2', '1']) {
      elements.countdownNumber.textContent = value;
      await new Promise((resolve) => setTimeout(resolve, 650));
    }
    elements.countdown.hidden = true;
  }
  setSentence(0, { scroll: true, keepSequence: true });
  playCurrent({ restart: true, sequence: true });
}

function stopRecordingStream() {
  recordingStream?.getTracks().forEach((track) => track.stop());
  recordingStream = null;
}

async function toggleRecording() {
  if (mediaRecorder?.state === 'recording') {
    mediaRecorder.stop();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    showToast('当前浏览器不支持网页录音。');
    return;
  }

  stopSequence();
  elements.audio.pause();
  try {
    recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const preferredTypes = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];
    const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type));
    mediaRecorder = new MediaRecorder(recordingStream, mimeType ? { mimeType } : undefined);
    recordingChunks = [];
    mediaRecorder.addEventListener('dataavailable', (event) => {
      if (event.data.size) recordingChunks.push(event.data);
    });
    mediaRecorder.addEventListener('stop', () => {
      const blob = new Blob(recordingChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      if (recordingUrl) URL.revokeObjectURL(recordingUrl);
      recordingUrl = URL.createObjectURL(blob);
      recordingPlayback.src = recordingUrl;
      elements.recordPlay.disabled = false;
      elements.record.classList.remove('is-recording');
      elements.record.querySelector('span').textContent = '重新录音';
      stopRecordingStream();
      showToast('录音完成，可点击“回放”与原声对比。');
    }, { once: true });
    mediaRecorder.start();
    elements.record.classList.add('is-recording');
    elements.record.querySelector('span').textContent = '停止录音';
    showToast('正在录音；跟读完成后再次点击即可停止。');
  } catch {
    stopRecordingStream();
    showToast('未获得麦克风权限，无法开始录音。');
  }
}

elements.lessonList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-lesson-id]');
  if (button) selectLesson(button.dataset.lessonId);
});

elements.discIntroLines.addEventListener('click', (event) => {
  const button = event.target.closest('[data-disc-line]');
  if (button) void playDiscIntroLine(Number(button.dataset.discLine));
});

discIntroPlayback.addEventListener('timeupdate', () => {
  if (!discIntroPlayback.paused && discIntroClipEnd && discIntroPlayback.currentTime >= discIntroClipEnd - 0.025) {
    stopDiscIntro();
  }
});
discIntroPlayback.addEventListener('ended', stopDiscIntro);

elements.unitFilters.addEventListener('click', (event) => {
  const button = event.target.closest('[data-unit]');
  if (!button) return;
  state.unit = button.dataset.unit;
  $$('[data-unit]', elements.unitFilters).forEach((item) => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  saveState();
  renderLessonList();
});

elements.search.addEventListener('input', renderLessonList);

elements.readingText.addEventListener('click', (event) => {
  const button = event.target.closest('.reading-sentence');
  if (!button) return;
  setSentence(Number(button.dataset.index));
  playCurrent({ restart: true });
});

elements.displayModes.addEventListener('click', (event) => {
  const button = event.target.closest('[data-mode]');
  if (button) setDisplayMode(button.dataset.mode);
});

elements.furiganaToggle.addEventListener('click', () => setFuriganaVisibility(!state.furigana));
elements.translationToggle.addEventListener('click', () => setTranslationVisibility(!state.translation));
elements.speedSelect.addEventListener('change', () => {
  state.speed = Number(elements.speedSelect.value);
  elements.audio.playbackRate = state.speed;
  saveState();
});
elements.gapSelect.addEventListener('change', () => {
  state.gap = Number(elements.gapSelect.value);
  saveState();
});
elements.loopButton.addEventListener('click', () => {
  const modes = ['off', 'sentence', 'lesson'];
  setLoopMode(modes[(modes.indexOf(state.loop) + 1) % modes.length]);
});

elements.play.addEventListener('click', () => {
  if (!elements.audio.paused) {
    stopSequence();
    elements.audio.pause();
  } else {
    playCurrent();
  }
});
elements.replay.addEventListener('click', () => playCurrent({ restart: true }));
elements.previous.addEventListener('click', () => moveSentence(-1));
elements.next.addEventListener('click', () => moveSentence(1));
elements.skipNext.addEventListener('click', () => moveSentence(1));
elements.startSession.addEventListener('click', startWholeSession);

elements.audio.addEventListener('play', () => {
  updatePlayButton();
  startClipMonitor();
});
elements.audio.addEventListener('pause', () => {
  updatePlayButton();
  stopClipMonitor();
});
elements.audio.addEventListener('timeupdate', () => {
  const clipDuration = Math.max(0.08, clipEnd - clipStart);
  const progress = Math.max(0, Math.min(1, (elements.audio.currentTime - clipStart) / clipDuration));
  elements.audioProgress.value = String(Math.round(progress * 1000));
  elements.audioProgress.style.setProperty('--progress', `${progress * 100}%`);
  if (!elements.audio.paused && clipEnd > clipStart && elements.audio.currentTime >= clipEnd - 0.025) {
    finishCurrentClip();
  }
});
elements.audio.addEventListener('ended', () => {
  finishCurrentClip();
});
elements.audio.addEventListener('error', () => {
  stopSequence();
  updatePlayButton();
  showToast('当前分句音频加载失败，请刷新页面后重试。');
});
elements.audioProgress.addEventListener('input', () => {
  if (clipEnd > clipStart) {
    clipCompletionHandled = false;
    elements.audio.currentTime = clipStart + Number(elements.audioProgress.value) / 1000 * (clipEnd - clipStart);
  }
});

elements.notesTabs.addEventListener('click', (event) => {
  const button = event.target.closest('[data-notes]');
  if (!button) return;
  const vocabularyVisible = button.dataset.notes === 'vocabulary';
  elements.vocabularyPanel.hidden = !vocabularyVisible;
  elements.grammarPanel.hidden = vocabularyVisible;
  $$('[data-notes]', elements.notesTabs).forEach((item) => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', String(active));
  });
});

elements.sidebarOpen.addEventListener('click', openSidebar);
elements.sidebarClose.addEventListener('click', closeSidebar);
elements.sidebarScrim.addEventListener('click', closeSidebar);
elements.record.addEventListener('click', toggleRecording);
elements.recordPlay.addEventListener('click', async () => {
  if (!recordingUrl) return;
  if (!recordingPlayback.paused) {
    recordingPlayback.pause();
    elements.recordPlay.innerHTML = '<span aria-hidden="true">▷</span> 回放';
  } else {
    await recordingPlayback.play();
    elements.recordPlay.innerHTML = '<span aria-hidden="true">Ⅱ</span> 暂停';
  }
});
recordingPlayback.addEventListener('ended', () => {
  elements.recordPlay.innerHTML = '<span aria-hidden="true">▷</span> 回放';
});

document.addEventListener('keydown', (event) => {
  const tagName = event.target.tagName;
  const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName) || event.target.isContentEditable;
  if (event.key === '/' && !isTyping) {
    event.preventDefault();
    if (matchMedia('(max-width: 820px)').matches) openSidebar();
    elements.search.focus();
    return;
  }
  if (event.key === 'Escape' && document.body.classList.contains('sidebar-open')) closeSidebar();
  if (isTyping || tagName === 'BUTTON') return;
  if (event.code === 'Space') {
    event.preventDefault();
    elements.play.click();
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    moveSentence(-1);
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    moveSentence(1);
  } else if (event.key.toLocaleLowerCase() === 'r') {
    event.preventDefault();
    playCurrent({ restart: true });
  }
});

window.addEventListener('beforeunload', () => {
  stopClipMonitor();
  stopRecordingStream();
  stopDiscIntro();
  if (recordingUrl) URL.revokeObjectURL(recordingUrl);
});

$('#catalog-total').textContent = String(readingCatalogSummary.total);
$('#catalog-tracks').textContent = String(readingCatalogSummary.tracks);
$('#catalog-sentences').textContent = String(readingCatalogSummary.sentences);
renderDiscIntro();
elements.speedSelect.value = String(state.speed);
elements.gapSelect.value = String(state.gap);
setLoopMode(['off', 'sentence', 'lesson'].includes(state.loop) ? state.loop : 'off');
setDisplayMode(['study', 'shadow', 'blind'].includes(state.display) ? state.display : 'study');
setFuriganaVisibility(Boolean(state.furigana));
setTranslationVisibility(Boolean(state.translation));

if (!['ALL', '1', '2', '3', '4', '5'].includes(String(state.unit))) state.unit = 'ALL';
$$('[data-unit]', elements.unitFilters).forEach((button) => {
  const active = button.dataset.unit === String(state.unit);
  button.classList.toggle('active', active);
  button.setAttribute('aria-pressed', String(active));
});

const requestedLesson = Number(new URL(location.href).searchParams.get('lesson'));
const initialId = readingLessons.some((lesson) => lesson.id === requestedLesson)
  ? requestedLesson
  : (readingLessons.some((lesson) => lesson.id === Number(state.lessonId)) ? Number(state.lessonId) : 1);
selectLesson(initialId, { updateUrl: false, scrollTop: false });
