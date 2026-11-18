import test from "node:test";
import assert from "node:assert/strict";
import { messageSchema, safeText } from "../src/validation.js";

test("validates a support message payload", () => {
  const result = messageSchema.safeParse({
    merchant: "Example Store",
    productName: "Headphones",
    amount: "2499",
    currency: "INR"
  });
  assert.equal(result.success, true);
  assert.equal(result.data.amount, 2499);
});

test("rejects negative amounts", () => {
  const result = messageSchema.safeParse({
    merchant: "Example Store",
    productName: "Headphones",
    amount: -100
  });
  assert.equal(result.success, false);
});

test("safeText strips angle brackets and truncates", () => {
  assert.equal(safeText("<hello>", 5), "hello");
});
