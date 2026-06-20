import type { CommandContext, CommandMiddlewareRun } from "arcscord";
import type { MessageOptions } from "../type";
import { CommandMiddleware } from "arcscord";
import { normalizeUserIds } from "../utils";

export type CommandUserAllowListMiddlewareNext = {
  allowed: true;
};

export class CommandUserAllowListMiddleware extends CommandMiddleware {
  name = "userAllowList" as const;

  userIds: Set<string>;

  message: MessageOptions;

  constructor(userIds: Iterable<string>, message: MessageOptions) {
    super();

    this.userIds = normalizeUserIds(userIds);
    this.message = message;
  }

  run(ctx: CommandContext): CommandMiddlewareRun<CommandUserAllowListMiddlewareNext> {
    if (!this.userIds.has(ctx.user.id)) {
      return this.cancel(ctx.defer
        ? ctx.editReply(this.message)
        : ctx.reply({ ephemeral: true, ...this.message }),
      );
    }

    return this.next({ allowed: true });
  }
}
