import { button, createButton } from "arcscord";

export const editButton = createButton({
  route: "edit",
  build: id =>
    button({
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
