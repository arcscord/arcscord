import { buildClickableButton, createButton } from "arcscord";

export const disableAllButton = createButton({
  route: "disableAll/{id}",
  build: (id, value) =>
    buildClickableButton({
      style: "red",
      label: "Disable All",
      customId: id({ id: value }),
    }),
  run: (ctx) => {
    return ctx.disableComponent();
  },
});
