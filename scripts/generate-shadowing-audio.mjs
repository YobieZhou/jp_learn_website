import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shadowingLessons } from '../shadowing-data.mjs';
import { applyShadowingVoiceProfile } from './shadowing-audio-profile.mjs';
import { parseLessonFilter } from './shadowing-generator-options.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputVariant = (process.env.VOICEVOX_OUTPUT_VARIANT || '').trim();
if (outputVariant && !/^[a-z0-9-]+$/i.test(outputVariant)) {
  throw new Error('VOICEVOX_OUTPUT_VARIANT may contain only letters, numbers, and hyphens.');
}
const outputRoot = outputVariant
  ? path.join(projectRoot, 'assets', 'audio', 'shadowing-preview', outputVariant)
  : path.join(projectRoot, 'assets', 'audio', 'shadowing');
const engineUrl = (process.env.VOICEVOX_ENGINE_URL || 'http://127.0.0.1:50121').replace(/\/$/, '');
const styleId = Number(process.env.VOICEVOX_STYLE_ID || 10005);
const profileName = (process.env.VOICEVOX_PROFILE || 'study').trim();
const force = process.env.VOICEVOX_FORCE === 'true';
const regenerate = new Set((process.env.VOICEVOX_REGENERATE || '').split(',').map((value) => value.trim()).filter(Boolean));
const lessonFilter = parseLessonFilter(process.env.VOICEVOX_LESSONS);
const readyLessons = shadowingLessons.filter((lesson) => lesson.ready && (!lessonFilter.size || lessonFilter.has(lesson.id)));
const totalSentences = readyLessons.reduce((total, lesson) => total + lesson.sentences.length, 0);
let generated = 0;
let skipped = 0;
let processed = 0;

function spokenTextFor(sentence) {
  return sentence.jp
    .replace(/^[AB]：/, '')
    .replaceAll('弾ける', 'ひける')
    .replaceAll('弾き', 'ひき')
    .replaceAll('雨が降りそう', '雨がふりそう')
    .replaceAll('日本中', 'にほんじゅう');
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  return response.json();
}

for (const lesson of readyLessons) {
  const lessonDirectory = path.join(outputRoot, `lesson-${String(lesson.id).padStart(2, '0')}`);
  await mkdir(lessonDirectory, { recursive: true });

  for (const [sentenceIndex, sentence] of lesson.sentences.entries()) {
    const fileName = `${String(sentenceIndex + 1).padStart(2, '0')}.wav`;
    const outputPath = path.join(lessonDirectory, fileName);
    const sentenceKey = `${lesson.id}-${sentenceIndex + 1}`;
    if (!force && !regenerate.has(sentenceKey)) {
      try {
        await access(outputPath);
        skipped += 1;
        processed += 1;
        process.stdout.write(`\rProcessed ${String(processed).padStart(3, ' ')}/${totalSentences} · generated ${generated} · kept ${skipped}`);
        continue;
      } catch { /* Missing audio is generated below. */ }
    }

    const spokenText = spokenTextFor(sentence);
    const parameters = new URLSearchParams({ text: spokenText, speaker: String(styleId) });
    const query = await requestJson(`${engineUrl}/audio_query?${parameters}`, { method: 'POST' });
    applyShadowingVoiceProfile(query, profileName);

    const response = await fetch(`${engineUrl}/synthesis?speaker=${styleId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query)
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);

    const audio = Buffer.from(await response.arrayBuffer());
    if (audio.length < 44 || audio.toString('ascii', 0, 4) !== 'RIFF') {
      throw new Error(`VOICEVOX returned invalid WAV for lesson ${lesson.id}, sentence ${sentenceIndex + 1}.`);
    }

    await writeFile(outputPath, audio);
    generated += 1;
    processed += 1;
    process.stdout.write(`\rProcessed ${String(processed).padStart(3, ' ')}/${totalSentences} · generated ${generated} · kept ${skipped}`);
  }
}

process.stdout.write(`\nSaved ${generated} new VOICEVOX Nemo style ${styleId} clips with profile ${profileName}; kept ${skipped} existing clips in ${outputRoot}\n`);
