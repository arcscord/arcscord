import type { ComponentContext, ComponentMiddlewareRun } from "arcscord";
import type { MessageOptions } from "../type";
import { ComponentMiddleware } from "arcscord";
import { normalizeUserIds } from "../utils";

export type ComponentUserAllowListMiddlewareNext = {
  allowed: true;
};

/**
 * Restricts a component handler to a fixed list of Discord user IDs.
 *
 * Users outside the allowlist receive the configured message and the component
 * middleware chain is cancelled.
 */
export class ComponentUserAllowListMiddleware extends ComponentMiddleware {
  name = "userAllowList" as const;

  userIds: Set<string>;

  message: MessageOptions;

  /**
   * Creates a component allowlist middleware.
   *
   * User IDs are trimmed and empty values are ignored before the allowlist is stored.
   *
   * @param userIds Discord user IDs allowed to use the component.
   * @param message Message sent when the current user is not in the allowlist.
   */
  constructor(userIds: Iterable<string>, message: MessageOptions) {
    super();

    this.userIds = normalizeUserIds(userIds);
    this.message = message;
  }

  run(ctx: ComponentContext): ComponentMiddlewareRun<ComponentUserAllowListMiddlewareNext> {
    if (!this.userIds.has(ctx.user.id)) {
      return this.cancel(ctx.defer
        ? ctx.editReply(this.message)
        : ctx.reply({ ephemeral: true, ...this.message }),
      );
    }

    return this.next({ allowed: true });
  }
}
