import { buildClickableButton, createButton } from "arcscord";

export const disableRowButton = createButton({
  matcher: "disableRow",
  build: id =>
    buildClickableButton({
      style: "red",
      label: "Disable Row",
      customId: `disableRow${id}`,
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
