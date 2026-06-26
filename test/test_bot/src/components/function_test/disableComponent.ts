import { buildClickableButton, createButton } from "arcscord";

export const disableComponentButton = createButton({
  route: "disableComponent/{id}",
  build: id =>
    buildClickableButton({
      style: "red",
      label: "Disable button",
      customId: id(),
    }),
  run: (ctx) => {
    return ctx.disableComponent("component");
  },
});
