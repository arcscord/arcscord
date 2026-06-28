import { execFileSync } from "node:child_process";

export function eslintFix(root: string): void {
  execFileSync("npx", ["eslint", "--fix", root], { stdio: "inherit" });
}

export function eslintFixMultiples(files: string[]): void {
  execFileSync("npx", ["eslint", "--fix", ...files], { stdio: "inherit" });
}
