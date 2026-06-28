import { button, container, createButton, v2Message } from "arcscord";
import { MessageFlags } from "discord.js";

export const pingButton = createButton({
  route: "ping_refresh",
  build: id =>
    button({
      label: "Refresh",
      style: "secondary",
      customId: id(),
    }),
  // Sends a fresh, ephemeral v2 message with the recomputed latency.
  run: ctx => ctx.reply(v2Message(
    { flags: MessageFlags.Ephemeral },
    container(
      { accentColor: 0x5865F2 },
      `## ${ctx.t($ => $.ping.title)}\n${ctx.t($ => $.ping.latency, { ms: ctx.client.ws.ping })}`,
    ),
  )),
});
