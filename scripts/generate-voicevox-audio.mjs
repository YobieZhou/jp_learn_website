import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(projectRoot, 'script.js');
const outputDirectory = path.join(projectRoot, 'assets', 'audio', 'kana');
const engineUrl = (process.env.VOICEVOX_ENGINE_URL || 'http://127.0.0.1:50121').replace(/\/$/, '');
const styleId = Number(process.env.VOICEVOX_STYLE_ID || 10005);

const source = await readFile(sourcePath, 'utf8');
const entries = [...source.matchAll(/kana\('([^']+)',\s*'([^']+)'/g)]
  .map(([, hira, kata]) => ({ hira, kata }))
  .filter((entry, index, values) => values.findIndex(candidate => candidate.kata === entry.kata) === index);

if (entries.length !== 104) {
  throw new Error(`Expected 104 kana entries, found ${entries.length}.`);
}

await mkdir(outputDirectory, { recursive: true });

function audioFileName(kata) {
  return `${[...kata].map(character => character.codePointAt(0).toString(16)).join('-')}.wav`;
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  return response.json();
}

for (const [index, entry] of entries.entries()) {
  const parameters = new URLSearchParams({ text: entry.kata, speaker: String(styleId) });
  const query = await requestJson(`${engineUrl}/audio_query?${parameters}`, { method: 'POST' });
  Object.assign(query, {
    speedScale: 0.88,
    pitchScale: 0,
    intonationScale: 1,
    volumeScale: 1,
    prePhonemeLength: 0.08,
    postPhonemeLength: 0.1,
    outputSamplingRate: 24000,
    outputStereo: false
  });

  const response = await fetch(`${engineUrl}/synthesis?speaker=${styleId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query)
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);

  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.length < 44 || audio.toString('ascii', 0, 4) !== 'RIFF') {
    throw new Error(`Invalid WAV returned for ${entry.hira} / ${entry.kata}.`);
  }

  await writeFile(path.join(outputDirectory, audioFileName(entry.kata)), audio);
  process.stdout.write(`\rGenerated ${String(index + 1).padStart(3, ' ')}/${entries.length}: ${entry.hira} ${entry.kata}`);
}

process.stdout.write(`\nSaved ${entries.length} VOICEVOX Nemo files to ${outputDirectory}\n`);
