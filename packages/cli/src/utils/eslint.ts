import { execSync } from "node:child_process";

export function eslintFix(root: string): void {
  execSync(`npx eslint --fix ${root}`);
}
