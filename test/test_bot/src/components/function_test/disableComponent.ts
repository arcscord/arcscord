import { buildClickableButton, createButton } from "arcscord";

export const disableComponentButton = createButton({
  route: "disableComponent/{id}",
  build: (id, value) =>
    buildClickableButton({
      style: "red",
      label: "Disable button",
      customId: id({ id: value }),
    }),
  run: (ctx) => {
    return ctx.disableComponent("component");
  },
});
