import { describe, expect, it } from "vitest";
import { generatePackageJson } from "./package.js";

describe("packageJson function", () => {
  it("should generate a package.json with basic fields", () => {
    const options = { name: "test-package" };
    const result = JSON.parse(generatePackageJson(options));

    expect(result.name).toBe("test-package");
    expect(result.version).toBe("1.0.0");
    expect(result.description).toBe("A discord bot made with arcscord");
    expect(result.scripts).toEqual({
      start: "node -r @swc-node/register -r tsconfig-paths/register src/index.ts",
      dev: "npx nodemon --exec node -r @swc-node/register -r tsconfig-paths/register src/index.ts dev debug",
    });
    expect(result.dependencies).toHaveProperty("arcscord");
    expect(result.dependencies).toHaveProperty("discord.js");
    expect(result.devDependencies).toHaveProperty("@swc-node/core");
    expect(result.devDependencies).toHaveProperty("@swc-node/register");
    expect(result.devDependencies).toHaveProperty("@types/node");
    expect(result.devDependencies).toHaveProperty("dotenv");
    expect(result.devDependencies).toHaveProperty("nodemon");
    expect(result.devDependencies).toHaveProperty("tsc-alias");
    expect(result.devDependencies).toHaveProperty("tsconfig-paths");
    expect(result.devDependencies).toHaveProperty("typescript");
  });

  it("should include eslint configuration if eslint option is provided", () => {
    const options = { name: "test-package", eslint: "eslint" } as const;
    const result = JSON.parse(generatePackageJson(options));

    expect(result.scripts).toHaveProperty("lint");
    expect(result.scripts).toHaveProperty("lint:fix");
    expect(result.devDependencies).toHaveProperty("eslint");
    expect(result.devDependencies).toHaveProperty("@eslint/js");
    expect(result.devDependencies).toHaveProperty("typescript-eslint");
  });

  it("should include prettier configuration if prettier option is set to true", () => {
    const options = { name: "test-package", prettier: true };
    const result = JSON.parse(generatePackageJson(options));

    expect(result.scripts).toHaveProperty("prettier");
    expect(result.devDependencies).toHaveProperty("prettier");
  });

  it("should include i18next if i18n option is enabled", () => {
    const options = { name: "test-package", i18n: true };
    const result = JSON.parse(generatePackageJson(options));

    expect(result.dependencies).toHaveProperty("i18next");
  });
});
