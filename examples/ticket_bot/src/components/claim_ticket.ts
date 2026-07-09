import { ComponentMemberPermissionMiddleware } from "@arcscord/middleware";
import { button, createButton } from "arcscord";
import { MessageFlags } from "discord.js";
import { InTicketComponentMiddleware } from "#/middleware/in_ticket";
import { manageThreadsMessage } from "#/utils/middleware_messages";
import { claimTicket } from "#/utils/ticket_actions";

/**
 * "Claim the ticket" button. Same pattern as close_ticket.ts: a Manage Threads
 * permission guard (from `@arcscord/middleware`) then the component middleware
 * that provides the ticket via `ctx.additional.inTicket`, then the shared
 * `claimTicket` helper.
 */
export const claimTicketButton = createButton({
  route: "claim_ticket",
  use: [
    new ComponentMemberPermissionMiddleware(["ManageThreads"], manageThreadsMessage),
    new InTicketComponentMiddleware(),
  ],
  build: (id, label) =>
    button({
      label,
      style: "primary",
      customId: id(),
    }),
  run: async (ctx) => {
    // Provided by InTicketComponentMiddleware — guaranteed present here.
    const { ticketData, thread } = ctx.additional.inTicket;

    const result = await claimTicket({
      thread,
      ticket: ticketData,
      actorId: ctx.interaction.user.id,
      t: ctx.t,
    });

    if (!result.ok) {
      if (result.reason === "already_claimed") {
        return ctx.reply(
          ctx.t($ => $.ticket.commands.claim.errors.already_claimed, {
            userMention: `<@${result.claimedById}>`,
          }),
          { flags: MessageFlags.Ephemeral },
        );
      }
      return ctx.reply(ctx.t($ => $.ticket.commands.claim.errors.already_closed), {
        flags: MessageFlags.Ephemeral,
      });
    }

    return ctx.reply(ctx.t($ => $.ticket.commands.claim.success), {
      flags: MessageFlags.Ephemeral,
    });
  },
});
