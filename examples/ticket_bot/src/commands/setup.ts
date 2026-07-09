import { actionRow, container, createCommand, v2Message } from "arcscord";
import { ChannelType } from "discord.js";
import { openTicketButton } from "#/components/open_ticket";

/**
 * `/setup` — post the ticket dashboard (the persistent message with the
 * "Open a ticket" button) into the current channel.
 *
 * This is the one admin command that is not "managing a ticket", so unlike
 * /claim, /close, /reopen and /ticketstats (which use Manage Threads) it keeps
 * the higher `defaultMemberPermissions: "ManageGuild"`. It also shows:
 *  - `contexts: ["guild"]` + `integrationTypes: ["guildInstall"]` (guild only);
 *  - `preReply: "ephemeral"` — defers with a private reply, sent via `ctx.editReply`.
 */
export const setupCommand = createCommand({
  slash: {
    name: "setup",
    nameLocalizations: t => t($ => $.ticket.commands.setup.name),
    description: "Send the ticket dashboard message",
    descriptionLocalizations: t => t($ => $.ticket.commands.setup.description),
    contexts: ["guild"],
    integrationTypes: ["guildInstall"],
    defaultMemberPermissions: "ManageGuild",
  },
  preReply: "ephemeral",
  run: async (ctx) => {
    // The dashboard must live in a regular text channel so tickets can spawn
    // threads from it.
    const channel = await ctx.client.channels.fetch(ctx.interaction.channelId);
    if (!channel || !channel.isSendable() || channel.type !== ChannelType.GuildText) {
      return ctx.reply("This command can only be used in text channels.");
    }

    await channel.send(v2Message(
      container(
        { accentColor: 0x5865F2 },
        `## ${ctx.t($ => $.ticket.messages.dashboard.title)}`,
        ctx.t($ => $.ticket.messages.dashboard.description),
        actionRow(
          openTicketButton.build(ctx.t($ => $.ticket.messages.dashboard.button),
          ),
        ),
      ),
    ));

    // Because we deferred (preReply), the confirmation goes through `editReply`.
    ctx.editReply(v2Message(
      container(
        { accentColor: 0x5CE65C },
        ctx.t($ => $.ticket.commands.setup.run.success),
      ),
    ));
  },
});
