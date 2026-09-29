import readline from "readline";
import pc from "picocolors";
import { TreeNode, DiffNode } from "./types.js";
import { formatKey, formatValue } from "./formatter.js";
import { copyToClipboard } from "./utils/clipboard.js";

type AnyNode = TreeNode | DiffNode;

interface FlatItem {
  node: AnyNode;
  depth: number;
  isDiff: boolean;
}

/**
 * Interactive Terminal Tree Explorer for JSON data and Diffs.
 */
export class InteractiveViewer {
  private root: AnyNode;
  private flatList: FlatItem[] = [];
  private selectedIndex = 0;
  private searchQuery = "";
  private isSearching = false;
  private searchInput = "";
  private notification = "";
  private notificationTimer: NodeJS.Timeout | null = null;
  private isDiff: boolean;

  constructor(root: AnyNode, isDiff = false) {
    this.root = root;
    this.isDiff = isDiff;
    this.rebuildFlatList();
  }

  private isDiffNode(node: AnyNode): node is DiffNode {
    return this.isDiff && "status" in node;
  }

  private rebuildFlatList(): void {
    const list: FlatItem[] = [];

    const traverse = (node: AnyNode, currentDepth: number) => {
      // If search query is active, filter matching nodes or their parents
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        const keyMatch = node.key && node.key.toLowerCase().includes(query);
        const pathMatch = node.path && node.path.toLowerCase().includes(query);
        const valMatch =
          "value" in node
            ? JSON.stringify(node.value).toLowerCase().includes(query)
            : "newValue" in node
            ? JSON.stringify(node.newValue).toLowerCase().includes(query)
            : false;

        if (!keyMatch && !pathMatch && !valMatch && (!node.children || node.children.length === 0)) {
          return;
        }
      }

      list.push({ node, depth: currentDepth, isDiff: this.isDiff });

      if (!node.collapsed && node.children && node.children.length > 0) {
        for (const child of node.children) {
          traverse(child, currentDepth + 1);
        }
      }
    };

    traverse(this.root, 0);
    this.flatList = list;

    if (this.selectedIndex >= this.flatList.length) {
      this.selectedIndex = Math.max(0, this.flatList.length - 1);
    }
  }

  private setNotification(msg: string): void {
    this.notification = msg;
    if (this.notificationTimer) clearTimeout(this.notificationTimer);
    this.notificationTimer = setTimeout(() => {
      this.notification = "";
      this.render();
    }, 2500);
  }

  private render(): void {
    const rows = process.stdout.rows || 24;
    const maxVisibleRows = Math.max(5, rows - 5);

    // Calculate window scroll offset
    let startIdx = 0;
    if (this.selectedIndex >= maxVisibleRows) {
      startIdx = this.selectedIndex - maxVisibleRows + 1;
    }
    const endIdx = Math.min(this.flatList.length, startIdx + maxVisibleRows);

    // Clear terminal screen
    process.stdout.write("\x1b[2J\x1b[3J\x1b[H\x1b[?25l"); // hide cursor

    // 1. Header Bar
    const title = this.isDiff ? " JSON Structural Diff Explorer " : " Interactive JSON Tree Explorer ";
    console.log(pc.bgCyan(pc.black(pc.bold(` ${title} `)) + pc.dim(` [Total items: ${this.flatList.length}]`)));

    // 2. Render visible items
    for (let i = startIdx; i < endIdx; i++) {
      const { node, depth } = this.flatList[i];
      const isSelected = i === this.selectedIndex;
      const indent = "  ".repeat(depth);

      let marker = "• ";
      if (node.children && node.children.length > 0) {
        marker = node.collapsed ? "▶ " : "▼ ";
      }

      let lineContent = "";

      if (this.isDiffNode(node)) {
        let diffPrefix = "  ";
        if (node.status === "added") diffPrefix = pc.green("+ ");
        else if (node.status === "removed") diffPrefix = pc.red("- ");
        else if (node.status === "modified") diffPrefix = pc.yellow("~ ");

        lineContent = diffPrefix + indent + marker;
        if (node.key) lineContent += formatKey(node.key) + pc.dim(": ");

        if (node.status === "added") {
          lineContent += pc.green(formatValue(node.newValue, 50));
        } else if (node.status === "removed") {
          lineContent += pc.red(formatValue(node.oldValue, 50));
        } else if (node.status === "modified") {
          if (node.type === "object" || node.type === "array") {
            lineContent += pc.yellow(`{ ${node.itemCount} modified }`);
          } else {
            lineContent += `${pc.red(formatValue(node.oldValue, 25))} -> ${pc.green(formatValue(node.newValue, 25))}`;
          }
        } else {
          lineContent += pc.dim(formatValue(node.newValue, 50));
        }
      } else {
        const treeNode = node as TreeNode;
        lineContent = indent + marker;
        if (treeNode.key) lineContent += formatKey(treeNode.key) + pc.dim(": ");

        if (treeNode.type === "object") {
          lineContent += pc.dim(`{ ${treeNode.itemCount} keys }`);
        } else if (treeNode.type === "array") {
          lineContent += pc.dim(`[ ${treeNode.itemCount} items ]`);
        } else {
          lineContent += formatValue(treeNode.value, 60);
        }
      }

      if (isSelected) {
        console.log(pc.bgBlue(pc.white(pc.bold(`> ${lineContent}`))));
      } else {
        console.log(`  ${lineContent}`);
      }
    }

    // 3. Status Bar & Footer
    const selectedItem = this.flatList[this.selectedIndex];
    const currentPath = selectedItem ? selectedItem.node.path : "$";

    console.log("\n" + pc.dim("─".repeat(Math.min(process.stdout.columns || 80, 80))));
    if (this.notification) {
      console.log(pc.green(pc.bold(` ${this.notification}`)));
    } else if (this.isSearching) {
      console.log(pc.yellow(pc.bold(` Search: /${this.searchInput}█`)));
    } else {
      console.log(pc.bold(pc.cyan(` Path: ${currentPath}`)));
      console.log(
        pc.dim(" [↑/↓] Move  [Enter/Space] Toggle  [e] Expand All  [c] Collapse All  [p] Copy Path  [y] Copy Val  [/] Search  [q] Exit")
      );
    }
  }

  private expandAll(node: AnyNode): void {
    node.collapsed = false;
    if (node.children) node.children.forEach((c) => this.expandAll(c));
  }

  private collapseAll(node: AnyNode): void {
    if (node.depth > 0) node.collapsed = true;
    if (node.children) node.children.forEach((c) => this.collapseAll(c));
  }

  public async start(): Promise<void> {
    if (!process.stdin.isTTY) {
      return;
    }

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    this.render();

    return new Promise((resolve) => {
      const onKeypress = async (str: string, key: readline.Key) => {
        if (this.isSearching) {
          if (key.name === "return") {
            this.searchQuery = this.searchInput;
            this.isSearching = false;
            this.rebuildFlatList();
            this.render();
            return;
          }
          if (key.name === "escape") {
            this.isSearching = false;
            this.searchInput = "";
            this.render();
            return;
          }
          if (key.name === "backspace") {
            this.searchInput = this.searchInput.slice(0, -1);
            this.render();
            return;
          }
          if (str && str.length === 1) {
            this.searchInput += str;
            this.render();
            return;
          }
        }

        // Navigation
        if (key.name === "up" || key.name === "k") {
          if (this.selectedIndex > 0) {
            this.selectedIndex--;
            this.render();
          }
        } else if (key.name === "down" || key.name === "j") {
          if (this.selectedIndex < this.flatList.length - 1) {
            this.selectedIndex++;
            this.render();
          }
        } else if (key.name === "return" || key.name === "space" || key.name === "right" || key.name === "left") {
          const item = this.flatList[this.selectedIndex];
          if (item && item.node.children && item.node.children.length > 0) {
            item.node.collapsed = !item.node.collapsed;
            this.rebuildFlatList();
            this.render();
          }
        } else if (str === "e" || str === "E") {
          this.expandAll(this.root);
          this.rebuildFlatList();
          this.render();
        } else if (str === "c" || str === "C") {
          this.collapseAll(this.root);
          this.rebuildFlatList();
          this.render();
        } else if (str === "p" || str === "P") {
          const item = this.flatList[this.selectedIndex];
          if (item) {
            await copyToClipboard(item.node.path);
            this.setNotification(`✔ Copied JSONPath: ${item.node.path}`);
          }
        } else if (str === "y" || str === "Y") {
          const item = this.flatList[this.selectedIndex];
          if (item) {
            const val = "value" in item.node ? item.node.value : (item.node as DiffNode).newValue;
            const textToCopy = typeof val === "object" ? JSON.stringify(val, null, 2) : String(val);
            await copyToClipboard(textToCopy);
            this.setNotification(`✔ Copied value to clipboard!`);
          }
        } else if (str === "/") {
          this.isSearching = true;
          this.searchInput = "";
          this.render();
        } else if (key.ctrl && key.name === "c" || key.name === "escape" || str === "q" || str === "Q") {
          // Cleanup & Exit
          process.stdin.removeListener("keypress", onKeypress);
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write("\x1b[?25h\n"); // show cursor
          resolve();
        }
      };

      process.stdin.on("keypress", onKeypress);
    });
  }
}
