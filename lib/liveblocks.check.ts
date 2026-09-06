import assert from "node:assert";

import { colorForUserId } from "./liveblocks";

// Deterministic: same ID -> same color.
assert.equal(colorForUserId("user_abc"), colorForUserId("user_abc"));

// Always a palette hex value.
assert.match(colorForUserId("user_xyz"), /^#[0-9A-F]{6}$/);

// Spreads across the palette (not every ID collapses to one color).
const colors = new Set(
  Array.from({ length: 50 }, (_, i) => colorForUserId(`user_${i}`)),
);
assert.ok(colors.size > 3, `expected spread, got ${colors.size} distinct`);

console.log("colorForUserId ok");
