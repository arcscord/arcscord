// Register your commands, components and events here.
import type { HandlersList } from "arcscord";
import { avatarCommand } from "./commands/avatar";
import { pingCommand } from "./commands/ping";
import { pingButton } from "./components/ping_button";
import { reactToArcscord } from "./events/react_to_arcscord";

export default {
  commands: [pingCommand, avatarCommand],
  components: [pingButton],
  events: [reactToArcscord],
} satisfies HandlersList;
