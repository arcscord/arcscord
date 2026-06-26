import { button, createButton } from "arcscord";
import { MessageFlags } from "discord.js";

export const disableRowButton = createButton({
  route: "disableRow/{id}",
  build: id =>
    button({
      style: "red",
      label: "Disable Row",
      customId: id(),
    }),
  run: async (ctx) => {
    const [err] = await ctx.disableComponent("actionRow", true);
    if (err) {
      return ctx.error(err);
    }
    return ctx.reply("Successfully disabled action row", {
      flags: MessageFlags.Ephemeral,
    });
  },
});
