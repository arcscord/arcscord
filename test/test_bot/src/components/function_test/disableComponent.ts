import { button, createButton } from "arcscord";

export const disableComponentButton = createButton({
  route: "disableComponent/{id}",
  build: id =>
    button({
      style: "red",
      label: "Disable button",
      customId: id(),
    }),
  run: (ctx) => {
    return ctx.disableComponent("component");
  },
});
