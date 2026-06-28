import { actionRow, createCommand } from "arcscord";
import { pingButton } from "../components/ping_button";

export const pingCommand = createCommand({
  build: {
    slash: {
      name: "ping",
      description: "Check the bot latency",
    },
  },
  run: ctx => ctx.reply({
    content: `🏓 Pong! \`${ctx.client.ws.ping}ms\``,
    components: [actionRow(pingButton.build())],
  }),
});
