import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  plainReadingText,
  readingCatalogSummary,
  readingDiscIntro,
  readingLessons
} from '../reading-data.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const expectedLessonTracks = new Set(Array.from({ length: 87 }, (_, index) => index + 1));
const seenTracks = new Set();
const seenLineIds = new Set();
let lineCount = 0;

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function isMp3(buffer) {
  return buffer.length > 128 && (
    buffer.toString('ascii', 0, 3) === 'ID3' ||
    (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
  );
}

assert(readingLessons.length === 25, 'Expected 25 N5 lessons.');
assert(readingCatalogSummary.total === 25, 'Catalog total must be 25.');
assert(readingCatalogSummary.ready === 25, 'Every N5 lesson must be ready.');
assert(readingCatalogSummary.tracks === 87, 'Catalog must contain 87 lesson tracks.');
assert(new Set(readingLessons.map((lesson) => lesson.id)).size === 25, 'Lesson IDs must be unique.');

for (const lesson of readingLessons) {
  assert(lesson.level === 'N5', `Lesson ${lesson.id} must be N5.`);
  assert(Boolean(lesson.title && lesson.titleZh && lesson.topic && lesson.goal), `Lesson ${lesson.id} metadata is incomplete.`);
  assert(lesson.tracks.length >= 3, `Lesson ${lesson.id} must include its conversation and problem tracks.`);
  assert(lesson.sentences.length >= 10, `Lesson ${lesson.id} has too few transcript lines.`);
  assert(lesson.vocabulary.length >= 5, `Lesson ${lesson.id} must contain at least five vocabulary notes.`);
  assert(lesson.grammar.length >= 4, `Lesson ${lesson.id} must contain at least four grammar notes.`);

  for (const track of lesson.tracks) {
    assert(expectedLessonTracks.has(track.number), `Lesson ${lesson.id} contains unexpected MP3 ${track.number}.`);
    assert(!seenTracks.has(track.number), `MP3 ${track.number} is assigned more than once.`);
    seenTracks.add(track.number);
    assert(track.lines.length > 0, `MP3 ${track.number} has no transcript lines.`);

    let previousStart = -1;
    let previousEnd = -1;
    for (const [index, line] of track.lines.entries()) {
      assert(line.track === track.number, `MP3 ${track.number}, line ${index + 1} has a mismatched track number.`);
      assert(line.audio.endsWith(track.file), `MP3 ${track.number}, line ${index + 1} has a mismatched audio path.`);
      assert(Boolean(line.jp && line.markup), `MP3 ${track.number}, line ${index + 1} has no text.`);
      assert(line.jp === plainReadingText(line.markup), `MP3 ${track.number}, line ${index + 1} plain text does not match its ruby markup.`);
      assert(Number.isFinite(line.start) && Number.isFinite(line.end), `MP3 ${track.number}, line ${index + 1} has invalid timestamps.`);
      assert(line.start >= 0 && line.end > line.start, `MP3 ${track.number}, line ${index + 1} has a non-positive clip range.`);
      assert(line.end <= track.duration + 0.01, `MP3 ${track.number}, line ${index + 1} exceeds the track duration.`);
      assert(line.start >= previousStart, `MP3 ${track.number} transcript is not chronological.`);
      assert(line.start >= previousEnd - 0.001, `MP3 ${track.number}, line ${index + 1} overlaps the previous clip.`);
      assert(!seenLineIds.has(line.id), `Duplicate transcript line id: ${line.id}.`);
      previousStart = line.start;
      previousEnd = line.end;
      seenLineIds.add(line.id);
      lineCount += 1;
    }

    try {
      const audio = await readFile(path.join(root, track.lines[0].audio));
      assert(isMp3(audio), `MP3 ${track.number} is not a valid MP3 file.`);
    } catch {
      failures.push(`MP3 ${track.number} audio is missing.`);
    }
  }
}

for (const track of expectedLessonTracks) {
  assert(seenTracks.has(track), `MP3 ${track} is not assigned to any lesson.`);
}
assert(lineCount === readingCatalogSummary.sentences, 'Catalog transcript total does not match lesson data.');

assert(readingDiscIntro.number === 0 && readingDiscIntro.lines.length > 0, 'MP3 00 publisher intro is missing.');
try {
  const introAudio = await readFile(path.join(root, readingDiscIntro.audio));
  assert(isMp3(introAudio), 'MP3 00 is not a valid MP3 file.');
} catch {
  failures.push('MP3 00 publisher intro audio is missing.');
}

try {
  const audioDirectory = path.join(root, 'assets', 'audio', 'reading', 'n5', 'minna-v2');
  const files = (await readdir(audioDirectory)).filter((file) => /^MP3_\d{2}\.mp3$/i.test(file));
  assert(files.length === 88, `Expected 88 copied MP3 files; found ${files.length}.`);
} catch {
  failures.push('Second-edition audio directory is missing or unreadable.');
}

try {
  const html = await readFile(path.join(root, 'reading.html'), 'utf8');
  assert(!/<img\b/i.test(html), 'reading.html must not use PDF screenshots or other lesson images.');
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert(ids.length === new Set(ids).size, 'reading.html contains duplicate element IDs.');
  for (const id of ['lesson-list', 'reading-text', 'reading-audio', 'furigana-toggle', 'start-session', 'disc-intro-lines']) {
    assert(ids.includes(id), `reading.html is missing #${id}.`);
  }
} catch {
  failures.push('reading.html is missing or unreadable.');
}

if (failures.length) {
  console.error(`N5 reading check failed with ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`N5 reading check passed: 25 lessons, 87 lesson tracks, 1 publisher track and ${lineCount} clickable transcript lines.`);
