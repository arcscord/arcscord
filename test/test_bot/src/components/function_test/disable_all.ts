import { buildClickableButton, createButton } from "arcscord";

export const disableAllButton = createButton({
  route: "disableAll/{id}",
  build: id =>
    buildClickableButton({
      style: "red",
      label: "Disable All",
      customId: id(),
    }),
  run: (ctx) => {
    return ctx.disableComponent();
  },
});
