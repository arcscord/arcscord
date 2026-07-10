import type { ComponentContext, ComponentMiddlewareRun } from "arcscord";
import { ComponentError, ComponentMiddleware } from "arcscord";
import { MessageFlags } from "discord.js";

export class AutherOnlyMiddleware extends ComponentMiddleware {
  readonly name = "authorOnly" as const;

  run(ctx: ComponentContext): ComponentMiddlewareRun<{
    autherOnly: true;
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

    return this.next({
      autherOnly: true,
    });
  }
}
