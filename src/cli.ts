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

async function resolveJSONInput(inputArg?: string): Promise<{ raw: string; label: string }> {
  if (inputArg) {
    const trimmed = inputArg.trim();
    // 1. Direct inline JSON check
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      return { raw: trimmed, label: "inline JSON" };
    }
    // 2. Existing file check
    if (fs.existsSync(inputArg)) {
      const raw = await fs.promises.readFile(inputArg, "utf-8");
      return { raw, label: inputArg };
    }
    // 3. Try parsing as generic JSON value (number, boolean, string)
    try {
      JSON.parse(trimmed);
      return { raw: trimmed, label: "inline JSON" };
    } catch {}

    throw new Error(`File not found or invalid inline JSON: ${inputArg}`);
  }

  // 4. Stdin fallback
  const stdinData = await readStdin();
  return { raw: stdinData, label: "stdin" };
}

async function main() {
  const program = new Command();

  program
    .name("json-term")
    .description("High-fidelity interactive terminal JSON viewer, collapsible tree explorer, type syntax highlighter, and structural diff tool.")
    .version("1.2.0", "-v, --version", "Output the current version")
    .argument("[input]", "JSON file path, inline JSON string, or piped stdin")
    .option("-p, --print", "Print formatted non-interactive output to stdout", false)
    .option("-F, --format <format>", "Output format: 'tree' or 'json'", "tree")
    .option("-r, --raw", "Print standard syntax-highlighted JSON (shorthand for --format json --print)", false)
    .option("-d, --depth <number>", "Initial tree expansion depth", (val) => parseInt(val, 10), 2)
    .option("-s, --search <query>", "Filter tree by key or value query")
    .action(async (inputArg, options) => {
      try {
        const { raw, label } = await resolveJSONInput(inputArg);

        if (!raw) {
          program.help();
          process.exit(1);
        }

        const data = parseJSON(raw, label);

        // If raw/json format requested, print colorized JSON directly
        if (options.raw || options.format === "json") {
          console.log(colorizeJSON(data));
          return;
        }

        const tree = buildTree(data, label, "$", 0, options.depth);

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
    .command("diff <inputA> [inputB]")
    .description("Structural JSON diff between files, inline JSON strings, or stdin")
    .option("-p, --print", "Print formatted non-interactive diff to stdout", false)
    .option("-d, --depth <number>", "Initial expansion depth", (val) => parseInt(val, 10), 3)
    .option("--no-unchanged", "Hide unchanged nodes from the diff view", false)
    .action(async (inputA, inputB, diffOptions) => {
      try {
        const itemA = await resolveJSONInput(inputA);
        if (!itemA.raw) {
          console.error(pc.red("Error: Please provide valid first JSON input (file or string)."));
          process.exit(1);
        }
        const dataA = parseJSON(itemA.raw, itemA.label);

        const itemB = await resolveJSONInput(inputB);
        if (!itemB.raw) {
          console.error(pc.red("Error: Please specify second JSON input (file, string, or piped stdin)."));
          process.exit(1);
        }
        const dataB = parseJSON(itemB.raw, itemB.label);

        const diffTree = diffJSON(dataA, dataB, `${itemA.label} ↔ ${itemB.label}`, "$", 0, diffOptions.depth);
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
