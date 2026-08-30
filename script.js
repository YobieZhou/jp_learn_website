const kana = (hira, kata, romaji, aliases = []) => ({ hira, kata, romaji, aliases });

const kanaRows = {
  basic: [
    { label: 'あ行', items: [kana('あ', 'ア', 'a'), kana('い', 'イ', 'i'), kana('う', 'ウ', 'u'), kana('え', 'エ', 'e'), kana('お', 'オ', 'o')] },
    { label: 'か行', items: [kana('か', 'カ', 'ka'), kana('き', 'キ', 'ki'), kana('く', 'ク', 'ku'), kana('け', 'ケ', 'ke'), kana('こ', 'コ', 'ko')] },
    { label: 'さ行', items: [kana('さ', 'サ', 'sa'), kana('し', 'シ', 'shi', ['si']), kana('す', 'ス', 'su'), kana('せ', 'セ', 'se'), kana('そ', 'ソ', 'so')] },
    { label: 'た行', items: [kana('た', 'タ', 'ta'), kana('ち', 'チ', 'chi', ['ti']), kana('つ', 'ツ', 'tsu', ['tu']), kana('て', 'テ', 'te'), kana('と', 'ト', 'to')] },
    { label: 'な行', items: [kana('な', 'ナ', 'na'), kana('に', 'ニ', 'ni'), kana('ぬ', 'ヌ', 'nu'), kana('ね', 'ネ', 'ne'), kana('の', 'ノ', 'no')] },
    { label: 'は行', items: [kana('は', 'ハ', 'ha'), kana('ひ', 'ヒ', 'hi'), kana('ふ', 'フ', 'fu', ['hu']), kana('へ', 'ヘ', 'he'), kana('ほ', 'ホ', 'ho')] },
    { label: 'ま行', items: [kana('ま', 'マ', 'ma'), kana('み', 'ミ', 'mi'), kana('む', 'ム', 'mu'), kana('め', 'メ', 'me'), kana('も', 'モ', 'mo')] },
    { label: 'や行', items: [kana('や', 'ヤ', 'ya'), null, kana('ゆ', 'ユ', 'yu'), null, kana('よ', 'ヨ', 'yo')] },
    { label: 'ら行', items: [kana('ら', 'ラ', 'ra'), kana('り', 'リ', 'ri'), kana('る', 'ル', 'ru'), kana('れ', 'レ', 're'), kana('ろ', 'ロ', 'ro')] },
    { label: 'わ行', items: [kana('わ', 'ワ', 'wa'), null, null, null, kana('を', 'ヲ', 'wo', ['o'])] },
    { label: 'ん', items: [kana('ん', 'ン', 'n', ["n'"]), null, null, null, null] }
  ],
  voiced: [
    { label: 'が行', items: [kana('が', 'ガ', 'ga'), kana('ぎ', 'ギ', 'gi'), kana('ぐ', 'グ', 'gu'), kana('げ', 'ゲ', 'ge'), kana('ご', 'ゴ', 'go')] },
    { label: 'ざ行', items: [kana('ざ', 'ザ', 'za'), kana('じ', 'ジ', 'ji', ['zi']), kana('ず', 'ズ', 'zu'), kana('ぜ', 'ゼ', 'ze'), kana('ぞ', 'ゾ', 'zo')] },
    { label: 'だ行', items: [kana('だ', 'ダ', 'da'), kana('ぢ', 'ヂ', 'ji', ['di']), kana('づ', 'ヅ', 'zu', ['du']), kana('で', 'デ', 'de'), kana('ど', 'ド', 'do')] },
    { label: 'ば行', items: [kana('ば', 'バ', 'ba'), kana('び', 'ビ', 'bi'), kana('ぶ', 'ブ', 'bu'), kana('べ', 'ベ', 'be'), kana('ぼ', 'ボ', 'bo')] },
    { label: 'ぱ行', items: [kana('ぱ', 'パ', 'pa'), kana('ぴ', 'ピ', 'pi'), kana('ぷ', 'プ', 'pu'), kana('ぺ', 'ペ', 'pe'), kana('ぽ', 'ポ', 'po')] }
  ],
  yoon: [
    { label: 'き', items: [kana('きゃ', 'キャ', 'kya'), kana('きゅ', 'キュ', 'kyu'), kana('きょ', 'キョ', 'kyo')] },
    { label: 'し', items: [kana('しゃ', 'シャ', 'sha', ['sya']), kana('しゅ', 'シュ', 'shu', ['syu']), kana('しょ', 'ショ', 'sho', ['syo'])] },
    { label: 'ち', items: [kana('ちゃ', 'チャ', 'cha', ['tya']), kana('ちゅ', 'チュ', 'chu', ['tyu']), kana('ちょ', 'チョ', 'cho', ['tyo'])] },
    { label: 'に', items: [kana('にゃ', 'ニャ', 'nya'), kana('にゅ', 'ニュ', 'nyu'), kana('にょ', 'ニョ', 'nyo')] },
    { label: 'ひ', items: [kana('ひゃ', 'ヒャ', 'hya'), kana('ひゅ', 'ヒュ', 'hyu'), kana('ひょ', 'ヒョ', 'hyo')] },
    { label: 'み', items: [kana('みゃ', 'ミャ', 'mya'), kana('みゅ', 'ミュ', 'myu'), kana('みょ', 'ミョ', 'myo')] },
    { label: 'り', items: [kana('りゃ', 'リャ', 'rya'), kana('りゅ', 'リュ', 'ryu'), kana('りょ', 'リョ', 'ryo')] },
    { label: 'ぎ', items: [kana('ぎゃ', 'ギャ', 'gya'), kana('ぎゅ', 'ギュ', 'gyu'), kana('ぎょ', 'ギョ', 'gyo')] },
    { label: 'じ', items: [kana('じゃ', 'ジャ', 'ja', ['jya', 'zya']), kana('じゅ', 'ジュ', 'ju', ['jyu', 'zyu']), kana('じょ', 'ジョ', 'jo', ['jyo', 'zyo'])] },
    { label: 'び', items: [kana('びゃ', 'ビャ', 'bya'), kana('びゅ', 'ビュ', 'byu'), kana('びょ', 'ビョ', 'byo')] },
    { label: 'ぴ', items: [kana('ぴゃ', 'ピャ', 'pya'), kana('ぴゅ', 'ピュ', 'pyu'), kana('ぴょ', 'ピョ', 'pyo')] }
  ]
};

const categoryMeta = {
  basic: { title: '清音表', short: '清音', kicker: 'SEION · 基础' },
  voiced: { title: '浊音 · 半浊音', short: '浊音', kicker: 'DAKUON · 进阶' },
  yoon: { title: '拗音表', short: '拗音', kicker: 'YŌON · 组合音' }
};

const allKana = [];
Object.entries(kanaRows).forEach(([category, rows]) => {
  rows.forEach((row, rowIndex) => row.items.forEach((item, slotIndex) => {
    if (!item) return;
    item.category = category;
    item.rowLabel = row.label;
    item.id = `${category}-${rowIndex}-${slotIndex}`;
    item.audio = `assets/audio/kana/${[...item.kata].map(character => character.codePointAt(0).toString(16)).join('-')}.wav?voice=nemo-f1-clear-v3`;
    allKana.push(item);
  }));
});

const safeStorage = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Private browsing can disable storage. */ }
  }
};

let studyCategory = 'basic';
let studyScript = 'hira';
let selectedKana = allKana[0];
const visitedKana = new Set(safeStorage.get('kotoba-visited', []));

const kanaGrid = document.querySelector('#kana-grid');
const vowelHead = document.querySelector('#vowel-head');
const strokeOrderStage = document.querySelector('#stroke-order-stage');
const strokeOrderMeta = document.querySelector('#stroke-order-meta');
const replayStrokes = document.querySelector('#replay-strokes');
const strokeSvgCache = new Map();
let strokeRenderToken = 0;

function renderStudyGrid() {
  const isYoon = studyCategory === 'yoon';
  const showingBoth = studyScript === 'both';
  kanaGrid.className = `kana-grid${isYoon ? ' yoon-grid' : ''}`;
  vowelHead.className = `vowel-head${isYoon ? ' three-columns' : ''}`;
  vowelHead.innerHTML = `<span></span>${(isYoon ? ['ya', 'yu', 'yo'] : ['a', 'i', 'u', 'e', 'o']).map(v => `<b>${v}</b>`).join('')}`;
  kanaGrid.replaceChildren();

  kanaRows[studyCategory].forEach((row) => {
    const rowLabel = document.createElement('span');
    rowLabel.className = 'row-label';
    rowLabel.textContent = row.label;
    kanaGrid.append(rowLabel);

    row.items.forEach((item) => {
      if (!item) {
        const empty = document.createElement('span');
        empty.className = 'kana-empty';
        kanaGrid.append(empty);
        return;
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = ['kana-cell', showingBoth ? 'paired' : '', item.id === selectedKana.id ? 'selected' : '', visitedKana.has(item.id) ? 'visited' : ''].filter(Boolean).join(' ');
      button.setAttribute('aria-label', showingBoth
        ? `平假名 ${item.hira}，片假名 ${item.kata}，罗马音 ${item.romaji}`
        : `${item[studyScript]}，罗马音 ${item.romaji}`);

      const symbol = document.createElement('span');
      symbol.className = showingBoth ? 'kana-pair' : 'kana-symbol';
      if (showingBoth) {
        const hira = document.createElement('b');
        const kata = document.createElement('b');
        hira.textContent = item.hira;
        kata.textContent = item.kata;
        symbol.append(hira, kata);
      } else {
        symbol.textContent = item[studyScript];
      }
      const romaji = document.createElement('small');
      romaji.textContent = item.romaji;
      button.append(symbol, romaji);
      button.addEventListener('click', () => selectKana(item, true));
      kanaGrid.append(button);
    });
  });
}

function strokeAssetUrl(character) {
  const codePoint = character.codePointAt(0).toString(16).padStart(5, '0');
  return `assets/strokes/kana/${codePoint}.svg?source=kanjivg-61e39cfc`;
}

function fetchStrokeSvgSource(character) {
  if (!strokeSvgCache.has(character)) {
    const request = fetch(strokeAssetUrl(character)).then((response) => {
      if (!response.ok) throw new Error(`Stroke asset for ${character} returned ${response.status}.`);
      return response.text();
    });
    request.catch(() => {
      if (strokeSvgCache.get(character) === request) strokeSvgCache.delete(character);
    });
    strokeSvgCache.set(character, request);
  }
  return strokeSvgCache.get(character);
}

async function createStrokeGlyph(character) {
  const source = await fetchStrokeSvgSource(character);
  const documentFragment = new DOMParser().parseFromString(source, 'image/svg+xml');
  if (documentFragment.querySelector('parsererror')) throw new Error(`Stroke asset for ${character} is invalid SVG.`);

  const svg = document.importNode(documentFragment.documentElement, true);
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.classList.add('stroke-order-svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${character} 的笔画顺序`);

  const strokeLayer = [...svg.querySelectorAll('g')].find(group => group.id.startsWith('kvg:StrokePaths_'));
  const paths = strokeLayer ? [...strokeLayer.querySelectorAll('path')] : [];
  if (paths.length === 0) throw new Error(`Stroke asset for ${character} contains no paths.`);

  paths.forEach((path) => {
    const guide = path.cloneNode(false);
    guide.removeAttribute('id');
    guide.classList.add('stroke-guide-path');
    path.classList.add('stroke-path');
    path.parentNode.insertBefore(guide, path);
  });

  const wrapper = document.createElement('div');
  wrapper.className = 'stroke-glyph';
  wrapper.append(svg);
  return { element: wrapper, strokeCount: paths.length };
}

async function createStrokeScriptGroup(item, script) {
  const glyphs = await Promise.all([...item[script]].map(createStrokeGlyph));
  const group = document.createElement('div');
  group.className = 'stroke-script-group';
  group.dataset.script = script;

  const label = document.createElement('span');
  label.className = 'stroke-script-label';
  label.textContent = `${script === 'hira' ? '平假名' : '片假名'} · ${item[script]}`;

  const glyphRow = document.createElement('div');
  glyphRow.className = 'stroke-glyph-row';
  glyphRow.append(...glyphs.map(glyph => glyph.element));
  group.append(label, glyphRow);

  return {
    element: group,
    script,
    strokeCount: glyphs.reduce((sum, glyph) => sum + glyph.strokeCount, 0)
  };
}

function animateStrokePaths() {
  const paths = [...strokeOrderStage.querySelectorAll('.stroke-path')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  paths.forEach((path, index) => {
    let length = 500;
    try { length = Math.max(1, path.getTotalLength()); } catch { /* Keep a safe SVG fallback length. */ }
    path.style.strokeDasharray = String(length);
    path.style.strokeDashoffset = reducedMotion ? '0' : String(length);
    if (!reducedMotion) path.style.animation = `draw-stroke .52s ease-out ${index * .58}s forwards`;
  });
}

async function renderStrokeOrder(item) {
  const token = ++strokeRenderToken;
  const scripts = studyScript === 'both' ? ['hira', 'kata'] : [studyScript];
  const loading = document.createElement('span');
  loading.className = 'stroke-loading';
  loading.textContent = '笔顺载入中';
  strokeOrderStage.className = 'stroke-order-stage';
  strokeOrderStage.replaceChildren(loading);
  strokeOrderStage.setAttribute('aria-busy', 'true');
  strokeOrderMeta.textContent = '正在加载笔顺…';
  replayStrokes.disabled = true;

  try {
    const groups = await Promise.all(scripts.map(script => createStrokeScriptGroup(item, script)));
    if (token !== strokeRenderToken) return;
    strokeOrderStage.classList.toggle('showing-both', scripts.length === 2);
    strokeOrderStage.replaceChildren(...groups.map(group => group.element));
    strokeOrderMeta.textContent = groups
      .map(group => `${group.script === 'hira' ? '平假名' : '片假名'} ${group.strokeCount} 画`)
      .join(' · ');
    requestAnimationFrame(animateStrokePaths);
  } catch (error) {
    if (token !== strokeRenderToken) return;
    const failure = document.createElement('span');
    failure.className = 'stroke-loading is-error';
    failure.textContent = '笔顺暂时无法加载';
    strokeOrderStage.replaceChildren(failure);
    strokeOrderMeta.textContent = '请点击重播再次尝试';
    console.error(error);
  } finally {
    if (token === strokeRenderToken) {
      strokeOrderStage.setAttribute('aria-busy', 'false');
      replayStrokes.disabled = false;
    }
  }
}

function selectKana(item, speak = false) {
  selectedKana = item;
  visitedKana.add(item.id);
  safeStorage.set('kotoba-visited', [...visitedKana]);
  const showingBoth = studyScript === 'both';
  const writingScript = studyScript === 'kata' ? 'kata' : 'hira';
  const detailKana = document.querySelector('#detail-kana');
  detailKana.classList.toggle('paired', showingBoth);
  if (showingBoth) {
    const hira = document.createElement('span');
    const kata = document.createElement('span');
    hira.textContent = item.hira;
    kata.textContent = item.kata;
    detailKana.replaceChildren(hira, kata);
  } else {
    detailKana.textContent = item[studyScript];
  }
  document.querySelector('#guide-kana').textContent = item[writingScript];
  document.querySelector('#detail-romaji').textContent = item.romaji;
  if (showingBoth) {
    document.querySelector('#detail-companion').textContent = '平假名 · 片假名对照';
    document.querySelector('#writing-script-note').textContent = '对照模式下描写平假名';
  } else {
    const otherScript = studyScript === 'hira' ? 'kata' : 'hira';
    document.querySelector('#detail-companion').textContent = `${item[otherScript]} · ${otherScript === 'hira' ? '平假名' : '片假名'}`;
    document.querySelector('#writing-script-note').textContent = '沿淡色字形描写';
  }
  document.querySelector('#selected-category').textContent = categoryMeta[item.category].short;
  clearWriting();
  updateStudyProgress();
  renderStudyGrid();
  renderStrokeOrder(item);
  if (speak) playKana(item, document.querySelector('#play-sound'));
}

function updateStudyProgress() {
  const count = Math.min(visitedKana.size, allKana.length);
  document.querySelector('#study-progress-count').textContent = `${String(count).padStart(2, '0')} / ${allKana.length}`;
  document.querySelector('#study-progress-bar').style.width = `${(count / allKana.length) * 100}%`;
}

document.querySelectorAll('[data-study-category]').forEach((button) => {
  button.addEventListener('click', () => {
    studyCategory = button.dataset.studyCategory;
    selectedKana = kanaRows[studyCategory][0].items[0];
    document.querySelectorAll('[data-study-category]').forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', active);
    });
    document.querySelector('#category-title').textContent = categoryMeta[studyCategory].title;
    document.querySelector('#category-kicker').textContent = categoryMeta[studyCategory].kicker;
    selectKana(selectedKana);
  });
});

document.querySelectorAll('[data-study-script]').forEach((button) => {
  button.addEventListener('click', () => {
    studyScript = button.dataset.studyScript;
    document.querySelectorAll('[data-study-script]').forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', active);
    });
    selectKana(selectedKana);
  });
});

replayStrokes.addEventListener('click', () => renderStrokeOrder(selectedKana));

let activeKanaPlayback = null;

function stopKanaPlayback() {
  if (!activeKanaPlayback) return;
  activeKanaPlayback.audio.pause();
  activeKanaPlayback.button?.classList.remove('speaking');
  activeKanaPlayback = null;
}

function playKana(item, button) {
  if (typeof Audio === 'undefined') {
    showToast('当前浏览器暂不支持音频播放');
    return;
  }

  stopKanaPlayback();
  const playback = { audio: new Audio(item.audio), button };
  let errorReported = false;
  activeKanaPlayback = playback;
  playback.audio.preload = 'auto';
  button?.classList.add('speaking');

  const clearPlayback = () => {
    button?.classList.remove('speaking');
    if (activeKanaPlayback === playback) activeKanaPlayback = null;
  };
  const reportError = () => {
    if (errorReported) return;
    errorReported = true;
    clearPlayback();
    showToast('音频加载失败，请检查网络后重试');
  };

  playback.audio.addEventListener('ended', clearPlayback, { once: true });
  playback.audio.addEventListener('error', reportError, { once: true });
  const playRequest = playback.audio.play();
  playRequest?.catch(reportError);
}

document.querySelector('#play-sound').addEventListener('click', () => playKana(selectedKana, document.querySelector('#play-sound')));

const canvas = document.querySelector('#writing-canvas');
const context = canvas.getContext('2d');
let drawing = false;

function sizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = 7;
  context.strokeStyle = '#17343b';
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

canvas.addEventListener('pointerdown', (event) => {
  drawing = true;
  canvas.setPointerCapture(event.pointerId);
  const point = pointerPosition(event);
  context.beginPath();
  context.moveTo(point.x, point.y);
});
canvas.addEventListener('pointermove', (event) => {
  if (!drawing) return;
  const point = pointerPosition(event);
  context.lineTo(point.x, point.y);
  context.stroke();
});
['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => canvas.addEventListener(type, () => { drawing = false; }));

function clearWriting() {
  context.clearRect(0, 0, canvas.width, canvas.height);
}
document.querySelector('#clear-writing').addEventListener('click', clearWriting);
document.querySelector('#toggle-guide').addEventListener('click', (event) => {
  const hidden = document.querySelector('#writing-board').classList.toggle('hide-guide');
  event.currentTarget.textContent = hidden ? '显示描红' : '隐藏描红';
  event.currentTarget.setAttribute('aria-pressed', String(!hidden));
});
window.addEventListener('resize', sizeCanvas);

const quizState = {
  scripts: new Set(['hira', 'kata']),
  categories: new Set(['basic', 'voiced', 'yoon']),
  mode: 'choice',
  current: null,
  options: [],
  answered: false,
  questionNo: 0,
  ...safeStorage.get('kotoba-score', { attempts: 0, correct: 0, streak: 0, best: 0 })
};

const scriptNames = { hira: '平假名', kata: '片假名' };

function shuffle(values) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function quizPool() {
  return allKana
    .filter(item => quizState.categories.has(item.category))
    .flatMap(item => [...quizState.scripts].map(script => ({ item, script, symbol: item[script], key: `${item.id}-${script}` })));
}

function nextQuestion() {
  const pool = quizPool();
  const alternatives = pool.filter(question => question.key !== quizState.current?.key);
  const source = alternatives.length ? alternatives : pool;
  quizState.current = source[Math.floor(Math.random() * source.length)];
  quizState.answered = false;
  quizState.questionNo += 1;
  renderQuestion();
}

function renderQuestion() {
  const { item, script, symbol } = quizState.current;
  document.querySelector('#question-number').textContent = `QUESTION ${String(quizState.questionNo).padStart(2, '0')}`;
  document.querySelector('#question-kind').textContent = `${scriptNames[script]} · ${categoryMeta[item.category].short}`;
  document.querySelector('#question-kana').textContent = symbol;
  document.querySelector('#question-prompt').textContent = quizState.mode === 'choice' ? '请选择正确的罗马音' : '请输入对应的罗马音';
  const feedback = document.querySelector('#quiz-feedback');
  feedback.className = '';
  feedback.textContent = '准备好了吗？写下或选出你认为正确的答案。';
  document.querySelector('#next-question').classList.remove('visible');
  const answerArea = document.querySelector('#answer-area');
  answerArea.replaceChildren();

  if (quizState.mode === 'choice') {
    const uniqueReadings = [...new Set(allKana.filter(candidate => quizState.categories.has(candidate.category)).map(candidate => candidate.romaji))]
      .filter(reading => reading !== item.romaji);
    quizState.options = shuffle([item.romaji, ...shuffle(uniqueReadings).slice(0, 3)]);
    quizState.options.forEach((reading, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'answer-option';
      button.innerHTML = `<small>${index + 1}</small>${reading}`;
      button.addEventListener('click', () => answerChoice(button, reading));
      answerArea.append(button);
    });
  } else {
    const form = document.createElement('form');
    form.className = 'typing-form';
    form.innerHTML = '<input aria-label="输入罗马音" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="例如：shi"><button type="submit">确认答案</button>';
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      answerTyping(form.querySelector('input'));
    });
    answerArea.append(form);
    requestAnimationFrame(() => form.querySelector('input').focus({ preventScroll: true }));
  }
}

function answerChoice(button, reading) {
  if (quizState.answered) return;
  const correct = reading === quizState.current.item.romaji;
  button.classList.add(correct ? 'correct' : 'wrong');
  document.querySelectorAll('.answer-option').forEach((option) => {
    option.disabled = true;
    if (option.textContent.trim().replace(/^\d/, '') === quizState.current.item.romaji) option.classList.add('correct', 'reveal');
  });
  finishAnswer(correct);
}

function normaliseAnswer(value) {
  return value.trim().toLowerCase().replace(/[\s-]/g, '');
}

function answerTyping(input) {
  if (quizState.answered || !input.value.trim()) return;
  const item = quizState.current.item;
  const accepted = [item.romaji, ...item.aliases].map(normaliseAnswer);
  const correct = accepted.includes(normaliseAnswer(input.value));
  input.classList.add(correct ? 'correct' : 'wrong');
  input.disabled = true;
  input.nextElementSibling.disabled = true;
  finishAnswer(correct);
}

function finishAnswer(correct) {
  quizState.answered = true;
  quizState.attempts += 1;
  if (correct) {
    quizState.correct += 1;
    quizState.streak += 1;
    quizState.best = Math.max(quizState.best, quizState.streak);
  } else {
    quizState.streak = 0;
  }
  safeStorage.set('kotoba-score', { attempts: quizState.attempts, correct: quizState.correct, streak: quizState.streak, best: quizState.best });
  const feedback = document.querySelector('#quiz-feedback');
  feedback.className = correct ? 'good' : 'bad';
  feedback.textContent = correct ? `答对了！${quizState.current.symbol} 读作 ${quizState.current.item.romaji}。` : `再记一次：${quizState.current.symbol} 读作 ${quizState.current.item.romaji}。`;
  document.querySelector('#question-prompt').textContent = `正确读音 · ${quizState.current.item.romaji}`;
  document.querySelector('#next-question').classList.add('visible');
  updateScore();
  if (correct) playKana(quizState.current.item, document.querySelector('#quiz-audio'));
}

function updateScore() {
  const accuracy = quizState.attempts ? Math.round((quizState.correct / quizState.attempts) * 100) : null;
  document.querySelector('#accuracy-score').textContent = accuracy === null ? '—' : `${accuracy}%`;
  document.querySelector('#correct-score').textContent = quizState.correct;
  document.querySelector('#attempt-score').textContent = quizState.attempts;
  document.querySelector('#streak-score').textContent = quizState.streak;
  document.querySelector('#best-streak').textContent = quizState.best;
  document.querySelector('#score-ring').style.setProperty('--score', `${accuracy === null ? 0 : accuracy * 3.6}deg`);
}

document.querySelectorAll('[data-filter-kind]').forEach((button) => {
  button.addEventListener('click', () => {
    const collection = button.dataset.filterKind === 'script' ? quizState.scripts : quizState.categories;
    const value = button.dataset.filterValue;
    if (collection.has(value) && collection.size === 1) {
      showToast('这一组至少要保留一项');
      return;
    }
    collection.has(value) ? collection.delete(value) : collection.add(value);
    const active = collection.has(value);
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
    nextQuestion();
  });
});

document.querySelectorAll('[data-quiz-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    quizState.mode = button.dataset.quizMode;
    document.querySelectorAll('[data-quiz-mode]').forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    nextQuestion();
  });
});

document.querySelector('#quiz-audio').addEventListener('click', () => playKana(quizState.current.item, document.querySelector('#quiz-audio')));
document.querySelector('#next-question').addEventListener('click', nextQuestion);
document.querySelector('#reset-score').addEventListener('click', () => {
  Object.assign(quizState, { attempts: 0, correct: 0, streak: 0, best: 0 });
  safeStorage.set('kotoba-score', { attempts: 0, correct: 0, streak: 0, best: 0 });
  updateScore();
  showToast('本轮成绩已重置');
});

document.addEventListener('keydown', (event) => {
  const typing = event.target.matches('input, textarea');
  if (typing) return;
  if (quizState.mode === 'choice' && !quizState.answered && /^[1-4]$/.test(event.key)) {
    document.querySelectorAll('.answer-option')[Number(event.key) - 1]?.click();
  } else if (event.key === 'Enter' && quizState.answered) {
    nextQuestion();
  }
});

let toastTimer;
function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

const floatingTools = document.querySelector('#floating-tools');
const floatingNavWrap = document.querySelector('.floating-nav-wrap');
const floatingNav = document.querySelector('#floating-nav');
const navSummon = document.querySelector('#nav-summon');
const backToTop = document.querySelector('#back-to-top');

function setFloatingNavOpen(open, restoreFocus = false) {
  floatingNavWrap.classList.toggle('is-open', open);
  navSummon.setAttribute('aria-expanded', String(open));
  navSummon.setAttribute('aria-label', open ? '关闭快捷导航' : '打开快捷导航');
  floatingNav.setAttribute('aria-hidden', String(!open));
  floatingNav.inert = !open;
  if (restoreFocus) navSummon.focus();
}

function updateFloatingTools() {
  const navReady = window.scrollY > 140 || (window.innerWidth > 680 && window.innerWidth <= 900);
  floatingTools.classList.toggle('nav-ready', navReady);
  floatingTools.classList.toggle('top-ready', window.scrollY > 520);
  if (!navReady) setFloatingNavOpen(false);
}

navSummon.addEventListener('click', () => setFloatingNavOpen(!floatingNavWrap.classList.contains('is-open')));
backToTop.addEventListener('click', () => {
  setFloatingNavOpen(false);
  window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
});
floatingNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setFloatingNavOpen(false)));
document.addEventListener('click', (event) => {
  if (!floatingNavWrap.contains(event.target)) setFloatingNavOpen(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && floatingNavWrap.classList.contains('is-open')) setFloatingNavOpen(false, true);
});
window.addEventListener('scroll', updateFloatingTools, { passive: true });
window.addEventListener('resize', updateFloatingTools);

const observedSections = [...document.querySelectorAll('#learn, #practice, #reading, #shadowing')];
const navLinks = [...document.querySelectorAll('.topnav a, .floating-nav a, .mobile-dock a')];
if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.filter(entry => entry.isIntersecting).forEach((entry) => {
      navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
    });
  }, { rootMargin: '-30% 0px -55% 0px', threshold: 0 });
  observedSections.forEach(section => sectionObserver.observe(section));
}

renderStudyGrid();
selectKana(selectedKana);
updateScore();
nextQuestion();
requestAnimationFrame(sizeCanvas);
updateFloatingTools();
