import { copyFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (!sourceRoot) throw new Error('Usage: node scripts/import-kanjivg-kana.mjs <kanjivg-repository>');

const sourceDirectory = path.join(sourceRoot, 'kanji');
const targetDirectory = path.join(projectRoot, 'assets', 'strokes', 'kana');
const scriptSource = await readFile(path.join(projectRoot, 'script.js'), 'utf8');
const kanaPairPattern = /kana\('([^']+)',\s*'([^']+)'/g;
const files = new Set();

for (const match of scriptSource.matchAll(kanaPairPattern)) {
  for (const character of [...match[1], ...match[2]]) {
    files.add(`${character.codePointAt(0).toString(16).padStart(5, '0')}.svg`);
  }
}

if (files.size === 0) throw new Error('No kana definitions were found in script.js.');
await mkdir(targetDirectory, { recursive: true });
await Promise.all([...files].map(file => copyFile(path.join(sourceDirectory, file), path.join(targetDirectory, file))));
await copyFile(path.join(sourceRoot, 'COPYING'), path.join(targetDirectory, 'COPYING'));

console.log(`Imported ${files.size} unmodified KanjiVG kana SVG files.`);
