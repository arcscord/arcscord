import { describe, expect, it } from "vitest";
import { addHandlerToList } from "./handler_list.js";

const defaultFileContent = `// AUTO GENERATED FILE AND AUTO UPDATED WITH CLI
import type { HandlersList } from "arcscord";
export default {
  commands: [],
  components: [],
  events: [],
  tasks: [],
} satisfies HandlersList;`;

describe("handler_list", () => {
  it("should add a command to the list", () => {
    const result = addHandlerToList({
      name: "test",
      path: "./commands/test",
      type: "commands",
      fileContent: defaultFileContent,
      importExtension: "",
    });

    expect(result).toBe(`// AUTO GENERATED FILE AND AUTO UPDATED WITH CLI
import type { HandlersList } from "arcscord";
import { test } from "./commands/test";
export default {
  commands: [test],
  components: [],
  events: [],
  tasks: []
} satisfies HandlersList;`);
  });
  it("should add a component to the list", () => {
    const result = addHandlerToList({
      name: "test",
      path: "./components/test",
      type: "components",
      fileContent: defaultFileContent,
      importExtension: "",
    });

    expect(result).toBe(`// AUTO GENERATED FILE AND AUTO UPDATED WITH CLI
import type { HandlersList } from "arcscord";
import { test } from "./components/test";
export default {
  commands: [],
  components: [test],
  events: [],
  tasks: []
} satisfies HandlersList;`);
  });
  it("should add an event to the list", () => {
    const result = addHandlerToList({
      name: "test",
      path: "./events/test",
      type: "events",
      fileContent: defaultFileContent,
      importExtension: "",
    });

    expect(result).toBe(`// AUTO GENERATED FILE AND AUTO UPDATED WITH CLI
import type { HandlersList } from "arcscord";
import { test } from "./events/test";
export default {
  commands: [],
  components: [],
  events: [test],
  tasks: []
} satisfies HandlersList;`);
  });
  it("should add a task to the list", () => {
    const result = addHandlerToList({
      name: "test",
      path: "./tasks/test",
      type: "tasks",
      fileContent: defaultFileContent,
      importExtension: "",
    });

    expect(result).toBe(`// AUTO GENERATED FILE AND AUTO UPDATED WITH CLI
import type { HandlersList } from "arcscord";
import { test } from "./tasks/test";
export default {
  commands: [],
  components: [],
  events: [],
  tasks: [test]
} satisfies HandlersList;`);
  });
  it("should add a command and a component to the list", () => {
    const result1 = addHandlerToList({
      name: "testCommand",
      path: "./commands/test",
      type: "commands",
      fileContent: defaultFileContent,
      importExtension: "",
    });

    const result2 = addHandlerToList({
      name: "testComponent",
      path: "./components/test",
      type: "components",
      fileContent: result1,
      importExtension: "",
    });

    expect(result2).toBe(`// AUTO GENERATED FILE AND AUTO UPDATED WITH CLI
import type { HandlersList } from "arcscord";
import { testCommand } from "./commands/test";
import { testComponent } from "./components/test";
export default {
  commands: [testCommand],
  components: [testComponent],
  events: [],
  tasks: []
} satisfies HandlersList;`);
  });
  it("should add a command with good import", () => {
    const result = addHandlerToList({
      name: "test",
      path: "./commands/test",
      type: "commands",
      fileContent: defaultFileContent,
      importExtension: ".ts",
    });

    expect(result).toBe(`// AUTO GENERATED FILE AND AUTO UPDATED WITH CLI
import type { HandlersList } from "arcscord";
import { test } from "./commands/test.ts";
export default {
  commands: [test],
  components: [],
  events: [],
  tasks: []
} satisfies HandlersList;`);
  });
});
