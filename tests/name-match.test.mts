import assert from "node:assert/strict";
import { test } from "node:test";
import { findExactName, findSimilarNames, nameKey } from "../src/lib/name-match.ts";

const players = [
  { id: "a", name: "Michael Lee" },
  { id: "b", name: "Sarah O'Brien" },
  { id: "c", name: "José Álvarez" },
  { id: "d", name: "Jonathan Smith" },
  { id: "e", name: "Mia Leeds" },
];

test("name keys ignore case, accents, punctuation, and spacing", () => {
  assert.equal(nameKey("  José   ÁLVAREZ "), "jose alvarez");
  assert.equal(nameKey("Sarah O\u2019Brien"), "sarah obrien");
  assert.equal(nameKey("Mary-Jane Watson"), "mary jane watson");
});

test("exact matches find the same person typed differently", () => {
  assert.equal(findExactName("michael  LEE", players)?.id, "a");
  assert.equal(findExactName("Sarah OBrien", players)?.id, "b");
  assert.equal(findExactName("Jose Alvarez", players)?.id, "c");
  assert.equal(findExactName("Michael Leeson", players), null);
});

test("similar names suggest nicknames, typos, and middle-name differences", () => {
  assert.deepEqual(findSimilarNames("Mike Lee", players).map((p) => p.id), ["a"]);
  assert.deepEqual(findSimilarNames("Micheal Lee", players).map((p) => p.id), ["a"]);
  assert.deepEqual(findSimilarNames("Michael J Lee", players).map((p) => p.id), ["a"]);
  assert.deepEqual(findSimilarNames("Jon Smith", players).map((p) => p.id), ["d"]);
  assert.deepEqual(findSimilarNames("Sara O'Brian", players).map((p) => p.id), ["b"]);
});

test("unrelated and exact names are not suggested", () => {
  assert.deepEqual(findSimilarNames("Priya Patel", players), []);
  assert.deepEqual(findSimilarNames("Michael Lee", players), []);
  assert.equal(findSimilarNames("Mia Lee", players).some((p) => p.id === "a"), false);
});
