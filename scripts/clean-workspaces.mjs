import { access, readdir, rm } from "node:fs/promises";

const rootDir = new URL("../", import.meta.url);
const removableOptions = { recursive: true, force: true };

async function findPackageDirectories(directory) {
  const packageJson = new URL("package.json", directory);

  if (await access(packageJson).then(() => true, () => false)) {
    return [directory];
  }

  const entries = await readdir(directory, { withFileTypes: true });
  const childDirectories = entries
    .filter(entry => entry.isDirectory() && entry.name !== "node_modules")
    .map(entry => new URL(`${entry.name}/`, directory));

  return (await Promise.all(childDirectories.map(findPackageDirectories))).flat();
}

async function workspaceDirectories() {
  const packageDirectories = await Promise.all([
    findPackageDirectories(new URL("packages/", rootDir)),
    findPackageDirectories(new URL("test/", rootDir)),
  ]);

  return [...packageDirectories.flat(), new URL("website/", rootDir)];
}

export async function cleanWorkspaces({ dependencies = false } = {}) {
  const workspaces = await workspaceDirectories();
  const paths = workspaces.map(workspace => new URL("dist/", workspace));

  paths.push(new URL("website/build/", rootDir), new URL("website/.docusaurus/", rootDir));

  if (dependencies) {
    paths.push(
      new URL("node_modules/", rootDir),
      ...workspaces.map(workspace => new URL("node_modules/", workspace)),
    );
  }

  await Promise.all(paths.map(path => rm(path, removableOptions)));
}
