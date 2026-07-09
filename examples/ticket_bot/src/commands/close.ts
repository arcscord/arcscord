import { createCommand } from "arcscord";
import { MessageFlags } from "discord.js";
import { InTicketMiddleware } from "#/middleware/in_ticket";
import { closeTicket } from "#/utils/ticket_actions";

/**
 * `/close [reason]` — close the ticket in the current thread.
 *
 * Same middleware pattern as `/claim`, plus an optional string option. The
 * `reason` option is read from `ctx.options.reason` (typed `string | null` since
 * it is not required) and forwarded to the shared `closeTicket` helper.
 */
export const closeCommand = createCommand({
  slash: {
    name: "close",
    nameLocalizations: t => t($ => $.ticket.commands.close.name),
    description: "Close the ticket in the current thread.",
    descriptionLocalizations: t => t($ => $.ticket.commands.close.description),
    contexts: ["guild"],
    integrationTypes: ["guildInstall"],
    defaultMemberPermissions: "ManageThreads",
    // Optional free-text reason, surfaced in the close announcement and stored
    // on the ticket / audit event.
    options: {
      reason: {
        type: "string",
        description: "Reason for closing the ticket.",
        descriptionLocalizations: t => t($ => $.ticket.commands.close.option_reason_description),
        required: false,
      },
    },
  },
  use: [new InTicketMiddleware()],
  run: async (ctx) => {
    // Provided by InTicketMiddleware — guaranteed present here.
    const { ticketData, thread } = ctx.additional.inTicket;

    const result = await closeTicket({
      thread,
      ticket: ticketData,
      actorId: ctx.interaction.user.id,
      // Normalize the option's `null` (absent) to `undefined` for the helper.
      reason: ctx.options.reason ?? undefined,
      t: ctx.t,
    });

    if (!result.ok) {
      return ctx.reply(ctx.t($ => $.ticket.commands.close.errors.already_closed), {
        flags: MessageFlags.Ephemeral,
      });
    }

    return ctx.reply(ctx.t($ => $.ticket.commands.close.success), {
      flags: MessageFlags.Ephemeral,
    });
  },
});
