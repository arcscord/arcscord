import { createCommand } from "arcscord";
import { EmbedBuilder, MessageFlags } from "discord.js";

const DEFAULT_AVATAR_SIZE = 1024;

/**
 * Dual-surface command: the same handler backs a `/avatar` slash command and an
 * "Avatar" entry in the user context menu (right-click a member → Apps).
 *
 * Also demonstrates option `choices` (the `size` list), `integrationTypes`
 * marking the command available to both user installs and guild installs, and
 * replying with a classic embed instead of Components v2.
 */
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
        // `as const` keeps the literal choice values, so `ctx.options.size` is
        // typed as the exact union (64 | 128 | ...) rather than plain `number`.
      } as const,
    },
    integrationTypes: ["userInstall", "guildInstall"],
  },

  // Registering a `user` block turns the same handler into a context-menu
  // command; there are no options, so we fall back to defaults for that surface.
  user: {
    name: "Avatar",
    integrationTypes: ["userInstall", "guildInstall"],
  },

  run: (ctx) => {
    // The two surfaces expose the target differently: slash commands read the
    // `user` option (defaulting to the caller), the context menu uses `targetUser`.
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
