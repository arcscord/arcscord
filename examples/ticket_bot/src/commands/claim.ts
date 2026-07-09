import { createCommand } from "arcscord";
import { MessageFlags } from "discord.js";
import { InTicketMiddleware } from "#/middleware/in_ticket";
import { claimTicket } from "#/utils/ticket_actions";

/**
 * `/claim` — take charge of the ticket in the current thread.
 *
 * Demonstrates a command middleware: `use: [new InTicketMiddleware()]` runs
 * before `run`, resolves the thread's ticket, and exposes it (typed) as
 * `ctx.additional.inTicket`. If the command is used outside a ticket thread the
 * middleware cancels it, so `run` can assume a valid ticket. The actual state
 * change is delegated to the shared `claimTicket` helper (also used by the
 * button) so button and command behave identically.
 */
export const claimCommand = createCommand({
  slash: {
    name: "claim",
    nameLocalizations: t => t($ => $.ticket.commands.claim.name),
    description: "Claim the ticket in the current thread.",
    descriptionLocalizations: t => t($ => $.ticket.commands.claim.description),
    contexts: ["guild"],
    integrationTypes: ["guildInstall"],
    defaultMemberPermissions: "ManageThreads",
  },
  use: [new InTicketMiddleware()],
  run: async (ctx) => {
    // Provided by InTicketMiddleware — guaranteed present here.
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
