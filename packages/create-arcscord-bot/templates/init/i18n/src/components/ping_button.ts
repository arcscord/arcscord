import { button, createButton } from "arcscord";

export const pingButton = createButton({
  route: "ping_refresh",
  build: id =>
    button({
      label: "Refresh",
      style: "secondary",
      customId: id(),
    }),
  // Updating only the content keeps the existing button on the message.
  run: ctx => ctx.updateMessage({
    content: `🏓 Pong! \`${ctx.client.ws.ping}ms\``,
  }),
});
