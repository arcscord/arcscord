import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("adds local tarballs without losing existing dependency overrides", () => {
  const workspace = mkdtempSync(join(tmpdir(), "arcscord-example-overrides-"));
  try {
    const example = join(workspace, "starter-bot");
    const vendor = join(workspace, "vendor packages");
    mkdirSync(example);
    writeFileSync(join(workspace, "pnpm-workspace.yaml"), "packages: ['starter-bot']\noverrides:\n  katex@^0.16.0: 0.18.10\n");
    writeFileSync(join(example, "package.json"), JSON.stringify({ dependencies: { arcscord: "^1.2.0" } }));

    const script = fileURLToPath(new URL("./link-local-packages.mts", import.meta.url));
    execFileSync(process.execPath, [script, example, vendor]);

    const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
    const result = execFileSync(pnpm, ["config", "get", "--location=project", "--json", "overrides"], {
      cwd: workspace,
      encoding: "utf8",
    });
    expect(JSON.parse(result)).toEqual({
      "@arcscord/components": `file:${join(vendor, "components.tgz")}`,
      "@arcscord/error": `file:${join(vendor, "error.tgz")}`,
      "arcscord": `file:${join(vendor, "arcscord.tgz")}`,
      "katex@^0.16.0": "0.18.10",
    });
  }
  finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});
