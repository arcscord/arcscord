import type { ComponentContext, ComponentMiddlewareRun } from "arcscord";
import { ComponentError, ComponentMiddleware } from "arcscord";
import { MessageFlags } from "discord.js";

/**
 * Component middleware that restricts a component to the user who triggered the
 * original interaction it is attached to.
 *
 * It reads the source interaction's author from `message.interactionMetadata`
 * and cancels the pipeline with an ephemeral reply for anyone else, so a handler
 * behind it (here, the /ping refresh button) can assume the clicker owns the
 * message.
 */
export class AuthorOnlyMiddleware extends ComponentMiddleware {
  // `name` becomes the key exposed under `ctx.additional`, so a handler behind
  // this middleware can read `ctx.additional.authorOnly`.
  readonly name = "authorOnly" as const;

  run(ctx: ComponentContext): ComponentMiddlewareRun<{
    authorOnly: true;
  }> {
    if (!ctx.isMessageComponentContext()) {
      return this.error(new ComponentError({
        interaction: ctx.interaction,
        message: "Middleware `authorOnly` can only be used on message component interactions.",
      }));
    }

    const interactionMetadata = ctx.message?.interactionMetadata;

    if (!interactionMetadata) {
      return this.error(new ComponentError({
        interaction: ctx.interaction,
        message: "Middleware `authorOnly` can only be used on message component interactions that are replies to a interaction, failed to find meta",
      }));
    }

    if (interactionMetadata.user.id !== ctx.user.id) {
      // `cancel` stops the pipeline: the component's `run` never executes and the
      // reply we pass here is what the other user sees.
      return this.cancel(ctx.defer
        ? ctx.editReply({
            content: "You are not allowed to use this component.",
          })
        : ctx.reply({
            content: "You are not allowed to use this component.",
            flags: MessageFlags.Ephemeral,
          }),
      );
    }

    // `next` continues to `run` and forwards this typed payload.
    return this.next({
      authorOnly: true,
    });
  }
}
