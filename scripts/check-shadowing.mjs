import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shadowingLessons, shadowingCatalogSummary } from '../shadowing-data.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

assert(shadowingLessons.length === 54, `Expected 54 lessons, found ${shadowingLessons.length}.`);
assert(new Set(shadowingLessons.map((lesson) => lesson.id)).size === 54, 'Lesson IDs must be unique.');
assert(!shadowingLessons.some((lesson) => lesson.sourcePage === 15), 'Duplicate PDF page 15 must be excluded.');

for (const [level, expected] of Object.entries(shadowingCatalogSummary.levels)) {
  const actual = shadowingLessons.filter((lesson) => lesson.levelLabel === level).length;
  assert(actual === expected, `${level}: expected ${expected} exactly labelled lessons, found ${actual}.`);
}

for (const [level, expected] of Object.entries(shadowingCatalogSummary.filters)) {
  const actual = shadowingLessons.filter((lesson) => lesson.levelFilters.includes(level)).length;
  assert(actual === expected, `${level} filter: expected ${expected} lessons, found ${actual}.`);
}

assert(shadowingCatalogSummary.sourceMarked + shadowingCatalogSummary.assessed === shadowingLessons.length, 'Every lesson must have a level origin.');
assert(shadowingLessons.find((lesson) => lesson.id === 19)?.levelLabel === 'N5–N4', 'Lesson 19 must keep the source N5–N4 transition label.');
assert(shadowingLessons.find((lesson) => lesson.id === 33)?.levelLabel === 'N5', 'Lesson 33 must follow the source N5 label.');

let audioCount = 0;
let sentenceCount = 0;
let rubyCount = 0;
const kanjiPattern = /[々〆ヵヶ一-龯]/;
for (const lesson of shadowingLessons) {
  assert(Boolean(lesson.title && lesson.titleZh && lesson.topic), `Lesson ${lesson.id} has incomplete metadata.`);
  assert(Boolean(lesson.levelLabel && lesson.levelOriginLabel && lesson.levelNote), `Lesson ${lesson.id} has incomplete level metadata.`);
  assert(['source', 'assessed'].includes(lesson.levelOrigin), `Lesson ${lesson.id} has an invalid level origin.`);
  assert(Array.isArray(lesson.levelFilters) && lesson.levelFilters.length > 0, `Lesson ${lesson.id} has no level filter membership.`);
  assert(lesson.ready, `Lesson ${lesson.id} must be available for text shadowing.`);
  assert(!Object.hasOwn(lesson, 'image'), `Lesson ${lesson.id} must not expose a PDF image.`);
  assert(Array.isArray(lesson.sentences) && lesson.sentences.length > 0, `Lesson ${lesson.id} has no sentences.`);
  assert(Array.isArray(lesson.vocabulary) && lesson.vocabulary.length >= 4, 'Lesson ' + lesson.id + ' must have at least four vocabulary notes.');
  assert(Array.isArray(lesson.grammar) && lesson.grammar.length >= 2, 'Lesson ' + lesson.id + ' must have at least two grammar notes.');
  for (const [index, item] of lesson.vocabulary.entries()) {
    assert(Boolean(item.word && item.reading && item.meaning), 'Lesson ' + lesson.id + ', vocabulary ' + (index + 1) + ' is incomplete.');
  }
  for (const [index, item] of lesson.grammar.entries()) {
    assert(Boolean(item.pattern && item.note), 'Lesson ' + lesson.id + ', grammar ' + (index + 1) + ' is incomplete.');
  }
  for (const [index, sentence] of lesson.sentences.entries()) {
    assert(Boolean(sentence.jp && sentence.audio), `Lesson ${lesson.id}, sentence ${index + 1} is incomplete.`);
    assert(Number.isInteger(sentence.paragraph) && sentence.paragraph >= 0, `Lesson ${lesson.id}, sentence ${index + 1} has no valid paragraph index.`);
    assert(Array.isArray(sentence.furigana) && sentence.furigana.length > 0, `Lesson ${lesson.id}, sentence ${index + 1} has no furigana segments.`);
    const rebuiltText = sentence.furigana.map((segment) => {
      if (!Array.isArray(segment)) {
        assert(!kanjiPattern.test(segment), `Lesson ${lesson.id}, sentence ${index + 1} leaves kanji without furigana: ${segment}`);
        return segment;
      }
      assert(segment.length === 2 && Boolean(segment[0] && segment[1]), `Lesson ${lesson.id}, sentence ${index + 1} has an invalid ruby segment.`);
      assert(kanjiPattern.test(segment[0]), `Lesson ${lesson.id}, sentence ${index + 1} annotates a segment without kanji: ${segment[0]}`);
      rubyCount += 1;
      return segment[0];
    }).join('');
    assert(rebuiltText === sentence.jp, `Lesson ${lesson.id}, sentence ${index + 1} furigana changes the source text.`);
    sentenceCount += 1;
    try {
      const audio = await readFile(path.join(root, sentence.audio));
      assert(audio.length > 44 && audio.toString('ascii', 0, 4) === 'RIFF', `Lesson ${lesson.id}, sentence ${index + 1} is not a valid WAV.`);
      audioCount += 1;
    } catch {
      failures.push(`Lesson ${lesson.id}, sentence ${index + 1} audio is missing.`);
    }
  }
}
assert(sentenceCount === 488, `Expected 488 sentences, found ${sentenceCount}.`);
assert(audioCount === sentenceCount, `Expected one WAV clip per sentence; found ${audioCount} for ${sentenceCount} sentences.`);
assert(rubyCount > 2_000, `Expected comprehensive furigana coverage, found only ${rubyCount} ruby groups.`);

const html = await readFile(path.join(root, 'shadowing.html'), 'utf8');
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
assert(ids.length === new Set(ids).size, 'shadowing.html contains duplicate element IDs.');
for (const requiredId of ['lesson-list', 'transcript', 'shadowing-audio', 'record-button', 'start-session', 'furigana-toggle']) {
  assert(ids.includes(requiredId), `shadowing.html is missing #${requiredId}.`);
}
assert(!/<img\b/i.test(html), 'shadowing.html must not render PDF page images.');
assert(!/source-dialog|source-card|精读原页/.test(html), 'shadowing.html still contains an obsolete PDF-image control.');
assert(!html.includes('<span>文本</span>'), 'The misleading non-interactive “文本” control must be removed.');
assert(/id="furigana-toggle"[^>]*aria-pressed="false"/.test(html), 'Furigana must be hidden by default.');

const clientScript = await readFile(path.join(root, 'shadowing.js'), 'utf8');
const referencedIds = [...clientScript.matchAll(/\$\('#([a-z][\w-]+)'\)/gi)].map((match) => match[1]);
for (const referencedId of new Set(referencedIds)) {
  assert(ids.includes(referencedId), `shadowing.js references missing #${referencedId}.`);
}
assert(clientScript.includes("elements.furiganaToggle.addEventListener('click'"), 'The furigana toggle has no click handler.');
assert(clientScript.includes('<ruby>'), 'The transcript renderer does not emit ruby markup.');

const css = await readFile(path.join(root, 'shadowing.css'), 'utf8');
assert(/\.article-sentence rt\s*\{[^}]*display:\s*none/.test(css), 'Furigana CSS must hide rt text by default.');
assert(/\.furigana-visible \.article-sentence rt\s*\{[^}]*display:\s*ruby-text/.test(css), 'Furigana CSS has no visible state.');

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Shadowing check passed: ${shadowingLessons.length} lessons, ${sentenceCount} clickable sentences, ${rubyCount} ruby groups, ${audioCount} WAV clips, ${ids.length} unique DOM IDs.`);
}
