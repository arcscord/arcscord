import type { AnyThreadChannel } from "discord.js";
import type { TFunction } from "i18next";
import type { Ticket } from "#/generated/prisma/client";
import { actionRow, button, container, separator, v2Message } from "arcscord";
import { PermissionFlagsBits } from "discord.js";
import { prisma } from "#/utils/prisma";

/**
 * Shared arguments for every ticket lifecycle action.
 *
 * `t` is the localized translate function taken from the interaction context
 * (`ctx.t`), so both slash commands and buttons announce in the caller's locale.
 */
interface TicketActionBase {
  thread: AnyThreadChannel;
  ticket: Ticket;
  actorId: string;
  t: TFunction;
}

const CLAIM_COLOR = 0x5865F2;
const CLOSE_COLOR = 0xED4245;
const REOPEN_COLOR = 0x57F287;

/**
 * On close, kick every thread member that lacks the Manage Threads permission
 * (typically the opener) so a closed ticket is only visible to staff. Each
 * removed user is flagged `removed` in the DB so {@link restoreRemovedMembers}
 * can add them back on reopen.
 */
async function removeNonStaffMembers(thread: AnyThreadChannel, ticketId: number): Promise<void> {
  const members = await thread.members.fetch().catch(() => null);
  if (!members) {
    return;
  }

  // Threads have no overwrites of their own, so "staff" is decided at the parent
  // channel level (which honours per-channel permission overwrites).
  const parent = thread.parent;

  for (const member of members.values()) {
    // Never remove the bot itself.
    if (member.id === thread.client.user.id) {
      continue;
    }

    const guildMember = await thread.guild.members.fetch(member.id).catch(() => null);
    if (guildMember && parent?.permissionsFor(guildMember).has(PermissionFlagsBits.ManageThreads)) {
      continue; // keep staff in the thread
    }

    await thread.members.remove(member.id).catch(() => null);
    await prisma.ticketParticipant.upsert({
      where: { ticketId_userId: { ticketId, userId: member.id } },
      create: { ticketId, userId: member.id, removed: true },
      update: { removed: true },
    });
  }
}

/**
 * On reopen, add back every member removed on close and clear the `removed` flag.
 */
async function restoreRemovedMembers(thread: AnyThreadChannel, ticketId: number): Promise<void> {
  const removed = await prisma.ticketParticipant.findMany({
    where: { ticketId, removed: true },
  });

  for (const participant of removed) {
    await thread.members.add(participant.userId).catch(() => null);
  }

  await prisma.ticketParticipant.updateMany({
    where: { ticketId, removed: true },
    data: { removed: false },
  });
}

/**
 * Claim the ticket for the acting staff member. Fails if the ticket is already
 * closed or already claimed by someone else.
 */
export async function claimTicket({
  thread,
  ticket,
  actorId,
  t,
}: TicketActionBase): Promise<
  | { ok: true }
  | { ok: false; reason: "already_closed" }
  | { ok: false; reason: "already_claimed"; claimedById: string }
> {
  if (ticket.status !== "OPEN") {
    return { ok: false, reason: "already_closed" };
  }
  if (ticket.claimedById) {
    return { ok: false, reason: "already_claimed", claimedById: ticket.claimedById };
  }

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { claimedById: actorId },
  });
  await prisma.ticketEvent.create({
    data: { ticketId: ticket.id, type: "CLAIMED", actorId },
  });

  await thread.send(v2Message(
    container(
      { accentColor: CLAIM_COLOR },
      `## ${t($ => $.ticket.messages.ticket_claimed.title)}`,
      t($ => $.ticket.messages.ticket_claimed.description, { userMention: `<@${actorId}>` }),
    ),
  ));

  return { ok: true };
}

/**
 * Close the ticket, storing an optional reason, and post an announcement with a
 * reopen button. Fails if the ticket is already closed.
 */
export async function closeTicket({
  thread,
  ticket,
  actorId,
  reason,
  t,
}: TicketActionBase & { reason?: string }): Promise<
  { ok: true } | { ok: false; reason: "already_closed" }
> {
  if (ticket.status !== "OPEN") {
    return { ok: false, reason: "already_closed" };
  }

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: "CLOSED",
      closeReason: reason ?? null,
      closedById: actorId,
      closedAt: new Date(),
    },
  });
  await prisma.ticketEvent.create({
    data: { ticketId: ticket.id, type: "CLOSED", actorId, body: reason ?? null },
  });

  await thread.send(v2Message(
    container(
      { accentColor: CLOSE_COLOR },
      `## ${t($ => $.ticket.messages.ticket_closed.title)}`,
      t($ => $.ticket.messages.ticket_closed.description, { userMention: `<@${actorId}>` }),
      ...(reason
        ? [`${t($ => $.ticket.messages.ticket_closed.reason_label)} : ${reason}`]
        : []),
      separator(),
      actionRow(
        // Static component routes use their route string as the custom id.
        button({
          label: t($ => $.ticket.messages.ticket_created.buttons.reopen),
          style: "success",
          customId: "reopen_ticket",
        }),
      ),
    ),
  ));

  // Hide the closed ticket from non-staff members (they are restored on reopen).
  await removeNonStaffMembers(thread, ticket.id);

  return { ok: true };
}

/**
 * Reopen a previously closed ticket and clear its close metadata. Fails if the
 * ticket is not currently closed.
 */
export async function reopenTicket({
  thread,
  ticket,
  actorId,
  t,
}: TicketActionBase): Promise<
  { ok: true } | { ok: false; reason: "not_closed" }
> {
  if (ticket.status !== "CLOSED") {
    return { ok: false, reason: "not_closed" };
  }

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: "OPEN",
      closeReason: null,
      closedById: null,
      closedAt: null,
    },
  });
  await prisma.ticketEvent.create({
    data: { ticketId: ticket.id, type: "REOPENED", actorId },
  });

  // Bring back everyone who was removed on close before announcing.
  await restoreRemovedMembers(thread, ticket.id);

  await thread.send(v2Message(
    container(
      { accentColor: REOPEN_COLOR },
      `## ${t($ => $.ticket.messages.ticket_reopened.title)}`,
      t($ => $.ticket.messages.ticket_reopened.description, { userMention: `<@${actorId}>` }),
    ),
  ));

  return { ok: true };
}
