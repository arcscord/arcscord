import type { ComponentRunReturn, MaybePromise } from "arcscord";
import { accessory, button, container, createButton, section, v2Message } from "arcscord";

export const pingButton = createButton({
  route: "ping_refresh",
  build: id =>
    button({
      label: "Refresh",
      style: "secondary",
      customId: id(),
    }),
  // Explicit return type avoids TS7022/TS7023 when this handler rebuilds itself.
  run: (ctx): MaybePromise<ComponentRunReturn> => ctx.updateMessage(v2Message(
    container(
      { accentColor: 0x5865F2 },
      section(
        `## ${ctx.t($ => $.ping.title)}`,
        ctx.t($ => $.ping.latency, { ms: ctx.client.ws.ping }),
        accessory(pingButton.build()),
      ),
    ),
  )),
});
