import { createCommand } from "arcscord";
import { MessageFlags } from "discord.js";
import { InTicketMiddleware } from "#/middleware/in_ticket";
import { reopenTicket } from "#/utils/ticket_actions";

/**
 * `/reopen` — reopen a closed ticket in the current thread.
 *
 * Same middleware pattern as `/claim`; delegates to the shared `reopenTicket`
 * helper, which is also invoked by the "Reopen" button posted on close.
 */
export const reopenCommand = createCommand({
  slash: {
    name: "reopen",
    nameLocalizations: t => t($ => $.ticket.commands.reopen.name),
    description: "Reopen the ticket in the current thread.",
    descriptionLocalizations: t => t($ => $.ticket.commands.reopen.description),
    contexts: ["guild"],
    integrationTypes: ["guildInstall"],
    defaultMemberPermissions: "ManageThreads",
  },
  use: [new InTicketMiddleware()],
  run: async (ctx) => {
    // Provided by InTicketMiddleware — guaranteed present here.
    const { ticketData, thread } = ctx.additional.inTicket;

    const result = await reopenTicket({
      thread,
      ticket: ticketData,
      actorId: ctx.interaction.user.id,
      t: ctx.t,
    });

    if (!result.ok) {
      return ctx.reply(ctx.t($ => $.ticket.commands.reopen.errors.not_closed), {
        flags: MessageFlags.Ephemeral,
      });
    }

    return ctx.reply(ctx.t($ => $.ticket.commands.reopen.success), {
      flags: MessageFlags.Ephemeral,
    });
  },
});
