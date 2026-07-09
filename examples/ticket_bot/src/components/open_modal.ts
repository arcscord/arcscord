import { actionRow, ComponentError, container, createModal, error, modalRadioGroup, modalTextInput, separator, v2Message } from "arcscord";
import { ChannelType } from "discord.js";
import { prisma } from "#/utils/prisma";
import { claimTicketButton } from "./claim_ticket";
import { closeTicketButton } from "./close_ticket";

/**
 * The ticket creation modal.
 *
 * This is the heart of the example. It shows the full modal workflow:
 *  - `fields` declares typed inputs once (a radio group + a text input); the
 *    field keys become the typed `ctx.values` in `run`.
 *  - `build` produces the modal to display and lets the caller override labels
 *    per language (that is how open_ticket.ts localizes it) via `field.label(...)`.
 *  - `run` reads the answers, creates a private thread, persists the ticket, and
 *    posts the ticket message with the Close/Claim buttons.
 */
export const ticketOpenModal = createModal({
  route: "ticket_open_modal",
  // Field definitions. `value`s are the stable machine keys; the human-readable
  // labels below are placeholders overridden at build time for localization.
  fields: {
    category: modalRadioGroup({
      label: "Category",
      required: true,
      options: [
        { label: "Support", value: "support" },
        { label: "Bug Report", value: "bug_report" },
        { label: "Other", value: "other" },
      ],
    }),
    reason: modalTextInput({
      label: "Reason",
      description: "Please provide a brief description of your issue.",
      placeholder: "I need help with...",
      style: "paragraph",
      required: true,
    }),
  },

  // `build` receives the field handles plus a `t` bag of already-translated
  // strings (assembled by open_ticket.ts). `field.label({...})` renders each
  // field with the localized label/description/placeholder.
  build: (id, fields, t: {
    title: string;
    categoryLabel: string;
    categorySupport: string;
    categoryBugReport: string;
    categoryOther: string;
    reasonLabel: string;
    reasonDescription: string;
    reasonPlaceholder: string;
  }) => ({
    title: t.title,
    customId: id(),
    components: [

      fields.category.label({
        label: t.categoryLabel,
        options: {
          support: { label: t.categorySupport },
          bug_report: { label: t.categoryBugReport },
          other: { label: t.categoryOther },
        },
      }),

      fields.reason.label({
        label: t.reasonLabel,
        description: t.reasonDescription,
        placeholder: t.reasonPlaceholder,
      }),

    ],
  }),
  // Defer with an ephemeral reply so we can confirm privately after the (async)
  // thread creation and DB write.
  preReply: "ephemeral",
  run: async (ctx) => {
    // `ctx.values` is typed from the `fields` above: the selected radio value
    // and the entered text.
    const category = ctx.values.category;
    const reason = ctx.values.reason;

    const channel = await ctx.client.channels.fetch(ctx.interaction.channelId || "");
    if (!channel || channel.type !== ChannelType.GuildText) {
      // Returning an `error(...)` result routes to the component result handler,
      // which logs it and shows the user a generic error message.
      return error(new ComponentError({
        interaction: ctx.interaction,
        message: `Get a open modal in a wrong channel, type (null = no channel): ${channel?.type || null}`,
      }));
    }

    // Model each ticket as a private thread off the dashboard channel.
    const thread = await channel.threads.create({
      name: `ticket-${ctx.interaction.user.username}`,
      autoArchiveDuration: 10080,
      reason: `Ticket opened by ${ctx.interaction.user.tag}`,
      invitable: false,
      type: ChannelType.PrivateThread,
    });

    // Persist the ticket. `threadId` is the link used later to resolve the
    // ticket from any interaction in this thread (see in_ticket.ts / buttons).
    const ticket = await prisma.ticket.create({
      data: {
        guildId: channel.guildId,
        parentChannelId: channel.id,
        threadId: thread.id,
        openerId: ctx.interaction.user.id,
        title: `${category}-${ctx.interaction.user.username}`,
        description: reason,
      },
    });

    // Post the ticket message with the Close/Claim buttons inside the thread.
    thread.send(v2Message(
      container(
        { accentColor: 0x5865F2 },
        `## ${ctx.t($ => $.ticket.messages.ticket_created.title, { ticketId: ticket.id })}`,
        ctx.t($ => $.ticket.messages.ticket_created.description, { userMention: `<@${ctx.interaction.user.id}>` }),
        separator(),
        `${ctx.t($ => $.ticket.messages.ticket_created.category_label)} : ${ctx.t($ => $.ticket.messages.ticket_created.category[category])}`,
        `${ctx.t($ => $.ticket.messages.ticket_created.reason_label)} : ${reason}`,
        separator(),
        actionRow(
          closeTicketButton.build(ctx.t($ => $.ticket.messages.ticket_created.buttons.close)),
          claimTicketButton.build(ctx.t($ => $.ticket.messages.ticket_created.buttons.claim)),
        ),
      ),
    ));

    await ctx.editReply(ctx.t($ => $.ticket.messages.ticket_created.succes, { channelMention: `<#${thread.id}>` }));
  },
});
