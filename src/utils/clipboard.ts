import { exec } from "child_process";
import os from "os";

/**
 * Copy text to system clipboard across macOS, Linux, and Windows.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const platform = os.platform();

  return new Promise((resolve) => {
    let proc;
    if (platform === "darwin") {
      proc = exec("pbcopy", (err) => resolve(!err));
    } else if (platform === "win32") {
      proc = exec("clip", (err) => resolve(!err));
    } else {
      // Linux: Try wl-copy then xclip
      proc = exec("wl-copy 2>/dev/null || xclip -selection clipboard 2>/dev/null || xsel --clipboard --input", (err) => {
        resolve(!err);
      });
    }

    if (proc.stdin) {
      proc.stdin.write(text);
      proc.stdin.end();
    } else {
      resolve(false);
    }
  });
}
