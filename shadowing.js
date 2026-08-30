import { shadowingLessons, shadowingCatalogSummary } from './shadowing-data.mjs?v=shadowing-notes-v1';

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const STORAGE_KEY = 'kotoba-shadowing-state-v2';

const elements = {
  stage: $('.practice-stage'),
  stageScroll: $('#stage-scroll'),
  lessonList: $('#lesson-list'),
  search: $('#lesson-search'),
  levelFilters: $('#level-filters'),
  sidebar: $('#lesson-sidebar'),
  sidebarOpen: $('#sidebar-open'),
  sidebarClose: $('#sidebar-close'),
  sidebarScrim: $('#sidebar-scrim'),
  mobileLessonLabel: $('#mobile-lesson-label'),
  level: $('#lesson-level'),
  levelOrigin: $('#lesson-level-origin'),
  number: $('#lesson-number'),
  topic: $('#lesson-topic'),
  title: $('#lesson-title'),
  titleZh: $('#lesson-title-zh'),
  transcript: $('#transcript'),
  transcriptInstruction: $('#transcript-instruction'),
  completedCount: $('#completed-count'),
  sentenceTotal: $('#sentence-total'),
  vocabularyPanel: $('#vocabulary-panel'),
  grammarPanel: $('#grammar-panel'),
  notesTabs: $('#notes-tabs'),
  startSession: $('#start-session'),
  displayModes: $('#display-modes'),
  furiganaToggle: $('#furigana-toggle'),
  speedSelect: $('#speed-select'),
  gapSelect: $('#gap-select'),
  loopButton: $('#loop-button'),
  audio: $('#shadowing-audio'),
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
  toast: $('#toast')
};

const defaultState = {
  lessonId: 1,
  level: 'ALL',
  speed: 1,
  gap: 800,
  display: 'study',
  furigana: false,
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
let currentLesson = shadowingLessons[0];
let currentSentenceIndex = 0;
let sequenceMode = false;
let sequenceTimer = 0;
let toastTimer = 0;
let mediaRecorder = null;
let recordingStream = null;
let recordingChunks = [];
let recordingUrl = '';
const recordingPlayback = new Audio();

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* Private mode can deny storage. */ }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function lessonNumber(id) {
  return String(id).padStart(2, '0');
}

function audioSourceFor(sentence) {
  return sentence.audio;
}

function renderFurigana(segments) {
  return segments.map((segment) => {
    if (!Array.isArray(segment)) return escapeHtml(segment);
    return `<ruby>${escapeHtml(segment[0])}<rt>${escapeHtml(segment[1])}</rt></ruby>`;
  }).join('');
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => elements.toast.classList.remove('show'), 2600);
}

function completedFor(lesson) {
  const values = state.completed[String(lesson.id)] ?? [];
  return new Set(values.filter((index) => index >= 0 && index < lesson.sentences.length));
}

function updateCompletedDisplay() {
  const completed = completedFor(currentLesson);
  elements.completedCount.textContent = String(completed.size);
  elements.sentenceTotal.textContent = String(currentLesson.sentences.length || 0);
  $$('.article-sentence', elements.transcript).forEach((card) => {
    card.classList.toggle('completed', completed.has(Number(card.dataset.index)));
  });
}

function markSentenceCompleted(index) {
  if (!currentLesson.ready) return;
  const key = String(currentLesson.id);
  const completed = new Set(state.completed[key] ?? []);
  completed.add(index);
  state.completed[key] = [...completed].sort((a, b) => a - b);
  saveState();
  updateCompletedDisplay();
  renderLessonList();
}

function filteredLessons() {
  const query = elements.search.value.trim().toLocaleLowerCase('ja');
  return shadowingLessons.filter((lesson) => {
    if (state.level !== 'ALL' && !lesson.levelFilters.includes(state.level)) return false;
    if (!query) return true;
    return `${lesson.title} ${lesson.titleZh} ${lesson.topic} ${lesson.levelLabel} ${lesson.levelOriginLabel}`.toLocaleLowerCase('ja').includes(query);
  });
}

function lessonGroupLabel(level) {
  const exactCount = shadowingCatalogSummary.levels[level] ?? 0;
  const transitionCount = state.level === 'ALL'
    ? shadowingLessons.filter((lesson) => lesson.level === level && lesson.levelFilters.length > 1).length
    : (shadowingCatalogSummary.filters[level] ?? exactCount) - exactCount;
  const transitionText = transitionCount ? ` + 跨级 ${transitionCount} 篇` : '';
  return `${level} · ${exactCount} 篇${transitionText}`;
}

function renderLessonList() {
  const lessons = filteredLessons();
  if (!lessons.length) {
    elements.lessonList.innerHTML = '<p class="empty-lessons">没有找到匹配的短文。<br>可尝试清空搜索或切换等级。</p>';
    return;
  }

  let previousLevel = '';
  elements.lessonList.innerHTML = lessons.map((lesson) => {
    const groupLevel = state.level === 'ALL' ? lesson.level : state.level;
    const group = groupLevel !== previousLevel
      ? `<p class="lesson-group-label">${lessonGroupLabel(groupLevel)}</p>`
      : '';
    previousLevel = groupLevel;
    const completion = completedFor(lesson).size;
    const status = `${completion}/${lesson.sentences.length} 句`;
    return `${group}<button class="lesson-list-button ready ${lesson.id === currentLesson.id ? 'active' : ''}" type="button" data-lesson-id="${lesson.id}" ${lesson.id === currentLesson.id ? 'aria-current="page"' : ''}>
      <em>${lessonNumber(lesson.id)}</em><b>${escapeHtml(lesson.title)}</b><small>${escapeHtml(lesson.titleZh)} · ${escapeHtml(lesson.topic)}</small><mark class="lesson-level-tag ${lesson.levelOrigin}" title="${escapeHtml(lesson.levelNote)}">${escapeHtml(lesson.levelLabel)}<sup>${lesson.levelOrigin === 'source' ? '标' : '评'}</sup></mark><i aria-hidden="true"></i><span class="lesson-status">${status}</span>
    </button>`;
  }).join('');
}

function renderTranscript() {
  const completed = completedFor(currentLesson);
  const paragraphs = new Map();
  currentLesson.sentences.forEach((sentence, index) => {
    if (!paragraphs.has(sentence.paragraph)) paragraphs.set(sentence.paragraph, []);
    paragraphs.get(sentence.paragraph).push({ sentence, index });
  });
  elements.transcript.innerHTML = [...paragraphs.values()].map((items) => {
    const sentences = items.map(({ sentence, index }) => {
      const active = index === currentSentenceIndex;
      return `<span class="article-sentence ${active ? 'active' : ''} ${completed.has(index) ? 'completed' : ''}" role="button" tabindex="0" data-index="${index}" aria-pressed="${active}" aria-label="播放第 ${index + 1} 句：${escapeHtml(sentence.jp)}"><sup>${lessonNumber(index + 1)}</sup><span class="article-sentence-text">${renderFurigana(sentence.furigana)}</span><i aria-hidden="true">▶</i></span>`;
    }).join('');
    return `<p class="article-paragraph" lang="ja">${sentences}</p>`;
  }).join('');
  updateCompletedDisplay();
}

function renderNotes() {
  if (currentLesson.vocabulary.length) {
    elements.vocabularyPanel.innerHTML = currentLesson.vocabulary.map((item) => `
      <div class="vocabulary-item"><b lang="ja">${escapeHtml(item.word)}</b><i lang="ja">${escapeHtml(item.reading)}</i><span>${escapeHtml(item.meaning)}</span></div>`).join('');
  } else {
    elements.vocabularyPanel.innerHTML = '<p class="notes-empty">本篇重点词汇正在整理。日文原文与逐句音频已经可以完整练习。</p>';
  }

  if (currentLesson.grammar.length) {
    elements.grammarPanel.innerHTML = currentLesson.grammar.map((item) => `
      <div class="grammar-item"><b lang="ja">${escapeHtml(item.pattern)}</b><p>${escapeHtml(item.note)}</p></div>`).join('');
  } else {
    elements.grammarPanel.innerHTML = '<p class="notes-empty">本篇语法总结正在整理，不影响原文点击播放与整篇跟读。</p>';
  }
}

function stopSequence() {
  sequenceMode = false;
  clearTimeout(sequenceTimer);
}

function updatePlayButton() {
  const playing = !elements.audio.paused && !elements.audio.ended;
  elements.play.classList.toggle('is-playing', playing);
  elements.play.setAttribute('aria-label', playing ? '暂停当前句' : '播放当前句');
}

function updateTransportAvailability() {
  const disabled = !currentLesson.ready;
  [elements.previous, elements.replay, elements.play, elements.next, elements.skipNext, elements.record, elements.audioProgress].forEach((control) => {
    control.disabled = disabled;
  });
}

function setSentence(index, { scroll = false, autoplay = false, keepSequence = false, restart = true } = {}) {
  if (!currentLesson.ready) return;
  const bounded = Math.max(0, Math.min(index, currentLesson.sentences.length - 1));
  const wasPlaying = !elements.audio.paused;
  if (!keepSequence) stopSequence();
  currentSentenceIndex = bounded;
  const sentence = currentLesson.sentences[bounded];
  elements.audio.pause();
  elements.audio.src = audioSourceFor(sentence);
  elements.audio.playbackRate = Number(elements.speedSelect.value);
  elements.audioProgress.value = '0';
  elements.audioProgress.style.setProperty('--progress', '0%');
  elements.playingIndex.textContent = lessonNumber(bounded + 1);
  elements.nowPlayingText.textContent = sentence.jp;
  $$('.article-sentence', elements.transcript).forEach((card) => {
    const active = Number(card.dataset.index) === bounded;
    card.classList.toggle('active', active);
    card.setAttribute('aria-pressed', String(active));
  });

  if (scroll) {
    const card = $(`.article-sentence[data-index="${bounded}"]`, elements.transcript);
    card?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  }

  if (autoplay || (wasPlaying && keepSequence)) playCurrent({ restart, sequence: keepSequence });
  else updatePlayButton();
}

async function playCurrent({ restart = false, sequence = false } = {}) {
  if (!currentLesson.ready) return;
  if (sequence) sequenceMode = true;
  if (!elements.audio.src) setSentence(currentSentenceIndex, { keepSequence: sequence });
  if (restart) elements.audio.currentTime = 0;
  elements.audio.playbackRate = Number(elements.speedSelect.value);
  try {
    await elements.audio.play();
  } catch {
    stopSequence();
    showToast('浏览器阻止了自动播放，请再次点击播放按钮。');
  }
}

function moveSentence(delta) {
  if (!currentLesson.ready) return;
  const wasPlaying = !elements.audio.paused;
  const nextIndex = Math.max(0, Math.min(currentSentenceIndex + delta, currentLesson.sentences.length - 1));
  setSentence(nextIndex, { scroll: true, keepSequence: false });
  if (wasPlaying) playCurrent({ restart: true });
}

function scheduleFollowingSentence() {
  const loopMode = state.loop;
  let nextIndex = currentSentenceIndex + 1;

  if (loopMode === 'sentence') {
    sequenceTimer = window.setTimeout(() => playCurrent({ restart: true, sequence: sequenceMode }), Number(elements.gapSelect.value));
    return;
  }

  const shouldContinue = sequenceMode || loopMode === 'lesson';
  if (!shouldContinue) return;
  if (nextIndex >= currentLesson.sentences.length) {
    if (loopMode === 'lesson') nextIndex = 0;
    else {
      stopSequence();
      showToast('本篇跟读完成。可以切换到无文本模式再挑战一次。');
      return;
    }
  }

  sequenceTimer = window.setTimeout(() => {
    setSentence(nextIndex, { scroll: true, keepSequence: true });
    playCurrent({ restart: true, sequence: true });
  }, Number(elements.gapSelect.value));
}

function setLoopMode(mode) {
  const labels = { off: '不循环', sentence: '单句循环', lesson: '整篇循环' };
  state.loop = mode;
  elements.loopButton.dataset.mode = mode;
  elements.loopButton.querySelector('b').textContent = labels[mode];
  elements.loopButton.setAttribute('aria-label', `循环模式：${labels[mode]}`);
  saveState();
}

function setDisplayMode(mode) {
  state.display = mode;
  elements.stage.dataset.display = mode;
  $$('button[data-mode]', elements.displayModes).forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  saveState();
}

function setFuriganaVisibility(visible) {
  state.furigana = Boolean(visible);
  elements.stage.classList.toggle('furigana-visible', state.furigana);
  elements.furiganaToggle.setAttribute('aria-pressed', String(state.furigana));
  elements.furiganaToggle.querySelector('b').textContent = state.furigana ? '隐藏假名' : '显示假名';
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
  const lesson = shadowingLessons.find((item) => item.id === Number(id));
  if (!lesson) return;
  stopSequence();
  elements.audio.pause();
  currentLesson = lesson;
  currentSentenceIndex = 0;
  state.lessonId = lesson.id;
  saveState();

  elements.level.textContent = lesson.levelLabel;
  elements.level.title = lesson.levelNote;
  elements.level.classList.toggle('transition', lesson.levelFilters.length > 1);
  elements.levelOrigin.textContent = lesson.levelOriginLabel;
  elements.levelOrigin.title = lesson.levelNote;
  elements.levelOrigin.classList.toggle('source', lesson.levelOrigin === 'source');
  elements.levelOrigin.classList.toggle('assessed', lesson.levelOrigin === 'assessed');
  elements.number.textContent = `LESSON ${lessonNumber(lesson.id)}`;
  elements.mobileLessonLabel.textContent = `LESSON ${lessonNumber(lesson.id)}`;
  elements.topic.textContent = lesson.topic;
  elements.title.textContent = lesson.title;
  elements.titleZh.textContent = lesson.titleZh;
  document.title = `${lesson.title}｜影子跟读｜言葉 Kotoba`;

  renderTranscript();
  renderNotes();
  renderLessonList();
  updateTransportAvailability();
  setSentence(0, { keepSequence: false });

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
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion) {
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

elements.levelFilters.addEventListener('click', (event) => {
  const button = event.target.closest('[data-level]');
  if (!button) return;
  state.level = button.dataset.level;
  $$('[data-level]', elements.levelFilters).forEach((item) => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  saveState();
  renderLessonList();
});

elements.search.addEventListener('input', renderLessonList);

elements.transcript.addEventListener('click', (event) => {
  const card = event.target.closest('.article-sentence');
  if (!card) return;
  setSentence(Number(card.dataset.index), { scroll: false });
  playCurrent({ restart: true });
});
elements.transcript.addEventListener('keydown', (event) => {
  if (!['Enter', ' '].includes(event.key)) return;
  const sentence = event.target.closest('.article-sentence');
  if (!sentence) return;
  event.preventDefault();
  event.stopPropagation();
  sentence.click();
});

elements.displayModes.addEventListener('click', (event) => {
  const button = event.target.closest('[data-mode]');
  if (button) setDisplayMode(button.dataset.mode);
});
elements.furiganaToggle.addEventListener('click', () => setFuriganaVisibility(!state.furigana));
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
  } else playCurrent();
});
elements.replay.addEventListener('click', () => playCurrent({ restart: true }));
elements.previous.addEventListener('click', () => moveSentence(-1));
elements.next.addEventListener('click', () => moveSentence(1));
elements.skipNext.addEventListener('click', () => moveSentence(1));
elements.startSession.addEventListener('click', startWholeSession);

elements.audio.addEventListener('play', updatePlayButton);
elements.audio.addEventListener('pause', updatePlayButton);
elements.audio.addEventListener('timeupdate', () => {
  const progress = elements.audio.duration ? elements.audio.currentTime / elements.audio.duration : 0;
  const value = Math.round(progress * 1000);
  elements.audioProgress.value = String(value);
  elements.audioProgress.style.setProperty('--progress', `${progress * 100}%`);
});
elements.audio.addEventListener('ended', () => {
  updatePlayButton();
  markSentenceCompleted(currentSentenceIndex);
  scheduleFollowingSentence();
});
elements.audio.addEventListener('error', () => {
  stopSequence();
  updatePlayButton();
  showToast('当前分句音频加载失败，请刷新页面后重试。');
});
elements.audioProgress.addEventListener('input', () => {
  if (elements.audio.duration) elements.audio.currentTime = Number(elements.audioProgress.value) / 1000 * elements.audio.duration;
});

elements.notesTabs.addEventListener('click', (event) => {
  const button = event.target.closest('[data-notes]');
  if (!button) return;
  const showVocabulary = button.dataset.notes === 'vocabulary';
  elements.vocabularyPanel.hidden = !showVocabulary;
  elements.grammarPanel.hidden = showVocabulary;
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
  const tag = event.target.tagName;
  const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || event.target.isContentEditable;
  if (event.key === '/' && !isTyping) {
    event.preventDefault();
    if (matchMedia('(max-width: 820px)').matches) openSidebar();
    elements.search.focus();
    return;
  }
  if (event.key === 'Escape' && document.body.classList.contains('sidebar-open')) closeSidebar();
  if (isTyping || tag === 'BUTTON' || event.target.closest?.('.article-sentence')) return;
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
  stopRecordingStream();
  if (recordingUrl) URL.revokeObjectURL(recordingUrl);
});

$('#catalog-total').textContent = String(shadowingCatalogSummary.total);
$('#catalog-ready').textContent = String(shadowingCatalogSummary.ready);
$('#catalog-source-marked').textContent = String(shadowingCatalogSummary.sourceMarked);
$('#level-count-n3').textContent = String(shadowingCatalogSummary.levels.N3);
$('#level-count-n4').textContent = String(shadowingCatalogSummary.levels.N4);
$('#level-count-n5').textContent = String(shadowingCatalogSummary.levels.N5);
$('#level-count-transition').textContent = String(shadowingCatalogSummary.transition);
$('#filter-count-all').textContent = String(shadowingCatalogSummary.total);
$('#filter-count-n3').textContent = String(shadowingCatalogSummary.filters.N3);
$('#filter-count-n4').textContent = String(shadowingCatalogSummary.filters.N4);
$('#filter-count-n5').textContent = String(shadowingCatalogSummary.filters.N5);
elements.speedSelect.value = String(state.speed);
elements.gapSelect.value = String(state.gap);
setLoopMode(['off', 'sentence', 'lesson'].includes(state.loop) ? state.loop : 'off');
setDisplayMode(['study', 'shadow', 'blind'].includes(state.display) ? state.display : 'study');
setFuriganaVisibility(Boolean(state.furigana));
$$('[data-level]', elements.levelFilters).forEach((button) => {
  const active = button.dataset.level === state.level;
  button.classList.toggle('active', active);
  button.setAttribute('aria-pressed', String(active));
});

const requestedLesson = Number(new URL(location.href).searchParams.get('lesson'));
const initialId = shadowingLessons.some((lesson) => lesson.id === requestedLesson)
  ? requestedLesson
  : (shadowingLessons.some((lesson) => lesson.id === Number(state.lessonId)) ? Number(state.lessonId) : 1);
selectLesson(initialId, { updateUrl: false, scrollTop: false });
