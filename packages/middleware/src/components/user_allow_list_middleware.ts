import type { ComponentContext, ComponentMiddlewareRun } from "arcscord";
import type { MessageOptions } from "../type";
import { ComponentMiddleware } from "arcscord";
import { normalizeUserIds } from "../utils";

export type ComponentUserAllowListMiddlewareNext = {
  allowed: true;
};

export class ComponentUserAllowListMiddleware extends ComponentMiddleware {
  name = "userAllowList" as const;

  userIds: Set<string>;

  message: MessageOptions;

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
