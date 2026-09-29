import pc from "picocolors";
import { JSONValueType, TreeNode } from "./types.js";

/**
 * Determine the JSON value type.
 */
export function getValueType(value: any): JSONValueType {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return "array";
  const t = typeof value;
  if (t === "object") return "object";
  if (t === "string") return "string";
  if (t === "number") return "number";
  if (t === "boolean") return "boolean";
  return "string";
}

/**
 * Colorize and format a single JSON value according to its type.
 */
export function formatValue(value: any, truncateLen = 80): string {
  const type = getValueType(value);

  switch (type) {
    case "string": {
      const str = JSON.stringify(value);
      const truncated = str.length > truncateLen ? str.slice(0, truncateLen - 3) + '..."' : str;
      return pc.green(truncated);
    }
    case "number":
      return pc.yellow(String(value));
    case "boolean":
      return pc.magenta(String(value));
    case "null":
      return pc.dim("null");
    case "array":
      return pc.dim(`[${value.length} items]`);
    case "object":
      return pc.dim(`{${Object.keys(value).length} keys}`);
    default:
      return String(value);
  }
}

/**
 * Format an object key with bold coloring.
 */
export function formatKey(key: string): string {
  return pc.bold(pc.cyan(key));
}

/**
 * Build a flat or nested TreeNode hierarchy from any JavaScript/JSON data.
 */
export function buildTree(
  data: any,
  key?: string,
  path = "$",
  depth = 0,
  maxInitialDepth = 2,
  parentId?: string
): TreeNode {
  const type = getValueType(data);
  const id = `${path}-${key || "root"}-${depth}`;
  const collapsed = depth >= maxInitialDepth;

  const node: TreeNode = {
    id,
    key,
    value: data,
    type,
    depth,
    path,
    collapsed,
    parentId,
  };

  if (type === "object" && data !== null) {
    const keys = Object.keys(data);
    node.itemCount = keys.length;
    node.children = keys.map((k) =>
      buildTree(
        data[k],
        k,
        path === "$" ? k : `${path}.${k}`,
        depth + 1,
        maxInitialDepth,
        id
      )
    );
  } else if (type === "array") {
    node.itemCount = data.length;
    node.children = data.map((item: any, idx: number) =>
      buildTree(
        item,
        `[${idx}]`,
        `${path}[${idx}]`,
        depth + 1,
        maxInitialDepth,
        id
      )
    );
  }

  return node;
}

/**
 * Pretty-print JSON tree structure to terminal string.
 */
export function prettyPrintTree(node: TreeNode, indent = "", isLast = true): string {
  const isRoot = node.depth === 0;
  const marker = node.type === "object" || node.type === "array" ? (node.collapsed ? pc.cyan("▶ ") : pc.cyan("▼ ")) : pc.dim("• ");

  let line = "";
  if (!isRoot) {
    const branch = isLast ? "└── " : "├── ";
    line += pc.dim(indent + branch) + marker;
    if (node.key) {
      line += formatKey(node.key) + pc.dim(": ");
    }
  } else {
    line += marker + (node.key ? formatKey(node.key) + pc.dim(": ") : pc.bold(pc.white("root: ")));
  }

  if (node.type === "object") {
    line += pc.dim(`{ ${node.itemCount} keys }`);
  } else if (node.type === "array") {
    line += pc.dim(`[ ${node.itemCount} items ]`);
  } else {
    line += formatValue(node.value);
  }

  const lines = [line];

  if (!node.collapsed && node.children && node.children.length > 0) {
    const nextIndent = isRoot ? "" : indent + (isLast ? "    " : "│   ");
    node.children.forEach((child, index) => {
      const childIsLast = index === node.children!.length - 1;
      lines.push(prettyPrintTree(child, nextIndent, childIsLast));
    });
  }

  return lines.join("\n");
}

/**
 * Colorize and format standard JSON structure with bold keys and typed syntax highlighting.
 */
export function colorizeJSON(data: any, space = 2): string {
  const jsonStr = typeof data === "string" ? data : JSON.stringify(data, null, space);
  if (!jsonStr) return "";

  return jsonStr.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      // Object key with trailing colon
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          const keyName = match.slice(0, -1);
          return pc.bold(pc.cyan(keyName)) + pc.dim(":");
        }
        // String value
        return pc.green(match);
      }
      // Boolean value
      if (/true|false/.test(match)) {
        return pc.magenta(match);
      }
      // Null value
      if (/null/.test(match)) {
        return pc.dim(match);
      }
      // Number value
      return pc.yellow(match);
    }
  );
}

