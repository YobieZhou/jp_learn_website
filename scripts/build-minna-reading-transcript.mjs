import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(scriptDirectory, '..');
const inputPath = path.join(projectRoot, 'tmp', 'minna-transcripts-medium.json');
const outputPath = path.join(projectRoot, 'reading-transcript-data.mjs');
const reviewPath = path.join(projectRoot, 'tmp', 'minna-transcript-review.json');
const furiganaInputPath = path.join(projectRoot, 'tmp', 'minna-furigana-input.json');
const furiganaMapPath = path.join(projectRoot, 'tmp', 'minna-furigana-map.json');

const lessonConversationTracks = [
  1, 5, 9, 12, 17, 21, 24, 28, 32, 35, 39, 43, 46,
  49, 53, 56, 60, 63, 66, 69, 72, 75, 78, 82, 85
];

const phraseCorrections = [
  ['議論祭り', '祇園祭'],
  ['義音祭り', '祇園祭'],
  ['義園祭り', '祇園祭'],
  ['祇園祭り', '祇園祭'],
  ['緑調', 'みどり町'],
  ['緑町', 'みどり町'],
  ['緑図書館', 'みどり図書館'],
  ['ワイングリバー', 'ワイン売り場'],
  ['アスカ', 'あすか'],
  ['海と山田どちら', '海と山とどちら'],
  ['鶴谷', 'つるや'],
  ['ターポン', 'タワポン'],
  ['量はどうですか', '寮はどうですか'],
  ['男の人の量は', '男の人の寮は'],
  ['風ですね', '風邪ですね'],
  ['アニがくれました', '兄がくれました'],
  ['天近おめでとうございます', '転勤、おめでとうございます'],
  ['友達と郵便へ行きました', '友達と神戸へ行きました'],
  ['アメリカの国の番号を1を', 'アメリカの国番号1を'],
  ['ミラーさん、もう東京にレポート', 'ミラーさん、もう東京へレポート'],
  ['メールで東京にレポート', 'メールで東京へレポート'],
  ['熱いですね', '暑いですね'],
  ['なんでご飯を食べますか', '何でご飯を食べますか'],
  ['5万円ですが、5。', '5万円ですが、5……。'],
  ['この、万円を押します。', 'この「万」「円」を押します。']
];

const trackSpecificCorrections = new Map([
  [6, new Map([
    ['これはアですか？', 'これは「あ」ですか？'],
    ['オですか？', '「お」ですか？']
  ])],
  [47, new Map([['が。', '5。']])],
  [57, new Map([['が。', '5。']])],
  [61, new Map([['が。', '5。']])]
]);

function round(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function normalizeText(value) {
  let text = String(value ?? '')
    .trim()
    .replaceAll('?', '？')
    .replaceAll('!', '！')
    .replace(/\s+([、。！？])/g, '$1');
  for (const [from, to] of phraseCorrections) text = text.replaceAll(from, to);
  return text;
}

function normalizeTrackText(value, trackNumber) {
  let text = normalizeText(value)
    .replace(/^第(\d+)話。?$/, '第$1課。');
  if (text === '0。') text = '例。';
  text = trackSpecificCorrections.get(trackNumber)?.get(text) ?? text;
  return text;
}

function meanProbability(words) {
  const probabilities = words
    .map((word) => Number(word.probability))
    .filter(Number.isFinite);
  if (!probabilities.length) return 1;
  return probabilities.reduce((sum, probability) => sum + probability, 0) / probabilities.length;
}

function splitSegment(segment) {
  const words = Array.isArray(segment.words)
    ? segment.words.filter((word) => String(word.word ?? '').trim())
    : [];
  if (!words.length) {
    const text = normalizeText(segment.text);
    return text ? [{ text, rawStart: segment.start, rawEnd: segment.end, confidence: 1 }] : [];
  }

  const chunks = [];
  let chunkStart = 0;
  const pushChunk = (endIndex) => {
    const chunkWords = words.slice(chunkStart, endIndex + 1);
    const text = normalizeText(chunkWords.map((word) => word.word).join(''));
    if (text) {
      chunks.push({
        text,
        rawStart: Number(chunkWords[0].start ?? segment.start),
        rawEnd: Number(chunkWords.at(-1).end ?? segment.end),
        confidence: meanProbability(chunkWords)
      });
    }
    chunkStart = endIndex + 1;
  };

  words.forEach((word, index) => {
    const terminal = /[。！？?!][」』）)]?$/.test(String(word.word).trim());
    const nextWord = words[index + 1];
    const gapAfter = nextWord ? Number(nextWord.start) - Number(word.end) : 0;
    const accumulatedText = normalizeText(
      words.slice(chunkStart, index + 1).map((item) => item.word).join('')
    );
    const spokenCueBoundary = Boolean(nextWord) && gapAfter >= 0.3 && isCue(accumulatedText);
    if (terminal || spokenCueBoundary) pushChunk(index);
  });
  if (chunkStart < words.length) pushChunk(words.length - 1);
  return chunks;
}

function isCue(text) {
  const normalized = text.replace(/[、。！？\s]/g, '');
  return /^(?:第?[0-9一二三四五六七八九十]+課(?:会話|問題)?|会話|問題|第?[0-9一二三四五六七八九十]+番|[0-9一二三四五六七八九十]+|例[0-9一二三四五六七八九十]*)$/.test(normalized);
}

function paddedLines(track, trackNumber) {
  const rawLines = track.segments.flatMap(splitSegment)
    .filter((line) => line.text)
    .sort((a, b) => a.rawStart - b.rawStart);

  return rawLines.map((line, index) => {
    const previousRawEnd = index ? rawLines[index - 1].rawEnd : 0;
    const nextRawStart = index + 1 < rawLines.length
      ? rawLines[index + 1].rawStart
      : Number(track.duration);
    const gapBefore = Math.max(0, line.rawStart - previousRawEnd);
    const gapAfter = Math.max(0, nextRawStart - line.rawEnd);
    const start = Math.max(0, line.rawStart - Math.min(0.12, gapBefore * 0.35));
    const end = Math.min(Number(track.duration), line.rawEnd + Math.min(0.18, gapAfter * 0.35));
    const text = normalizeTrackText(line.text, trackNumber);
    return {
      text,
      start: round(start),
      end: round(Math.max(start + 0.08, end)),
      kind: isCue(text) ? 'cue' : 'sentence',
      confidence: round(line.confidence)
    };
  });
}

function lessonForTrack(trackNumber) {
  for (let index = lessonConversationTracks.length - 1; index >= 0; index -= 1) {
    if (trackNumber >= lessonConversationTracks[index]) return index + 1;
  }
  return 0;
}

const source = JSON.parse(await readFile(inputPath, 'utf8'));
const furiganaMap = JSON.parse(
  await readFile(furiganaMapPath, 'utf8').catch(() => '{}')
);
const tracks = new Map(
  Object.entries(source.tracks).map(([number, track]) => [Number(number), track])
);

for (let number = 0; number <= 87; number += 1) {
  if (!tracks.has(number)) throw new Error(`Missing transcript for MP3_${String(number).padStart(2, '0')}.mp3`);
}

const lessons = lessonConversationTracks.map((conversationTrack, index) => {
  const id = index + 1;
  const nextConversationTrack = lessonConversationTracks[index + 1] ?? 88;
  const lessonTracks = [];
  for (let number = conversationTrack; number < nextConversationTrack; number += 1) {
    const sourceTrack = tracks.get(number);
    const lines = paddedLines(sourceTrack, number).map((line, lineIndex) => ({
      id: `l${String(id).padStart(2, '0')}-t${String(number).padStart(2, '0')}-${String(lineIndex + 1).padStart(3, '0')}`,
      track: number,
      section: number === conversationTrack ? '会话' : `问题 ${number - conversationTrack}`,
      audio: `assets/audio/reading/n5/minna-v2/${sourceTrack.file}`,
      start: line.start,
      end: line.end,
      jp: line.text,
      markup: furiganaMap[line.text] ?? line.text,
      kind: line.kind
    }));
    lessonTracks.push({
      number,
      file: sourceTrack.file,
      duration: round(sourceTrack.duration),
      section: number === conversationTrack ? '会话' : `问题 ${number - conversationTrack}`,
      lines
    });
  }
  return { id, conversationTrack, tracks: lessonTracks };
});

const discSource = tracks.get(0);
const discIntro = {
  number: 0,
  file: discSource.file,
  duration: round(discSource.duration),
  audio: `assets/audio/reading/n5/minna-v2/${discSource.file}`,
  lines: paddedLines(discSource, 0).map((line, index) => ({
    id: `disc-t00-${String(index + 1).padStart(3, '0')}`,
    track: 0,
    section: '光盘说明',
    audio: `assets/audio/reading/n5/minna-v2/${discSource.file}`,
    start: line.start,
    end: line.end,
    jp: line.text,
    markup: line.text,
    kind: line.kind
  }))
};

const lowConfidence = [];
const furiganaInput = new Set();
for (const [number, track] of tracks) {
  for (const line of paddedLines(track, number)) {
    if (number > 0) furiganaInput.add(line.text);
    if (line.confidence < 0.72) {
      lowConfidence.push({ track: number, start: line.start, end: line.end, confidence: line.confidence, text: line.text });
    }
  }
}

const moduleSource = `// Generated from the supplied Minna no Nihongo Shokyu I, Second Edition audio.\n` +
  `// Run scripts/build-minna-reading-transcript.mjs after reviewing ASR source data.\n\n` +
  `export const readingDiscIntro = Object.freeze(${JSON.stringify(discIntro, null, 2)});\n\n` +
  `export const readingAudioLessons = Object.freeze(${JSON.stringify(lessons, null, 2)});\n`;

await writeFile(outputPath, moduleSource, 'utf8');
await writeFile(reviewPath, `${JSON.stringify(lowConfidence, null, 2)}\n`, 'utf8');
await writeFile(furiganaInputPath, `${JSON.stringify([...furiganaInput], null, 2)}\n`, 'utf8');

const lineCount = lessons.reduce(
  (lessonTotal, lesson) => lessonTotal + lesson.tracks.reduce((trackTotal, track) => trackTotal + track.lines.length, 0),
  0
);
console.log(`Generated ${lessons.length} lessons, 87 lesson tracks and ${lineCount} clickable transcript lines.`);
console.log(`Flagged ${lowConfidence.length} low-confidence line(s) for review.`);
