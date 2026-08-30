import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { applyShadowingVoiceProfile, SHADOWING_VOICE_PROFILES } from './shadowing-audio-profile.mjs';
import { parseLessonFilter } from './shadowing-generator-options.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

assert(parseLessonFilter().size === 0, 'An omitted lesson filter must include every lesson.');
assert(parseLessonFilter('').size === 0, 'An empty lesson filter must include every lesson.');
assert([...parseLessonFilter('19, 20')].join(',') === '19,20', 'Explicit lesson filters must still be parsed.');

const study = SHADOWING_VOICE_PROFILES.study;
assert(study.speedScale === 0.92, 'The existing female study speed must remain unchanged.');
assert(study.postPhonemeLength === 0.32, 'The existing female study ending pause must remain unchanged.');

const maleQuery = {
  accent_phrases: [{
    moras: [{ vowel: 'a', vowel_length: 0.12 }],
    pause_mora: { vowel: 'pau', vowel_length: 0.48 }
  }]
};
const result = applyShadowingVoiceProfile(maleQuery, 'natural-male');
assert(maleQuery.speedScale >= 0.98, 'Natural male speech must not stretch morae with the old slow study speed.');
assert(maleQuery.pitchScale === 0, 'Natural male speech must keep the engine-native pitch.');
assert(maleQuery.intonationScale >= 1.05 && maleQuery.intonationScale <= 1.15, 'Natural male intonation must stay within the restrained tuning range.');
assert(maleQuery.prePhonemeLength <= 0.1, 'Natural male leading silence must be short.');
assert(maleQuery.postPhonemeLength <= 0.18, 'Natural male trailing silence must be short.');
assert(maleQuery.accent_phrases[0].pause_mora.vowel_length <= 0.34, 'Natural male punctuation pauses must be compressed.');
assert(result.adjustedPauseCount === 1, 'The punctuation pause adjustment was not applied.');

const generator = await readFile(path.join(root, 'scripts', 'generate-shadowing-audio.mjs'), 'utf8');
assert(generator.includes('VOICEVOX_PROFILE'), 'The generator does not select a named voice profile.');
assert(generator.includes('applyShadowingVoiceProfile(query, profileName)'), 'The generator does not apply the selected voice profile.');

if (failures.length) {
  console.error('Shadowing voice profile check failed.');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Shadowing voice profile check passed: female study settings preserved; male pace, pitch, intonation, and pauses are independently tuned.');
