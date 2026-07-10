import type { ComponentRunReturn, MaybePromise } from "arcscord";
import { accessory, button, container, createButton, section, v2Message } from "arcscord";
import { AutherOnlyMiddleware } from "#/middleware/author_only";

export const pingButton = createButton({
  route: "ping_refresh/{refreshCount}",
  build: id =>
    button({
      label: "Refresh",
      style: "secondary",
      customId: id(),
    }),
  use: [new AutherOnlyMiddleware()],
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
