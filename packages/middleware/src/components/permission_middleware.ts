import type { ComponentContext, ComponentMiddlewareRun } from "arcscord";
import type { PermissionsString, User } from "discord.js";
import type { MessageOptions } from "../type";
import { ComponentMiddleware } from "arcscord";
import { PermissionsBitField } from "discord.js";

export type ComponentPermissionMiddlewareNext = {
  allowed: true;
};

export type ComponentPermissionMiddlewareMessageOptions = {
  /**
   * Required permissions the current member does not have.
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
 * Restricts a component handler to members that have every required Discord permission.
 *
 * When the member is missing permissions, the middleware cancels the handler and
 * sends the configured message callback instead of continuing.
 */
export class ComponentPermissionMiddleware extends ComponentMiddleware {
  name = "componentPermission" as const;

  permissions: PermissionsString[];

  message: MessageOptions<ComponentPermissionMiddlewareMessageOptions>;

  /**
   * Creates a permission guard for component handlers.
   *
   * Duplicate permissions are ignored. The message callback receives both the
   * full required permission list and the permissions missing from the current member.
   *
   * @param permissions Discord permissions required to continue the component handler.
   * @param message Callback called when the current member is missing permissions. It receives {@link ComponentPermissionMiddlewareMessageOptions} and returns the Discord message to send.
   */
  constructor(
    permissions: Iterable<PermissionsString>,
    message: MessageOptions<ComponentPermissionMiddlewareMessageOptions>,
  ) {
    super();

    this.permissions = [...new Set(permissions)];
    this.message = message;
  }

  run(ctx: ComponentContext): ComponentMiddlewareRun<ComponentPermissionMiddlewareNext> {
    const permissions = ctx.member?.permissions;
    const memberPermissions = new PermissionsBitField(
      typeof permissions === "string" ? BigInt(permissions) : permissions ?? 0n,
    );
    const missingPermissions = this.permissions.filter(permission => !memberPermissions.has(permission));

    if (missingPermissions.length > 0) {
      const message = this.message({
        missingPermissions,
        permissions: this.permissions,
        user: ctx.user,
      });

      return this.cancel(ctx.defer
        ? ctx.editReply(message)
        : ctx.reply({ ephemeral: true, ...message }),
      );
    }

    return this.next({ allowed: true });
  }
}
