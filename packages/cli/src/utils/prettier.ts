import { execFileSync } from "node:child_process";

export function prettierFix(root: string): void {
  execFileSync("npx", ["prettier", "--write", root], { stdio: "inherit" });
}

export function prettierFixMultiples(files: string[]): void {
  execFileSync("npx", ["prettier", "--write", ...files], { stdio: "inherit" });
}
