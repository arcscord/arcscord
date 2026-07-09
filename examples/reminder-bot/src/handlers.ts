// Central registry of everything the client loads.
//
// `client.loadHandlers(handlers)` (in index.ts) reads this object and registers
// the commands with Discord. To add a new command/component/event, import it and
// add it to the matching array.
import type { HandlersList } from "arcscord";
import { reminderCommand } from "./commands/reminder";

export default {
  // Slash / user / message commands.
  commands: [reminderCommand],
  // This example has no buttons, select menus or modals.
  components: [],
  // No gateway event listener is needed: reminders are checked by the scheduler.
  events: [],
} satisfies HandlersList;
