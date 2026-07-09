import type { CommandUsage } from "#/generated/prisma/client";
import { createCommand } from "arcscord";
import { prisma } from "#/utils/prisma";

/**
 * Render the command usage rows as a monospace two-column table, wrapped in a
 * code block so Discord keeps the alignment.
 */
function buildUsageTable(
  rows: CommandUsage[],
  title: string,
  headerCommand: string,
  headerUses: string,
): string {
  const nameWidth = Math.max(headerCommand.length, ...rows.map(row => row.name.length));
  const usesWidth = Math.max(headerUses.length, ...rows.map(row => String(row.count).length));

  const line = (command: string, uses: string): string =>
    `${command.padEnd(nameWidth)} | ${uses.padStart(usesWidth)}`;

  const separator = `${"-".repeat(nameWidth)}-+-${"-".repeat(usesWidth)}`;
  const body = rows.map(row => line(row.name, String(row.count))).join("\n");

  return `**${title}**\n\`\`\`\n${line(headerCommand, headerUses)}\n${separator}\n${body}\n\`\`\``;
}

/**
 * `/stats` — show how many times each command has been used.
 *
 * The counts come from the `CommandUsage` table, which is filled by the custom
 * command result handler (utils/command_result_handler.ts) after every command.
 * The result is rendered as a monospace table and returned as an ephemeral reply
 * in the current channel.
 */
export const statsCommand = createCommand({
  slash: {
    name: "stats",
    nameLocalizations: t => t($ => $.ticket.commands.stats.name),
    description: "Show a command usage table.",
    descriptionLocalizations: t => t($ => $.ticket.commands.stats.description),
    contexts: ["guild"],
    integrationTypes: ["guildInstall"],
    defaultMemberPermissions: "ManageGuild",
  },
  preReply: "ephemeral",
  run: async (ctx) => {
    const usages = await prisma.commandUsage.findMany({
      orderBy: { count: "desc" },
    });

    if (usages.length === 0) {
      return ctx.editReply(ctx.t($ => $.ticket.commands.stats.empty));
    }

    const table = buildUsageTable(
      usages,
      ctx.t($ => $.ticket.commands.stats.table.title),
      ctx.t($ => $.ticket.commands.stats.table.header_command),
      ctx.t($ => $.ticket.commands.stats.table.header_uses),
    );

    // Ephemeral reply in the current channel — no DM.
    return ctx.editReply(table);
  },
});
