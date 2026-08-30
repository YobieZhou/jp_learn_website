export function parseLessonFilter(value = '') {
  return new Set(
    String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map(Number)
      .filter(Number.isInteger)
  );
}
