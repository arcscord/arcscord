import { accessory, container, createCommand, section, v2Message } from "arcscord";
import { pingButton } from "../components/ping_button";

export const pingCommand = createCommand({
  slash: {
    name: "ping",
    description: "Check the bot latency",
  },
  run: ctx => ctx.reply(v2Message(
    container(
      { accentColor: 0x5865F2 },
      section(
        "## 🏓 Pong!",
        `Latency: \`${ctx.client.ws.ping}ms\``,
        accessory(pingButton.build()),
      ),
    ),
  )),
});
