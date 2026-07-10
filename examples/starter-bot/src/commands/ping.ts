import { accessory, container, createCommand, section, v2Message } from "arcscord";
import { pingButton } from "../components/ping_button";

/**
 * Minimal slash command.
 *
 * Shows the essentials: `createCommand`, a Components v2 reply built with
 * `container`/`section`/`accessory`, and attaching a component (the refresh
 * button) to a command reply. The button is seeded with a `refreshCount` of `0`,
 * a dynamic route param it increments on every click.
 */
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
        `Refresh count: \`0\``,
        // `accessory` docks the button to the right of the section; the seeded
        // `refreshCount` becomes part of the button's customId.
        accessory(pingButton.build({
          refreshCount: "0",
        })),
      ),
    ),
  )),
});
