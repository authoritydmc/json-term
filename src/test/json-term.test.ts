import test from "node:test";
import assert from "node:assert";
import {
  getValueType,
  formatValue,
  buildTree,
  prettyPrintTree,
  diffJSON,
  calculateDiffStats,
  prettyPrintDiff,
  copyToClipboard,
} from "../index.js";

test("getValueType identifies all JSON primitives and structures", () => {
  assert.strictEqual(getValueType("hello"), "string");
  assert.strictEqual(getValueType(123), "number");
  assert.strictEqual(getValueType(true), "boolean");
  assert.strictEqual(getValueType(null), "null");
  assert.strictEqual(getValueType([1, 2, 3]), "array");
  assert.strictEqual(getValueType({ a: 1 }), "object");
});

test("buildTree constructs nested tree structure with accurate metadata", () => {
  const data = {
    user: {
      name: "Alice",
      age: 30,
      skills: ["typescript", "node"],
    },
    active: true,
  };

  const tree = buildTree(data, "root", "$", 0, 2);
  assert.strictEqual(tree.type, "object");
  assert.strictEqual(tree.itemCount, 2);
  assert.ok(tree.children && tree.children.length === 2);

  const userNode = tree.children.find((c) => c.key === "user")!;
  assert.strictEqual(userNode.type, "object");
  assert.strictEqual(userNode.path, "user");
  assert.strictEqual(userNode.itemCount, 3);
});

test("prettyPrintTree formats tree with keys and color tags", () => {
  const tree = buildTree({ title: "Test", count: 42 }, "config", "$", 0, 5);
  const output = prettyPrintTree(tree);
  assert.ok(output.includes("title"));
  assert.ok(output.includes("Test"));
  assert.ok(output.includes("42"));
});

test("diffJSON detects added, removed, modified, and unchanged fields", () => {
  const oldData = {
    name: "Alpha",
    port: 3000,
    tags: ["prod", "us-east"],
    deprecated: true,
  };

  const newData = {
    name: "Alpha Prime",
    port: 3000,
    tags: ["prod", "us-west"],
    newFeature: true,
  };

  const diffTree = diffJSON(oldData, newData, "appConfig");
  assert.strictEqual(diffTree.type, "object");

  const stats = calculateDiffStats(diffTree);
  assert.ok(stats.added >= 1);     // newFeature added
  assert.ok(stats.removed >= 1);   // deprecated removed
  assert.ok(stats.modified >= 1);  // name and tags modified
  assert.ok(stats.unchanged >= 1); // port unchanged
});

test("prettyPrintDiff outputs color-coded additions and deletions", () => {
  const oldData = { status: "pending" };
  const newData = { status: "active", version: 2 };

  const diffTree = diffJSON(oldData, newData);
  const output = prettyPrintDiff(diffTree);
  assert.ok(output.includes("status"));
  assert.ok(output.includes("version"));
});

test("copyToClipboard is exported as callable async function", () => {
  assert.strictEqual(typeof copyToClipboard, "function");
});
