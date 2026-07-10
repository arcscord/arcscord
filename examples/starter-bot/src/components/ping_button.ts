import type { ComponentRunReturn, MaybePromise } from "arcscord";
import { accessory, button, container, createButton, section, v2Message } from "arcscord";
import { AuthorOnlyMiddleware } from "#/middleware/author_only";

/**
 * "Refresh" button attached to the /ping reply.
 *
 * Illustrates a self-updating component with a dynamic route: the `{refreshCount}`
 * segment carries state inside the customId, so each click reads
 * `ctx.params.refreshCount`, increments it, and rebuilds the same message with
 * `ctx.updateMessage`. `AuthorOnlyMiddleware` restricts the button to whoever ran
 * the command.
 */
export const pingButton = createButton({
  // `{refreshCount}` is a dynamic segment: `build({ refreshCount })` fills it and
  // `ctx.params.refreshCount` reads it back on click.
  route: "ping_refresh/{refreshCount}",
  build: id =>
    button({
      label: "Refresh",
      style: "secondary",
      customId: id(),
    }),
  use: [new AuthorOnlyMiddleware()],
  // Explicit return type avoids TS7022/TS7023 when this handler rebuilds itself.
  run: (ctx): MaybePromise<ComponentRunReturn> => {
    const refreshCount = parseInt(ctx.params.refreshCount, 10) + 1;
    return ctx.updateMessage(v2Message(
      container(
        { accentColor: 0x5865F2 },
        section(
          "## 🏓 Pong!",
          `Latency: \`${ctx.client.ws.ping}ms\``,
          `Refresh count: \`${refreshCount}\``,
          accessory(pingButton.build({
            refreshCount: refreshCount.toString(),
          })),
        ),
      ),
    ));
  },
});
