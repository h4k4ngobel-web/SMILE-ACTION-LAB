import { lineBetween, makeWordGrid, WORDS } from "./GameModesLogic";

test.each([
  ["EMPATI", 0, 0, 0, 5],
  ["PIKR", 2, 1, 5, 1],
  ["KARIER", 4, 3, 4, 8],
  ["SEHAT", 5, 4, 9, 8],
  ["KELUARGA", 1, 9, 8, 9],
])("word-search board contains a selectable %s path", (word, startRow, startCol, endRow, endCol) => {
  const grid = makeWordGrid();
  const path = lineBetween(startRow * 10 + startCol, endRow * 10 + endCol);
  const letters = path.map((index) => grid[index]).join("");

  expect(WORDS).toContain(word);
  expect([word, word.split("").reverse().join("")]).toContain(letters);
});
