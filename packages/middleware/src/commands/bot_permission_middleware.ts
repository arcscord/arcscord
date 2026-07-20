import type { CommandContext, CommandMiddlewareRun } from "arcscord";
import type { PermissionsString, User } from "discord.js";
import type { MessageOptions } from "../type";
import { CommandMiddleware } from "arcscord";
import { MessageFlags, PermissionsBitField } from "discord.js";
import { resolveMessage } from "../utils";

export type CommandBotPermissionMiddlewareNext = {
  allowed: true;
};

export type CommandBotPermissionMiddlewareMessageOptions = {
  /**
   * Required bot permissions that are missing from the interaction.
   */
  missingPermissions: PermissionsString[];

  /**
   * Full required permission list configured on the middleware.
   */
  permissions: PermissionsString[];

  /**
   * User who triggered the command interaction.
   */
  user: User;
};

/**
 * Restricts a command handler to interactions where the bot has every required Discord permission.
 *
 * When the bot is missing permissions, the middleware cancels the handler and
 * sends the configured message callback instead of continuing.
 */
export class CommandBotPermissionMiddleware extends CommandMiddleware {
  name = "commandBotPermission" as const;

  permissions: PermissionsString[];

  message: MessageOptions<CommandBotPermissionMiddlewareMessageOptions, CommandContext>;

  /**
   * Creates a bot permission guard for command handlers.
   *
   * Duplicate permissions are ignored. The message callback receives both the
   * full required permission list and the permissions missing from the bot.
   *
   * @param permissions Discord permissions required by the bot to continue the command handler.
   * @param message Callback called when the bot is missing permissions. It receives
   *   {@link CommandBotPermissionMiddlewareMessageOptions} and returns the Discord message to send.
   */
  constructor(
    permissions: Iterable<PermissionsString>,
    message: MessageOptions<CommandBotPermissionMiddlewareMessageOptions, CommandContext>,
  ) {
    super();

    this.permissions = [...new Set(permissions)];
    this.message = message;
  }

  run(ctx: CommandContext): CommandMiddlewareRun<CommandBotPermissionMiddlewareNext> {
    if (!ctx.interaction.inGuild()) {
      return this.next({ allowed: true });
    }

    const botPermissions = new PermissionsBitField(ctx.interaction.appPermissions ?? 0n);
    const missingPermissions = this.permissions.filter(permission => !botPermissions.has(permission));

    if (missingPermissions.length > 0) {
      const message = resolveMessage(this.message, ctx, {
        missingPermissions,
        permissions: this.permissions,
        user: ctx.user,
      });

      return this.cancel(ctx.defer
        ? ctx.editReply(message)
        : ctx.reply({ flags: MessageFlags.Ephemeral, ...message }),
      );
    }

    return this.next({ allowed: true });
  }
}
