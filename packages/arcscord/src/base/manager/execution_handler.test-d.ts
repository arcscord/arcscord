import type { CommandManagerOptions } from "#/manager/command/command_manager.type";
import type { ComponentManagerOptions } from "#/manager/component/component_manager.type";
import type { EventManagerOptions } from "#/manager/event/event_manager.type";
import { it } from "vitest";

it("makes legacy and execution handlers mutually exclusive", () => {
  const commandOptions: CommandManagerOptions = {
    executionHandlers: [],
  };
  const componentOptions: ComponentManagerOptions = {
    executionHandlers: [],
  };
  const eventOptions: EventManagerOptions = {
    executionHandlers: [],
  };

  void commandOptions;
  void componentOptions;
  void eventOptions;

  // @ts-expect-error resultHandler and executionHandlers are mutually exclusive.
  const invalidCommand: CommandManagerOptions = {
    executionHandlers: [],
    resultHandler: () => {},
  };
  // @ts-expect-error resultHandler and executionHandlers are mutually exclusive.
  const invalidComponent: ComponentManagerOptions = {
    executionHandlers: [],
    resultHandler: () => {},
  };
  // @ts-expect-error resultHandler and executionHandlers are mutually exclusive.
  const invalidEvent: EventManagerOptions = {
    executionHandlers: [],
    resultHandler: () => {},
  };

  void invalidCommand;
  void invalidComponent;
  void invalidEvent;
});
