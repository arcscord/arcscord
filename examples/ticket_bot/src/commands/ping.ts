import { accessory, container, createCommand, section, v2Message } from "arcscord";
import { pingButton } from "../components/ping_button";

/**
 * Minimal slash command.
 *
 * Demonstrates the essentials: `createCommand`, a Components v2 reply built with
 * `container`/`section`/`accessory`, localized text through `ctx.t`, and
 * attaching a component (the refresh button) to a command reply.
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
        `## ${ctx.t($ => $.ping.title)}`,
        ctx.t($ => $.ping.latency, { ms: ctx.client.ws.ping }),
        // `accessory` docks the button to the right of the section.
        accessory(pingButton.build(ctx.t($ => $.ping.refresh))),
      ),
    ),
  )),
});
