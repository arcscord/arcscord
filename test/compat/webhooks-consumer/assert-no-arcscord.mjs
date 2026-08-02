import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

async function main() {
  const packageEntry = fileURLToPath(import.meta.resolve("@arcscord/webhooks"));
  const packageRoot = path.resolve(path.dirname(packageEntry), "../..");
  const packageJson = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));

  if (packageJson.dependencies?.arcscord) {
    throw new Error("packed webhooks declares Arcscord as a runtime dependency");
  }
  if (packageJson.peerDependenciesMeta?.arcscord?.optional !== true) {
    throw new Error("packed webhooks does not mark its Arcscord peer optional");
  }

  const files = [];
  async function collect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await collect(entryPath);
      }
      else {
        files.push(entryPath);
      }
    }
  }

  await collect(path.join(packageRoot, "dist"));
  for (const file of files) {
    const source = await readFile(file, "utf8");
    if (/['"]arcscord(?:\/[^'"]*)?['"]/.test(source)) {
      throw new Error(`packed output still references Arcscord: ${path.relative(packageRoot, file)}`);
    }
  }

  try {
    await access(path.join(process.cwd(), "node_modules", "arcscord"));
    throw new Error("standalone consumer unexpectedly installed Arcscord");
  }
  catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      process.stdout.write("standalone consumer has no Arcscord installation\n");
    }
    else {
      throw error;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
