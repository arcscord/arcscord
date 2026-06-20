import type { CommandContext, CommandMiddlewareRun } from "arcscord";
import type { MessageOptions } from "../type";
import { CommandMiddleware } from "arcscord";
import { normalizeUserIds } from "../utils";

export type CommandUserAllowListMiddlewareNext = {
  allowed: true;
};

/**
 * Restricts a command handler to a fixed list of Discord user IDs.
 *
 * Users outside the allowlist receive the configured message and the command
 * middleware chain is cancelled.
 */
export class CommandUserAllowListMiddleware extends CommandMiddleware {
  name = "userAllowList" as const;

  userIds: Set<string>;

  message: MessageOptions;

  /**
   * Creates a command allowlist middleware.
   *
   * User IDs are trimmed and empty values are ignored before the allowlist is stored.
   *
   * @param userIds Discord user IDs allowed to run the command.
   * @param message Static Discord message sent when the current user is not in the allowlist.
   */
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
