import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(projectRoot, 'script.js');
const audioDirectory = path.join(projectRoot, 'assets', 'audio', 'kana');
const minimumDurationSeconds = Number(process.env.KANA_MIN_DURATION_SECONDS || 0.52);
const maximumDurationSeconds = Number(process.env.KANA_MAX_DURATION_SECONDS || 1.0);

function audioFileName(kata) {
  return `${[...kata].map(character => character.codePointAt(0).toString(16)).join('-')}.wav`;
}

function readWavMetadata(audio, fileName) {
  if (audio.length < 44 || audio.toString('ascii', 0, 4) !== 'RIFF' || audio.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`${fileName}: invalid RIFF/WAVE header`);
  }

  let format;
  let dataLength;
  for (let offset = 12; offset + 8 <= audio.length;) {
    const chunkId = audio.toString('ascii', offset, offset + 4);
    const chunkLength = audio.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    if (chunkStart + chunkLength > audio.length) throw new Error(`${fileName}: truncated ${chunkId} chunk`);

    if (chunkId === 'fmt ') {
      format = {
        audioFormat: audio.readUInt16LE(chunkStart),
        channels: audio.readUInt16LE(chunkStart + 2),
        sampleRate: audio.readUInt32LE(chunkStart + 4),
        byteRate: audio.readUInt32LE(chunkStart + 8),
        bitsPerSample: audio.readUInt16LE(chunkStart + 14)
      };
    } else if (chunkId === 'data') {
      dataLength = chunkLength;
    }

    offset = chunkStart + chunkLength + (chunkLength % 2);
  }

  if (!format || dataLength === undefined) throw new Error(`${fileName}: missing fmt or data chunk`);
  return { ...format, duration: dataLength / format.byteRate };
}

const source = await readFile(sourcePath, 'utf8');
const entries = [...source.matchAll(/kana\('([^']+)',\s*'([^']+)'/g)]
  .map(([, hira, kata]) => ({ hira, kata, fileName: audioFileName(kata) }))
  .filter((entry, index, values) => values.findIndex(candidate => candidate.kata === entry.kata) === index);

if (entries.length !== 104) throw new Error(`Expected 104 kana entries, found ${entries.length}.`);

const actualFiles = (await readdir(audioDirectory)).filter(fileName => fileName.endsWith('.wav')).sort();
const expectedFiles = entries.map(entry => entry.fileName).sort();
const issues = [];

for (const fileName of expectedFiles.filter(fileName => !actualFiles.includes(fileName))) issues.push(`${fileName}: missing`);
for (const fileName of actualFiles.filter(fileName => !expectedFiles.includes(fileName))) issues.push(`${fileName}: unexpected`);

const results = [];
for (const entry of entries) {
  if (!actualFiles.includes(entry.fileName)) continue;
  try {
    const metadata = readWavMetadata(await readFile(path.join(audioDirectory, entry.fileName)), entry.fileName);
    results.push({ ...entry, ...metadata });
    if (metadata.audioFormat !== 1 || metadata.channels !== 1 || metadata.sampleRate !== 24000 || metadata.bitsPerSample !== 16) {
      issues.push(`${entry.hira}/${entry.kata}: expected 24 kHz mono 16-bit PCM`);
    }
    if (metadata.duration < minimumDurationSeconds) {
      issues.push(`${entry.hira}/${entry.kata}: ${metadata.duration.toFixed(3)}s is shorter than ${minimumDurationSeconds.toFixed(2)}s`);
    }
    if (metadata.duration > maximumDurationSeconds) {
      issues.push(`${entry.hira}/${entry.kata}: ${metadata.duration.toFixed(3)}s is longer than ${maximumDurationSeconds.toFixed(2)}s`);
    }
  } catch (error) {
    issues.push(error.message);
  }
}

const sorted = results.toSorted((left, right) => left.duration - right.duration);
if (issues.length) {
  console.error(`Kana audio check failed with ${issues.length} issue(s).`);
  for (const issue of issues) console.error(`- ${issue}`);
  if (sorted.length) console.error(`Shortest: ${sorted[0].hira}/${sorted[0].kata} ${sorted[0].duration.toFixed(3)}s`);
  process.exit(1);
}

console.log(`Kana audio check passed: ${results.length} files, ${sorted[0].duration.toFixed(3)}s–${sorted.at(-1).duration.toFixed(3)}s.`);
