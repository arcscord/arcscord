import { buildClickableButton, createButton } from "arcscord";

export const editButton = createButton({
  route: "edit",
  build: id =>
    buildClickableButton({
      style: "primary",
      label: "Edit",
      customId: id(),
    }),
  run: (ctx) => {
    return ctx.updateMessage({
      content: "Updated !",
    });
  },
});
