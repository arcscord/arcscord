import { access, readdir, rm } from "node:fs/promises";
import process from "node:process";

import { isMainModule } from "../shared/cli.mts";

const rootDirectory = new URL("../../", import.meta.url);
const removableOptions = { recursive: true, force: true } as const;

async function containsPackageManifest(directory: URL): Promise<boolean> {
  return access(new URL("package.json", directory)).then(() => true, () => false);
}

async function findPackageDirectories(directory: URL): Promise<URL[]> {
  if (await containsPackageManifest(directory))
    return [directory];

  const entries = await readdir(directory, { withFileTypes: true });
  const childDirectories = entries
    .filter(entry => entry.isDirectory() && entry.name !== "node_modules")
    .map(entry => new URL(`${entry.name}/`, directory));

  return (await Promise.all(childDirectories.map(findPackageDirectories))).flat();
}

async function workspaceDirectories(): Promise<URL[]> {
  const packageDirectories = await Promise.all([
    findPackageDirectories(new URL("packages/", rootDirectory)),
    findPackageDirectories(new URL("test/", rootDirectory)),
  ]);

  return [...packageDirectories.flat(), new URL("website/", rootDirectory)];
}

export async function cleanWorkspaces(dependencies = false): Promise<void> {
  const workspaces = await workspaceDirectories();
  const paths = workspaces.map(workspace => new URL("dist/", workspace));

  paths.push(
    new URL("website/build/", rootDirectory),
    new URL("website/.docusaurus/", rootDirectory),
  );

  if (dependencies) {
    paths.push(
      new URL("node_modules/", rootDirectory),
      ...workspaces.map(workspace => new URL("node_modules/", workspace)),
    );
  }

  await Promise.all(paths.map(path => rm(path, removableOptions)));
}

if (isMainModule(import.meta.url)) {
  const allowedArguments = new Set(["--dependencies"]);
  const unknownArguments = process.argv.slice(2).filter(argument => !allowedArguments.has(argument));
  if (unknownArguments.length > 0)
    throw new Error(`Unknown clean option: ${unknownArguments.join(", ")}.`);

  await cleanWorkspaces(process.argv.includes("--dependencies"));
}
