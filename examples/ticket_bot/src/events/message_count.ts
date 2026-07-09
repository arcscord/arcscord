import { createEvent } from "arcscord";
import { prisma } from "#/utils/prisma";

/**
 * Counts messages per participant in ticket threads.
 *
 * For every human message sent in a thread that maps to a ticket, bump that
 * author's `messageCount`; `/ticketstats` reads these counters back. This is the
 * only feature that needs a gateway event, hence the `GuildMessages` intent
 * added in index.ts (message content is not needed — only author + channel).
 */
export const messageCountEvent = createEvent({
  event: "messageCreate",
  run: async (ctx, message) => {
    if (message.author.bot) {
      return ctx.ok("ignored bot message");
    }
    if (!message.channel.isThread()) {
      return ctx.ok("not a thread");
    }

    const ticket = await prisma.ticket.findFirst({
      where: { threadId: message.channelId },
    });
    if (!ticket) {
      return ctx.ok("not a ticket thread");
    }

    await prisma.ticketParticipant.upsert({
      where: { ticketId_userId: { ticketId: ticket.id, userId: message.author.id } },
      create: { ticketId: ticket.id, userId: message.author.id, messageCount: 1 },
      update: { messageCount: { increment: 1 } },
    });

    return ctx.ok(true);
  },
});
