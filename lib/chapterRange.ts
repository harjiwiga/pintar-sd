export function sliceTopicRange<T extends { id: string }>(
  topics: T[],
  fromId: string,
  toId: string
): T[] {
  const from = topics.findIndex((t) => t.id === fromId);
  const to = topics.findIndex((t) => t.id === toId);
  if (from < 0 || to < 0) return [];
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  return topics.slice(start, end + 1);
}

export function chapterNumber(topics: Array<{ id: string }>, topicId: string): number {
  return topics.findIndex((t) => t.id === topicId) + 1;
}

export function formatChapterOption(index: number, name: string): string {
  return `Bab ${index + 1} — ${name}`;
}

export function formatChapterScope(topics: Array<{ name: string }>, startNumber: number): string {
  if (topics.length === 0) return "";
  if (topics.length === 1) return `Bab ${startNumber} (${topics[0].name})`;
  const endNumber = startNumber + topics.length - 1;
  const names = topics.map((t) => t.name).join("; ");
  return `Bab ${startNumber}–${endNumber} (${names})`;
}

export function matchTopicId(
  topics: Array<{ id: string; name: string }>,
  hintedName?: string
): string | undefined {
  if (!hintedName) return topics[0]?.id;
  const needle = hintedName.toLowerCase().trim();
  const exact = topics.find((t) => t.name.toLowerCase() === needle);
  if (exact) return exact.id;
  const partial = topics.find(
    (t) => needle.includes(t.name.toLowerCase()) || t.name.toLowerCase().includes(needle)
  );
  return partial?.id ?? topics[0]?.id;
}
