import { execSync } from "node:child_process";

export function prettierFix(root: string): void {
  execSync(`npx prettier --write ${root}`);
}
