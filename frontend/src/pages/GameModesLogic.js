export const WORDS = ["EMPATI", "PIKR", "KARIER", "SEHAT", "KELUARGA"];
export const SIZE = 10;

export function makeWordGrid() {
  const cells = Array.from({ length: SIZE * SIZE }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26)));
  const placements = [
    ["EMPATI", 0, 0, 0, 1],
    ["PIKR", 2, 1, 1, 0],
    ["KARIER", 4, 3, 0, 1],
    ["SEHAT", 5, 4, 1, 1],
    ["KELUARGA", 1, 9, 1, 0],
  ];
  placements.forEach(([word, row, col, dr, dc]) => {
    [...word].forEach((letter, i) => { cells[(row + dr * i) * SIZE + col + dc * i] = letter; });
  });
  return cells;
}

export function lineBetween(start, end) {
  const sr = Math.floor(start / SIZE), sc = start % SIZE;
  const er = Math.floor(end / SIZE), ec = end % SIZE;
  const dr = Math.sign(er - sr), dc = Math.sign(ec - sc);
  const steps = Math.max(Math.abs(er - sr), Math.abs(ec - sc));
  if (steps === 0 || !((sr === er) || (sc === ec) || Math.abs(er - sr) === Math.abs(ec - sc))) return [];
  return Array.from({ length: steps + 1 }, (_, i) => (sr + dr * i) * SIZE + sc + dc * i);
}
