import type { CommandContext, CommandMiddlewareRun, MaybePromise } from "arcscord";
import { CommandMiddleware } from "arcscord";

export class ExampleMiddleware extends CommandMiddleware {
  name = "example" as const;

  run(ctx: CommandContext): MaybePromise<CommandMiddlewareRun<NonNullable<unknown>>> {
    return this.next(ctx);
  }
}
