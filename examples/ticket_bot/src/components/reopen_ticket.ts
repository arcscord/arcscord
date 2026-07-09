import { ComponentMemberPermissionMiddleware } from "@arcscord/middleware";
import { button, createButton } from "arcscord";
import { MessageFlags } from "discord.js";
import { InTicketComponentMiddleware } from "#/middleware/in_ticket";
import { manageThreadsMessage } from "#/utils/middleware_messages";
import { reopenTicket } from "#/utils/ticket_actions";

/**
 * "Reopen the ticket" button, posted by the close announcement. Same pattern as
 * the other ticket buttons: a Manage Threads permission guard (from
 * `@arcscord/middleware`) then the component middleware that provides the ticket,
 * then the shared `reopenTicket` helper.
 */
export const reopenTicketButton = createButton({
  route: "reopen_ticket",
  use: [
    new ComponentMemberPermissionMiddleware(["ManageThreads"], manageThreadsMessage),
    new InTicketComponentMiddleware(),
  ],
  build: (id, label) =>
    button({
      label,
      style: "success",
      customId: id(),
    }),
  run: async (ctx) => {
    // Provided by InTicketComponentMiddleware — guaranteed present here.
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
