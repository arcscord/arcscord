// Central registry of everything the client loads.
//
// `client.loadHandlers(handlers)` (in index.ts) reads this object and registers
// the commands with Discord. To add a new command/component/event, import it and
// add it to the matching array.
import type { HandlersList } from "arcscord";
import { avatarCommand } from "./commands/avatar";
import { pingCommand } from "./commands/ping";
import { pingButton } from "./components/ping_button";
import { reactToArcscord } from "./events/react_to_arcscord";

export default {
  // Slash / user / message commands.
  commands: [pingCommand, avatarCommand],
  // Buttons, select menus and modals.
  components: [pingButton],
  // Wrapped Discord.js gateway event listeners.
  events: [reactToArcscord],
} satisfies HandlersList;
