import type { ComponentContext, ComponentMiddlewareRun } from "arcscord";
import type { PermissionsString, User } from "discord.js";
import type { MessageOptions } from "../type";
import { ComponentMiddleware } from "arcscord";
import { MessageFlags, PermissionsBitField } from "discord.js";

export type ComponentBotPermissionMiddlewareNext = {
  allowed: true;
};

export type ComponentBotPermissionMiddlewareMessageOptions = {
  /**
   * Required bot permissions that are missing from the interaction.
   */
  missingPermissions: PermissionsString[];

  /**
   * Full required permission list configured on the middleware.
   */
  permissions: PermissionsString[];

  /**
   * User who triggered the component interaction.
   */
  user: User;
};

/**
 * Restricts a component handler to interactions where the bot has every required Discord permission.
 *
 * When the bot is missing permissions, the middleware cancels the handler and
 * sends the configured message callback instead of continuing.
 */
export class ComponentBotPermissionMiddleware extends ComponentMiddleware {
  name = "componentBotPermission" as const;

  permissions: PermissionsString[];

  message: MessageOptions<ComponentBotPermissionMiddlewareMessageOptions>;

  /**
   * Creates a bot permission guard for component handlers.
   *
   * Duplicate permissions are ignored. The message callback receives both the
   * full required permission list and the permissions missing from the bot.
   *
   * @param permissions Discord permissions required by the bot to continue the component handler.
   * @param message Callback called when the bot is missing permissions. It receives {@link ComponentBotPermissionMiddlewareMessageOptions} and returns the Discord message to send.
   */
  constructor(
    permissions: Iterable<PermissionsString>,
    message: MessageOptions<ComponentBotPermissionMiddlewareMessageOptions>,
  ) {
    super();

    this.permissions = [...new Set(permissions)];
    this.message = message;
  }

  run(ctx: ComponentContext): ComponentMiddlewareRun<ComponentBotPermissionMiddlewareNext> {
    if (!ctx.interaction.inGuild()) {
      return this.next({ allowed: true });
    }

    const botPermissions = new PermissionsBitField(ctx.interaction.appPermissions ?? 0n);
    const missingPermissions = this.permissions.filter(permission => !botPermissions.has(permission));

    if (missingPermissions.length > 0) {
      const message = this.message({
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
