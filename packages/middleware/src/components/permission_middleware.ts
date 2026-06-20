import type { ComponentContext, ComponentMiddlewareRun } from "arcscord";
import type { PermissionsString, User } from "discord.js";
import type { MessageOptions } from "../type";
import { ComponentMiddleware } from "arcscord";
import { PermissionsBitField } from "discord.js";

export type ComponentPermissionMiddlewareNext = {
  allowed: true;
};

export type ComponentPermissionMiddlewareMessageOptions = {
  missingPermissions: PermissionsString[];
  permissions: PermissionsString[];
  user: User;
};

export class ComponentPermissionMiddleware extends ComponentMiddleware {
  name = "componentPermission" as const;

  permissions: PermissionsString[];

  message: MessageOptions<ComponentPermissionMiddlewareMessageOptions>;

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
