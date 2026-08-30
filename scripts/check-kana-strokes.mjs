import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scriptSource = await readFile(path.join(projectRoot, 'script.js'), 'utf8');
const strokeDirectory = path.join(projectRoot, 'assets', 'strokes', 'kana');
const kanaPairPattern = /kana\('([^']+)',\s*'([^']+)'/g;
const expectedFiles = new Map();

for (const match of scriptSource.matchAll(kanaPairPattern)) {
  for (const character of [...match[1], ...match[2]]) {
    const stem = character.codePointAt(0).toString(16).padStart(5, '0');
    expectedFiles.set(`${stem}.svg`, { character, stem });
  }
}

if (expectedFiles.size === 0) throw new Error('No kana definitions were found in script.js.');

const actualFiles = (await readdir(strokeDirectory)).filter(file => file.endsWith('.svg')).sort();
const missing = [...expectedFiles.keys()].filter(file => !actualFiles.includes(file));
const unexpected = actualFiles.filter(file => !expectedFiles.has(file));
if (missing.length) throw new Error(`Missing stroke SVG files: ${missing.join(', ')}`);
if (unexpected.length) throw new Error(`Unexpected stroke SVG files: ${unexpected.join(', ')}`);

let totalStrokes = 0;
for (const [file, { character, stem }] of expectedFiles) {
  const source = await readFile(path.join(strokeDirectory, file), 'utf8');
  if (!source.includes('Creative Commons') || !source.includes('Attribution-Share Alike 3.0')) {
    throw new Error(`${file} does not retain the KanjiVG license notice.`);
  }
  const strokeNumbers = [...source.matchAll(new RegExp(`id="kvg:${stem}-s(\\d+)"`, 'g'))]
    .map(match => Number(match[1]));
  if (strokeNumbers.length === 0) throw new Error(`${file} (${character}) contains no stroke paths.`);
  strokeNumbers.forEach((number, index) => {
    if (number !== index + 1) throw new Error(`${file} (${character}) has a non-sequential stroke id: s${number}.`);
  });
  totalStrokes += strokeNumbers.length;
}

const copying = await readFile(path.join(strokeDirectory, 'COPYING'), 'utf8');
if (!copying.includes('Attribution, ShareAlike')) throw new Error('KanjiVG COPYING is missing or invalid.');

console.log(`Kana stroke check passed: ${expectedFiles.size} SVG files, ${totalStrokes} stroke paths.`);
