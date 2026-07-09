import type { ComponentRunReturn, MaybePromise } from "arcscord";
import { accessory, button, container, createButton, section, v2Message } from "arcscord";

/**
 * "Refresh" button used by /ping and its reply.
 *
 * Illustrates a self-updating component: `ctx.updateMessage` edits the message
 * the button lives on (rather than sending a new reply), and the handler rebuilds
 * itself with `pingButton.build()` so the button stays after each refresh.
 */
export const pingButton = createButton({
  route: "ping_refresh",
  build: (id, label) =>
    button({
      label,
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
        accessory(pingButton.build(ctx.t($ => $.ping.refresh))),
      ),
    ),
  )),
});
