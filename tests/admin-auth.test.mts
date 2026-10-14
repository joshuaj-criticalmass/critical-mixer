import assert from "node:assert/strict";
import { test } from "node:test";
import { isValidAdminKey, secureEqual } from "../src/lib/admin-auth.ts";

test("admin key is rejected when no server secret is configured", () => {
  const previous = process.env.ADMIN_SECRET;
  delete process.env.ADMIN_SECRET;
  try {
    assert.equal(isValidAdminKey("anything"), false);
    assert.equal(isValidAdminKey(null), false);
  } finally {
    if (previous === undefined) delete process.env.ADMIN_SECRET;
    else process.env.ADMIN_SECRET = previous;
  }
});

test("admin key accepts only the exact configured secret", () => {
  const previous = process.env.ADMIN_SECRET;
  process.env.ADMIN_SECRET = "test-admin-secret";
  try {
    assert.equal(isValidAdminKey("test-admin-secret"), true);
    assert.equal(isValidAdminKey("wrong-secret"), false);
  } finally {
    if (previous === undefined) delete process.env.ADMIN_SECRET;
    else process.env.ADMIN_SECRET = previous;
  }
});

test("secureEqual rejects different values and lengths", () => {
  assert.equal(secureEqual("same", "same"), true);
  assert.equal(secureEqual("same", "diff"), false);
  assert.equal(secureEqual("short", "longer"), false);
});