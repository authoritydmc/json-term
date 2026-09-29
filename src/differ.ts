import pc from "picocolors";
import { DiffNode, DiffStatus, JSONValueType } from "./types.js";
import { getValueType, formatValue, formatKey } from "./formatter.js";

export interface DiffStats {
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
}

/**
 * Compare two JSON values structurally and return a recursive DiffNode tree.
 */
export function diffJSON(
  a: any,
  b: any,
  key?: string,
  path = "$",
  depth = 0,
  maxInitialDepth = 3
): DiffNode {
  const typeA = getValueType(a);
  const typeB = getValueType(b);
  const id = `${path}-${key || "diff"}-${depth}`;
  const collapsed = depth >= maxInitialDepth;

  // Case 1: Value added (a is undefined, b exists)
  if (a === undefined && b !== undefined) {
    const node: DiffNode = {
      id,
      key,
      path,
      depth,
      status: "added",
      newValue: b,
      type: typeB,
      collapsed: false,
    };
    if (typeB === "object" && b !== null) {
      node.itemCount = Object.keys(b).length;
      node.children = Object.keys(b).map((k) =>
        diffJSON(undefined, b[k], k, path === "$" ? k : `${path}.${k}`, depth + 1, maxInitialDepth)
      );
    } else if (typeB === "array") {
      node.itemCount = b.length;
      node.children = b.map((item: any, idx: number) =>
        diffJSON(undefined, item, `[${idx}]`, `${path}[${idx}]`, depth + 1, maxInitialDepth)
      );
    }
    return node;
  }

  // Case 2: Value removed (a exists, b is undefined)
  if (a !== undefined && b === undefined) {
    const node: DiffNode = {
      id,
      key,
      path,
      depth,
      status: "removed",
      oldValue: a,
      type: typeA,
      collapsed: false,
    };
    if (typeA === "object" && a !== null) {
      node.itemCount = Object.keys(a).length;
      node.children = Object.keys(a).map((k) =>
        diffJSON(a[k], undefined, k, path === "$" ? k : `${path}.${k}`, depth + 1, maxInitialDepth)
      );
    } else if (typeA === "array") {
      node.itemCount = a.length;
      node.children = a.map((item: any, idx: number) =>
        diffJSON(item, undefined, `[${idx}]`, `${path}[${idx}]`, depth + 1, maxInitialDepth)
      );
    }
    return node;
  }

  // Case 3: Type changed (e.g. from string to number or object to array)
  if (typeA !== typeB) {
    return {
      id,
      key,
      path,
      depth,
      status: "modified",
      oldValue: a,
      newValue: b,
      type: typeB,
      collapsed: false,
    };
  }

  // Case 4: Both are Objects
  if (typeA === "object" && a !== null && b !== null) {
    const allKeys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)]));
    const children: DiffNode[] = [];
    let hasModifications = false;

    for (const k of allKeys) {
      const child = diffJSON(
        a[k],
        b[k],
        k,
        path === "$" ? k : `${path}.${k}`,
        depth + 1,
        maxInitialDepth
      );
      if (child.status !== "unchanged") hasModifications = true;
      children.push(child);
    }

    return {
      id,
      key,
      path,
      depth,
      status: hasModifications ? "modified" : "unchanged",
      oldValue: a,
      newValue: b,
      type: "object",
      itemCount: allKeys.length,
      collapsed,
      children,
    };
  }

  // Case 5: Both are Arrays
  if (typeA === "array") {
    const maxLen = Math.max(a.length, b.length);
    const children: DiffNode[] = [];
    let hasModifications = false;

    for (let i = 0; i < maxLen; i++) {
      const child = diffJSON(
        a[i],
        b[i],
        `[${i}]`,
        `${path}[${i}]`,
        depth + 1,
        maxInitialDepth
      );
      if (child.status !== "unchanged") hasModifications = true;
      children.push(child);
    }

    return {
      id,
      key,
      path,
      depth,
      status: hasModifications ? "modified" : "unchanged",
      oldValue: a,
      newValue: b,
      type: "array",
      itemCount: maxLen,
      collapsed,
      children,
    };
  }

  // Case 6: Primitive values comparison
  if (a !== b) {
    return {
      id,
      key,
      path,
      depth,
      status: "modified",
      oldValue: a,
      newValue: b,
      type: typeB,
      collapsed: false,
    };
  }

  // Unchanged primitive
  return {
    id,
    key,
    path,
    depth,
    status: "unchanged",
    oldValue: a,
    newValue: b,
    type: typeA,
    collapsed,
  };
}

/**
 * Calculate summary metrics for the diff.
 */
export function calculateDiffStats(node: DiffNode): DiffStats {
  const stats: DiffStats = { added: 0, removed: 0, modified: 0, unchanged: 0 };

  function traverse(n: DiffNode) {
    if (n.children && n.children.length > 0) {
      n.children.forEach(traverse);
    } else {
      stats[n.status]++;
    }
  }

  traverse(node);
  return stats;
}

/**
 * Pretty-print structural diff to terminal string.
 */
export function prettyPrintDiff(
  node: DiffNode,
  options: { showUnchanged?: boolean } = {},
  indent = "",
  isLast = true
): string {
  const showUnchanged = options.showUnchanged ?? true;

  if (!showUnchanged && node.status === "unchanged" && (!node.children || node.children.length === 0)) {
    return "";
  }

  const isRoot = node.depth === 0;
  let prefix = "  ";
  let statusColor = pc.dim;

  if (node.status === "added") {
    prefix = pc.green("+ ");
    statusColor = pc.green;
  } else if (node.status === "removed") {
    prefix = pc.red("- ");
    statusColor = pc.red;
  } else if (node.status === "modified") {
    prefix = pc.yellow("~ ");
    statusColor = pc.yellow;
  }

  let line = prefix;
  if (!isRoot) {
    const branch = isLast ? "└── " : "├── ";
    line += pc.dim(indent + branch);
    if (node.key) {
      line += formatKey(node.key) + pc.dim(": ");
    }
  } else {
    line += node.key ? formatKey(node.key) + pc.dim(": ") : pc.bold("diff: ");
  }

  if (node.status === "added") {
    line += statusColor(formatValue(node.newValue));
  } else if (node.status === "removed") {
    line += statusColor(formatValue(node.oldValue));
  } else if (node.status === "modified") {
    if (node.type === "object" || node.type === "array") {
      line += statusColor(`{ ${node.itemCount} items modified }`);
    } else {
      line += `${pc.red(formatValue(node.oldValue))} ${pc.dim("->")} ${pc.green(formatValue(node.newValue))}`;
    }
  } else {
    // Unchanged
    line += pc.dim(formatValue(node.newValue));
  }

  const lines = [line];

  if (!node.collapsed && node.children && node.children.length > 0) {
    const nextIndent = isRoot ? "" : indent + (isLast ? "    " : "│   ");
    node.children.forEach((child, index) => {
      const childIsLast = index === node.children!.length - 1;
      const childStr = prettyPrintDiff(child, options, nextIndent, childIsLast);
      if (childStr) lines.push(childStr);
    });
  }

  return lines.join("\n");
}
