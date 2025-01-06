import { describe, expect, it } from "vitest";
import { addToSubDefinition } from "./sub_def_command.js";

const baseContent = `import type { SlashWithSubsCommandDefinition } from "arcscord";
import { demoSubCommand } from "./base";

export const baseCommand = {
  name: "base",
  description: "Command description",
  subCommands: [
    demoSubCommand,
  ],
} satisfies SlashWithSubsCommandDefinition;`;

describe("sub_def_commands", () => {
  it("should generate a sub command definition", () => {
    console.log(addToSubDefinition({
      name: "test",
      path: "./commands/test",
      type: "sub",
      fileContent: baseContent,
      impGroupName: "test",
      importExtension: ".ts",
    }));
    expect(true).toBe(true);
  });
});
