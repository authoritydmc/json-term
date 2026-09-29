import { Command } from "commander";
import fs from "fs";
import pc from "picocolors";
import { buildTree, prettyPrintTree, colorizeJSON } from "./formatter.js";
import { diffJSON, prettyPrintDiff, calculateDiffStats } from "./differ.js";
import { InteractiveViewer } from "./interactive.js";

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    if (process.stdin.isTTY) {
      resolve("");
      return;
    }

    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      resolve(data.trim());
    });
    setTimeout(() => {
      if (!data) resolve("");
    }, 100);
  });
}

function parseJSON(raw: string, label = "Input"): any {
  try {
    return JSON.parse(raw);
  } catch (err: any) {
    throw new Error(`Invalid JSON in ${label}: ${err.message}`);
  }
}

async function main() {
  const program = new Command();

  program
    .name("json-term")
    .description("High-fidelity interactive terminal JSON viewer, collapsible tree explorer, type syntax highlighter, and structural diff tool.")
    .version("1.1.0", "-v, --version", "Output the current version")
    .argument("[file]", "JSON file to view or compare")
    .option("-p, --print", "Print formatted non-interactive output to stdout", false)
    .option("-F, --format <format>", "Output format: 'tree' or 'json'", "tree")
    .option("-r, --raw", "Print standard syntax-highlighted JSON (shorthand for --format json --print)", false)
    .option("-d, --depth <number>", "Initial tree expansion depth", (val) => parseInt(val, 10), 2)
    .option("-s, --search <query>", "Filter tree by key or value query")
    .action(async (fileArg, options) => {
      try {
        let raw = "";
        if (fileArg) {
          if (!fs.existsSync(fileArg)) {
            console.error(pc.red(`Error: File not found: ${fileArg}`));
            process.exit(1);
          }
          raw = await fs.promises.readFile(fileArg, "utf-8");
        } else {
          raw = await readStdin();
        }

        if (!raw) {
          program.help();
          process.exit(1);
        }

        const data = parseJSON(raw, fileArg || "stdin");

        // If raw/json format requested, print colorized JSON directly
        if (options.raw || options.format === "json") {
          console.log(colorizeJSON(data));
          return;
        }

        const tree = buildTree(data, fileArg || "root", "$", 0, options.depth);

        if (options.print || !process.stdin.isTTY) {
          console.log(prettyPrintTree(tree));
        } else {
          const viewer = new InteractiveViewer(tree, false);
          await viewer.start();
        }
      } catch (err: any) {
        console.error(pc.red(`Error: ${err.message || err}`));
        process.exit(1);
      }
    });

  // Diff subcommand
  program
    .command("diff <fileA> [fileB]")
    .description("Structural JSON diff between two files or stdin")
    .option("-p, --print", "Print formatted non-interactive diff to stdout", false)
    .option("-d, --depth <number>", "Initial expansion depth", (val) => parseInt(val, 10), 3)
    .option("--no-unchanged", "Hide unchanged nodes from the diff view", false)
    .action(async (fileA, fileB, diffOptions) => {
      try {
        if (!fs.existsSync(fileA)) {
          console.error(pc.red(`Error: File not found: ${fileA}`));
          process.exit(1);
        }
        const rawA = await fs.promises.readFile(fileA, "utf-8");
        const dataA = parseJSON(rawA, fileA);

        let dataB: any;
        if (fileB) {
          if (!fs.existsSync(fileB)) {
            console.error(pc.red(`Error: File not found: ${fileB}`));
            process.exit(1);
          }
          const rawB = await fs.promises.readFile(fileB, "utf-8");
          dataB = parseJSON(rawB, fileB);
        } else {
          const stdinData = await readStdin();
          if (!stdinData) {
            console.error(pc.red("Error: Please specify second file or pipe JSON via stdin."));
            process.exit(1);
          }
          dataB = parseJSON(stdinData, "stdin");
        }

        const diffTree = diffJSON(dataA, dataB, `${fileA} ↔ ${fileB || "stdin"}`, "$", 0, diffOptions.depth);
        const stats = calculateDiffStats(diffTree);

        if (diffOptions.print || !process.stdin.isTTY) {
          console.log(
            pc.bold(
              `Diff Stats: ${pc.green(`+${stats.added}`)} ${pc.red(`-${stats.removed}`)} ${pc.yellow(`~${stats.modified}`)} ${pc.dim(`=${stats.unchanged}`)}\n`
            )
          );
          console.log(prettyPrintDiff(diffTree, { showUnchanged: diffOptions.unchanged }));
        } else {
          const viewer = new InteractiveViewer(diffTree, true);
          await viewer.start();
        }
      } catch (err: any) {
        console.error(pc.red(`Error: ${err.message || err}`));
        process.exit(1);
      }
    });

  await program.parseAsync(process.argv);
}

main().catch((err) => {
  console.error(pc.red(`Error: ${err.message || err}`));
  process.exit(1);
});
