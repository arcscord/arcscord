import { button, createButton } from "arcscord";

export const simpleButton = createButton({
  route: "simple_button",
  build: id =>
    button({
      label: "Simple Button",
      style: "secondary",
      customId: id(),
    }),
  run: (ctx) => {
    return ctx.reply("Clicked !");
  },
});
export const redSimpleButton = createButton({
  route: "red_simple_button",
  build: id =>
    button({
      label: "Red Simple Button",
      style: "danger",
      customId: id(),
    }),
  run: (ctx) => {
    return ctx.reply("Clicked red button !");
  },
});
