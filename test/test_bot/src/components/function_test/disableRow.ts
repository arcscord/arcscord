import { buildClickableButton, createButton } from "arcscord";

export const disableRowButton = createButton({
  route: "disableRow/{id}",
  build: (id, value) =>
    buildClickableButton({
      style: "red",
      label: "Disable Row",
      customId: id({ id: value }),
    }),
  run: async (ctx) => {
    const [err] = await ctx.disableComponent("actionRow", true);
    if (err) {
      return ctx.error(err);
    }
    return ctx.reply("Successfully disabled action row", {
      ephemeral: true,
    });
  },
});
