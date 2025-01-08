import { describe, expect, it } from "vitest";
import { addToSubDefinition } from "./sub_def_command.js";

const baseContentWithoutSubsCommands = `import type { SlashWithSubsCommandDefinition } from "arcscord";
import { demoSubCommand } from "./base";
import { demo2SubCommand } from "./base2";
export const baseCommand = {
  name: "base",
  description: "Command description",
  subCommandGroup: {
    example: {
      description: "Example sub command group",
      subCommands: [demo2SubCommand]
    }
  }
} satisfies SlashWithSubsCommandDefinition;`;

const baseContentWithEmptyGroup = `import type { SlashWithSubsCommandDefinition } from "arcscord";
import { demoSubCommand } from "./base";
import { demo2SubCommand } from "./base2";
export const baseCommand = {
  name: "base",
  description: "Command description",
  subCommands: [demoSubCommand],
  subCommandGroup: {
  }
} satisfies SlashWithSubsCommandDefinition;`;

const baseContentWithNothing = `import type { SlashWithSubsCommandDefinition } from "arcscord";
import { demoSubCommand } from "./base";
import { demo2SubCommand } from "./base2";
export const baseCommand = {
  name: "base",
  description: "Command description",
  subCommands: [demoSubCommand],
  subCommandGroup: {
    example: {
      description: "Example sub command group",
      subCommands: [demo2SubCommand]
    }
  }
} satisfies SlashWithSubsCommandDefinition;`;

const baseInvalidPropertyType = `import type { SlashWithSubsCommandDefinition } from "arcscord";
import { demoSubCommand } from "./base";
import { demo2SubCommand } from "./base2";
export const baseCommand = {
  name: "base",
  description: "Command description",
  subCommands: 3,
} satisfies SlashWithSubsCommandDefinition;`;

describe("sub_def_commands", () => {
  it("should add a sub command to subCommands array", () => {
    const options = {
      name: "newSubCommand",
      path: "./newSubCommand",
      type: "sub" as const,
      fileContent: baseContentWithNothing,
      importExtension: ".js",
    };

    const result = addToSubDefinition(options);
    expect(result).toContain("import { newSubCommand } from \"./newSubCommand.js\";");
    expect(result).toContain("subCommands: [demoSubCommand, newSubCommand]");
  });

  it("should add a sub command to an existing subCommandGroup", () => {
    const options = {
      name: "newSubCommand",
      path: "./newSubCommand",
      type: "sub" as const,
      fileContent: baseContentWithoutSubsCommands,
      impGroupName: "example",
      importExtension: ".js",
    };

    const result = addToSubDefinition(options);
    expect(result).toContain("import { newSubCommand } from \"./newSubCommand.js\";");
    expect(result).toContain("subCommands: [demo2SubCommand, newSubCommand]");
  });

  it("should create a new subCommandGroup and add a sub command", () => {
    const options = {
      name: "newSubCommand",
      path: "./newSubCommand",
      type: "sub" as const,
      fileContent: baseContentWithEmptyGroup,
      impGroupName: "newGroup",
      importExtension: ".js",
    };

    const result = addToSubDefinition(options);
    expect(result).toContain("import { newSubCommand } from \"./newSubCommand.js\";");
    expect(result).toContain("subCommandGroup: {");
    expect(result).toContain("newGroup: {");
    expect(result).toContain("subCommands: [newSubCommand]");
  });

  it("should throw an error if no satisfies expression is found", () => {
    const options = {
      name: "newSubCommand",
      path: "./newSubCommand",
      type: "sub" as const,
      fileContent: "export const invalidCommand = {};",
      importExtension: ".js",
    };

    expect(() => addToSubDefinition(options)).toThrow("No satisfies expression found");
  });

  it("should throw an error if a property have wrong type", () => {
    const options = {
      name: "newSubCommand",
      path: "./newSubCommand",
      type: "sub" as const,
      fileContent: baseInvalidPropertyType,
      importExtension: ".js",
    };

    expect(() => addToSubDefinition(options)).toThrow("Found subCommands property in object but it was not a ArrayExpression");
  });
});
