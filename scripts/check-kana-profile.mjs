import { applyKanaLearningProfile } from './kana-audio-profile.mjs';

const engineUrl = (process.env.VOICEVOX_ENGINE_URL || 'http://127.0.0.1:50121').replace(/\/$/, '');
const styleId = Number(process.env.VOICEVOX_STYLE_ID || 10005);
const minimumClearUVowelSeconds = 0.18;
const uColumn = ['ク', 'ス', 'ツ', 'ヌ', 'フ', 'ム', 'ユ', 'ル', 'グ', 'ズ', 'ヅ', 'ブ', 'プ'];
const clarityCases = [
  { kata: 'ヨ', consonant: 'y', minimumConsonantSeconds: 0.14, minimumVowelSeconds: 0.19 },
  { kata: 'ロ', consonant: 'r', minimumConsonantSeconds: 0.11, minimumVowelSeconds: 0.18 }
];
const issues = [];

for (const kata of uColumn) {
  const parameters = new URLSearchParams({ text: kata, speaker: String(styleId) });
  const response = await fetch(`${engineUrl}/audio_query?${parameters}`, { method: 'POST' });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);

  const query = await response.json();
  applyKanaLearningProfile(query, kata);
  const uMoras = query.accent_phrases.flatMap(phrase => phrase.moras)
    .filter(mora => mora.vowel.toLowerCase() === 'u');

  if (!uMoras.length) {
    issues.push(`${kata}: missing /u/ mora`);
    continue;
  }

  for (const mora of uMoras) {
    const scaledVowelSeconds = mora.vowel_length / query.speedScale;
    if (mora.vowel !== 'u') issues.push(`${kata}: /u/ is devoiced as ${mora.vowel}`);
    if (scaledVowelSeconds < minimumClearUVowelSeconds) {
      issues.push(`${kata}: /u/ is ${scaledVowelSeconds.toFixed(3)}s, expected at least ${minimumClearUVowelSeconds.toFixed(2)}s`);
    }
  }
}

for (const clarityCase of clarityCases) {
  const parameters = new URLSearchParams({ text: clarityCase.kata, speaker: String(styleId) });
  const response = await fetch(`${engineUrl}/audio_query?${parameters}`, { method: 'POST' });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);

  const query = await response.json();
  applyKanaLearningProfile(query, clarityCase.kata);
  const mora = query.accent_phrases.flatMap(phrase => phrase.moras)[0];
  const scaledConsonantSeconds = mora.consonant_length / query.speedScale;
  const scaledVowelSeconds = mora.vowel_length / query.speedScale;

  if (mora.consonant !== clarityCase.consonant) {
    issues.push(`${clarityCase.kata}: expected ${clarityCase.consonant}, got ${mora.consonant}`);
  }
  if (scaledConsonantSeconds < clarityCase.minimumConsonantSeconds) {
    issues.push(`${clarityCase.kata}: consonant is ${scaledConsonantSeconds.toFixed(3)}s, expected at least ${clarityCase.minimumConsonantSeconds.toFixed(2)}s`);
  }
  if (scaledVowelSeconds < clarityCase.minimumVowelSeconds) {
    issues.push(`${clarityCase.kata}: vowel is ${scaledVowelSeconds.toFixed(3)}s, expected at least ${clarityCase.minimumVowelSeconds.toFixed(2)}s`);
  }
}

if (issues.length) {
  console.error(`Kana learning profile check failed with ${issues.length} issue(s).`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`Kana learning profile check passed: ${uColumn.length} u-column kana plus ${clarityCases.length} targeted kana are clear.`);
