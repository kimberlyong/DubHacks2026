// Grading for typed answers. Deliberately forgiving: the point is recall, not spelling.
const normalize = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

// Close enough: identical, or within one typo (two for longer words).
function closeEnough(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const allowed = b.length > 8 ? 2 : b.length > 4 ? 1 : 0;
  return editDistance(a, b) <= allowed;
}

export function gradeTyped(question, input) {
  const given = normalize(input);
  if (!given) return false;
  if (closeEnough(given, normalize(question.answer))) return true;

  const keywords = (question.keywords ?? []).map(normalize).filter(Boolean);
  if (keywords.length === 0) return false;
  const givenWords = given.split(" ");
  const hits = keywords.filter(
    (k) => given.includes(k) || givenWords.some((w) => closeEnough(w, k)),
  ).length;
  return hits >= Math.ceil(keywords.length / 2);
}
