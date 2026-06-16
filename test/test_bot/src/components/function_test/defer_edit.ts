import { buildClickableButton, createButton } from "arcscord";

export const deferEditButton = createButton({
  route: "deferEdit",
  build: id =>
    buildClickableButton({
      style: "primary",
      label: "Edit",
      customId: id(),
    }),
  run: (ctx) => {
    return ctx.deferUpdateMessage();
  },
});
