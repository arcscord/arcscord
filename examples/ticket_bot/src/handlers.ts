// Central registry of everything the client loads.
//
// `client.loadHandlers(handlers)` (in index.ts) reads this object, registers the
// commands with Discord and wires up the components/events. To add a feature,
// import its handler and drop it in the matching array — order does not matter.
import type { HandlersList } from "arcscord";
import { claimCommand } from "./commands/claim";
import { closeCommand } from "./commands/close";
import { pingCommand } from "./commands/ping";
import { reopenCommand } from "./commands/reopen";
import { setupCommand } from "./commands/setup";
import { statsCommand } from "./commands/stats";
import { ticketStatsCommand } from "./commands/ticket_stats";
import { claimTicketButton } from "./components/claim_ticket";
import { closeTicketButton } from "./components/close_ticket";
import { ticketOpenModal } from "./components/open_modal";
import { openTicketButton } from "./components/open_ticket";
import { pingButton } from "./components/ping_button";
import { reopenTicketButton } from "./components/reopen_ticket";
import { messageCountEvent } from "./events/message_count";

export default {
  // Slash / user / message commands.
  commands: [
    pingCommand,
    setupCommand,
    claimCommand,
    closeCommand,
    reopenCommand,
    statsCommand,
    ticketStatsCommand,
  ],
  // Interactive components, matched to incoming interactions by their `route`
  // (buttons, select menus, modals).
  components: [
    pingButton,
    claimTicketButton,
    closeTicketButton,
    openTicketButton,
    reopenTicketButton,
    ticketOpenModal,
  ],
  // Gateway event listeners.
  events: [
    messageCountEvent,
  ],
} satisfies HandlersList;
