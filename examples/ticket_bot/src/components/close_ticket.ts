import { ComponentMemberPermissionMiddleware } from "@arcscord/middleware";
import { button, createButton } from "arcscord";
import { MessageFlags } from "discord.js";
import { InTicketComponentMiddleware } from "#/middleware/in_ticket";
import { manageThreadsMessage } from "#/utils/middleware_messages";
import { closeTicket } from "#/utils/ticket_actions";

/**
 * "Close the ticket" button shown on the ticket message.
 *
 * `route` is the stable id used to match incoming interactions; `build(id, label)`
 * produces the component (`id()` returns the encoded custom id). Slash commands
 * are gated by Discord's `defaultMemberPermissions`, but buttons are not, so two
 * middlewares run before `run`:
 *  - `ComponentMemberPermissionMiddleware` (from `@arcscord/middleware`) checks the
 *    clicking member has Manage Threads. It reads `interaction.memberPermissions`,
 *    which Discord computes for the thread from its parent channel — i.e. a
 *    parent-channel-level check that honours channel overwrites.
 *  - `InTicketComponentMiddleware` then resolves the thread's ticket as
 *    `ctx.additional.inTicket`, sharing the exact logic of the `/close` command.
 */
export const closeTicketButton = createButton({
  route: "close_ticket",
  use: [
    new ComponentMemberPermissionMiddleware(["ManageThreads"], manageThreadsMessage),
    new InTicketComponentMiddleware(),
  ],
  build: (id, label) =>
    button({
      label,
      style: "danger",
      customId: id(),
    }),
  run: async (ctx) => {
    // Provided by InTicketComponentMiddleware — guaranteed present here.
    const { ticketData, thread } = ctx.additional.inTicket;

    const result = await closeTicket({
      thread,
      ticket: ticketData,
      actorId: ctx.interaction.user.id,
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
