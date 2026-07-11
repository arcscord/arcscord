import { spawn } from "node:child_process";
import process from "node:process";

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const eslintArgs = ["--fix", ...process.argv.slice(2)];

const commands = [
  ["-r", "--parallel", "exec", "eslint", ".", ...eslintArgs],
  [
    "exec",
    "eslint",
    ".github",
    ".vscode",
    "scripts",
    "test/compat/bun-consumer",
    "*.{js,cjs,mjs,ts,mts,json,jsonc,yaml,yml,md}",
    "--no-error-on-unmatched-pattern",
    ...eslintArgs,
  ],
];

const exitCodes = await Promise.all(commands.map(args => new Promise((resolve, reject) => {
  const child = spawn(pnpm, args, { stdio: "inherit" });

  child.on("error", reject);
  child.on("exit", code => resolve(code ?? 1));
})));

process.exitCode = exitCodes.find(code => code !== 0) ?? 0;
