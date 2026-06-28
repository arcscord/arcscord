// Register your commands, components and events here.
import type { HandlersList } from "arcscord";
import { pingCommand } from "./commands/ping";
import { pingButton } from "./components/ping_button";

export default {
  commands: [pingCommand],
  components: [pingButton],
  events: [],
} satisfies HandlersList;
