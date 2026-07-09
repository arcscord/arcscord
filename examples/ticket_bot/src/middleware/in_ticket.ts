import type {
  ArcClient,
  CommandContext,
  CommandMiddlewareRun,
  ComponentContext,
  ComponentMiddlewareRun,
} from "arcscord";
import type { AnyThreadChannel } from "discord.js";
import type { Ticket } from "#/generated/prisma/client";
import { CommandMiddleware, ComponentMiddleware } from "arcscord";
import { MessageFlags } from "discord.js";
import { prisma } from "#/utils/prisma";

type TicketInfos = {
  ticketData: Ticket;
  thread: AnyThreadChannel;
};

/**
 * Shared resolver: look up the ticket bound to a channel and make sure that
 * channel is a thread. Returns `null` when the interaction is not in a ticket
 * thread. Used by both middlewares below so command and component share the
 * exact same rule.
 */
async function resolveTicket(
  client: ArcClient,
  channelId: string | null,
): Promise<TicketInfos | null> {
  if (!channelId) {
    return null;
  }

  const ticketData = await prisma.ticket.findFirst({
    where: { threadId: channelId },
  });

  const thread = await client.channels.fetch(channelId);

  if (!ticketData || !thread || !thread.isThread()) {
    return null;
  }

  return { ticketData, thread };
}

/**
 * Command middleware: resolves the current thread's ticket and exposes it as
 * `ctx.additional.inTicket`. Cancels the command with an ephemeral reply when it
 * is used outside of a ticket thread, so `run` can assume a valid ticket.
 */
export class InTicketMiddleware extends CommandMiddleware {
  // `name` becomes the key under `ctx.additional`, so the payload of `next()`
  // below is exposed to the command as `ctx.additional.inTicket`.
  readonly name = "inTicket" as const;

  async run(ctx: CommandContext): Promise<CommandMiddlewareRun<TicketInfos>> {
    const infos = await resolveTicket(ctx.client, ctx.interaction.channelId);

    if (!infos) {
      // `cancel` stops the pipeline: the command's `run` never executes and the
      // reply we pass here is what the user sees.
      return this.cancel(ctx.reply(ctx.t($ => $.ticket.not_in_ticket_channel), {
        flags: MessageFlags.Ephemeral,
      }));
    }

    // `next` continues to `run` and forwards this typed payload.
    return this.next(infos);
  }
}

/**
 * Component counterpart of {@link InTicketMiddleware}. Components (buttons, etc.)
 * cannot use a command middleware, so this one plugs into a component's `use: []`
 * and exposes the same `ctx.additional.inTicket`. It keeps the ticket buttons in
 * sync with the slash commands without repeating the lookup in every handler.
 */
export class InTicketComponentMiddleware extends ComponentMiddleware {
  readonly name = "inTicket" as const;

  async run(ctx: ComponentContext): Promise<ComponentMiddlewareRun<TicketInfos>> {
    const infos = await resolveTicket(ctx.client, ctx.interaction.channelId);

    if (!infos) {
      return this.cancel(ctx.reply(ctx.t($ => $.ticket.not_in_ticket_channel), {
        flags: MessageFlags.Ephemeral,
      }));
    }

    return this.next(infos);
  }
}
