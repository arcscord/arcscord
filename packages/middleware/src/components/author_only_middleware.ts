import type { ComponentContext, ComponentMiddlewareRun } from "arcscord";
import type { MessageOptions } from "../type";
import { ComponentMiddleware } from "arcscord";
import { MessageFlags } from "discord.js";

/**
 * Restricts a message component to the user who created the original interaction.
 *
 * If the original interaction author cannot be detected, the middleware continues
 * with an `ignore` status so other middleware or the handler can decide what to do.
 */
export class AuthorOnlyMiddleware extends ComponentMiddleware {
  name = "authorOnly" as const;

  message: MessageOptions;

  /**
   * Creates an author-only component middleware.
   *
   * @param message Static Discord message sent when a different user tries to use the component.
   */
  constructor(message: MessageOptions) {
    super();

    this.message = message;
  }

  run(ctx: ComponentContext): ComponentMiddlewareRun<{
    status: "author" | "ignore";
  }> {
    if (!ctx.isMessageComponentContext()) {
      return this.next({ status: "ignore" });
    }

    if (!ctx.message.interactionMetadata) {
      return this.next({ status: "ignore" });
    }

    if (ctx.message.interactionMetadata.user.id !== ctx.user.id) {
      return this.cancel(ctx.defer
        ? ctx.editReply(this.message)
        : ctx.reply({ flags: MessageFlags.Ephemeral, ...this.message }),
      );
    }

    return this.next({ status: "author" });
  }
}
