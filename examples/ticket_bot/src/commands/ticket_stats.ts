import type { TicketParticipant } from "#/generated/prisma/client";
import { createCommand } from "arcscord";
import { prisma } from "#/utils/prisma";

/**
 * `/ticketstats` — per-participant message counts for a ticket.
 *
 * Works both inside and outside a ticket thread, so it deliberately does *not*
 * use InTicketMiddleware (which would cancel outside a thread). Instead:
 *  - if the `ticket` option is provided, it targets that ticket;
 *  - otherwise it falls back to the ticket of the current thread.
 *
 * The `ticket` option is an autocomplete field: as the user types, the handler
 * searches this guild's tickets and returns matching choices (value = ticket id).
 * Still gated by Manage Threads.
 */

/** Render one line per participant as `mention — count`. */
function buildParticipantList(participants: TicketParticipant[], title: string): string {
  const lines = participants.map(participant => `<@${participant.userId}> — ${participant.messageCount}`);
  return `**${title}**\n${lines.join("\n")}`;
}

export const ticketStatsCommand = createCommand({
  slash: {
    name: "ticketstats",
    nameLocalizations: t => t($ => $.ticket.commands.ticket_stats.name),
    description: "Show per-participant message counts for a ticket.",
    descriptionLocalizations: t => t($ => $.ticket.commands.ticket_stats.description),
    contexts: ["guild"],
    integrationTypes: ["guildInstall"],
    defaultMemberPermissions: "ManageThreads",
    options: {
      ticket: {
        type: "string",
        description: "Ticket to inspect (defaults to the current thread).",
        descriptionLocalizations: t => t($ => $.ticket.commands.ticket_stats.option_ticket_description),
        autocomplete: true,
        required: false,
      },
    },
  },
  preReply: "ephemeral",
  run: async (ctx) => {
    const guildId = ctx.interaction.guildId ?? undefined;

    // Resolve the target ticket: the picked option, else the current thread.
    let ticket = null;
    if (ctx.options.ticket) {
      const id = Number(ctx.options.ticket);
      if (!Number.isNaN(id)) {
        ticket = await prisma.ticket.findFirst({ where: { id, guildId } });
      }
    }
    else {
      ticket = await prisma.ticket.findFirst({
        where: { threadId: ctx.interaction.channelId ?? "" },
      });
    }

    if (!ticket) {
      return ctx.editReply(ctx.t($ => $.ticket.commands.ticket_stats.not_found));
    }

    const participants = await prisma.ticketParticipant.findMany({
      where: { ticketId: ticket.id },
      orderBy: { messageCount: "desc" },
    });
    if (participants.length === 0) {
      return ctx.editReply(ctx.t($ => $.ticket.commands.ticket_stats.empty));
    }

    const content = buildParticipantList(
      participants,
      ctx.t($ => $.ticket.commands.ticket_stats.title, { ticketId: ticket.id }),
    );

    // `parse: []` renders the mentions without pinging anyone.
    return ctx.editReply({ content, allowedMentions: { parse: [] } });
  },
  autocomplete: {
    ticket: async (ctx) => {
      const query = ctx.value.toLowerCase();
      const tickets = await prisma.ticket.findMany({
        where: { guildId: ctx.interaction.guildId ?? undefined },
        orderBy: { createdAt: "desc" },
        take: 25,
      });

      const choices = tickets
        .filter(ticket => query === "" || `${ticket.id} ${ticket.title}`.toLowerCase().includes(query))
        .slice(0, 25)
        .map(ticket => ({
          name: `#${ticket.id} • ${ticket.title} (${ticket.status})`.slice(0, 100),
          value: String(ticket.id),
        }));

      return ctx.sendChoices(choices);
    },
  },
});
