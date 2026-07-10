import { createCommand } from "arcscord";
import { EmbedBuilder, MessageFlags } from "discord.js";

const DEFAULT_AVATAR_SIZE = 1024;

export const avatarCommand = createCommand({
  slash: {
    name: "avatar",
    description: "Display a user's avatar",
    options: {
      user: {
        type: "user",
        description: "The user whose avatar you want to display",
      },
      size: {
        type: "number",
        description: "The avatar image size",
        choices: [
          64,
          128,
          256,
          512,
          {
            name: "1024 (default)",
            value: 1024,
          },
          2048,
        ],
      } as const,
    },
    integrationTypes: ["userInstall", "guildInstall"],
  },

  user: {
    name: "Avatar",
    integrationTypes: ["userInstall", "guildInstall"],
  },

  run: (ctx) => {
    const user = ctx.isSlashCommand
      ? (ctx.options.user ?? ctx.user)
      : ctx.targetUser;

    const size = ctx.isSlashCommand
      ? (ctx.options.size ?? DEFAULT_AVATAR_SIZE)
      : DEFAULT_AVATAR_SIZE;

    const avatarUrl = user.displayAvatarURL({ size });

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`${user.displayName}'s avatar`)
          .setURL(avatarUrl)
          .setImage(avatarUrl),
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
});
