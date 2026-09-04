import { readingLessonNotes } from './reading-notes-data.mjs';
import {
  readingAudioLessons,
  readingDiscIntro as generatedDiscIntro
} from './reading-transcript-data.mjs';

const annotationPattern = /([々〆ヵヶ一-龯]+)\[([^\]]+)\]/g;
const rubyPattern = /｜([^《]+)《([^》]+)》/g;

export function plainReadingText(markup) {
  return String(markup)
    .replace(rubyPattern, '$1')
    .replace(annotationPattern, '$1');
}

const notesByLesson = new Map(readingLessonNotes.map((lesson) => [lesson.id, lesson]));

export const readingLessons = Object.freeze(readingAudioLessons.map((audioLesson) => {
  const notes = notesByLesson.get(audioLesson.id);
  if (!notes) throw new Error(`Missing learning notes for lesson ${audioLesson.id}.`);

  const sentences = audioLesson.tracks.flatMap((track) => track.lines.map((line) => ({
    ...line,
    speaker: `MP3 ${String(track.number).padStart(2, '0')} · ${track.section}`,
    zh: ''
  })));

  return Object.freeze({
    ...notes,
    level: 'N5',
    ready: true,
    source: '大家的日语第二版初级1 · 配套光盘原声',
    tracks: audioLesson.tracks,
    sentences
  });
}));

export const readingDiscIntro = Object.freeze({
  ...generatedDiscIntro,
  title: '光盘说明'
});

export const readingCatalogSummary = Object.freeze({
  level: 'N5',
  total: readingLessons.length,
  ready: readingLessons.filter((lesson) => lesson.ready).length,
  tracks: readingLessons.reduce((total, lesson) => total + lesson.tracks.length, 0),
  sentences: readingLessons.reduce((total, lesson) => total + lesson.sentences.length, 0),
  duration: readingLessons.reduce(
    (total, lesson) => total + lesson.tracks.reduce((lessonTotal, track) => lessonTotal + track.duration, 0),
    0
  )
});
