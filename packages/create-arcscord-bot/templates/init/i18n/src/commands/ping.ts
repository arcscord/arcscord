import { accessory, container, createCommand, section, v2Message } from "arcscord";
import { pingButton } from "../components/ping_button";

export const pingCommand = createCommand({
  build: {
    slash: {
      name: "ping",
      description: "Check the bot latency",
    },
  },
  run: ctx => ctx.reply(v2Message(
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
