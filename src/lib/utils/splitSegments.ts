export function splitIntoSegments(
  text: string,
  wordsPerChunk = 500,
  overlap = 50
): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const segments: string[] = [];
  const step = wordsPerChunk - overlap;

  for (let i = 0; i < words.length; i += step) {
    const chunk = words.slice(i, i + wordsPerChunk).join(" ");
    if (chunk.trim().length > 0) {
      segments.push(chunk);
    }
    if (i + wordsPerChunk >= words.length) break;
  }

  return segments;
}
