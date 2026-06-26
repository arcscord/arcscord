import { button, createButton } from "arcscord";

export const deferEditButton = createButton({
  route: "deferEdit",
  build: id =>
    button({
      style: "primary",
      label: "Edit",
      customId: id(),
    }),
  run: (ctx) => {
    return ctx.deferUpdateMessage();
  },
});
