import { buildClickableButton, createButton } from "arcscord";

export const simpleButton = createButton({
  matcher: "simple_button",
  build: () =>
    buildClickableButton({
      label: "Simple Button",
      style: "secondary",
      customId: "simple_button",
    }),
  run: (ctx) => {
    return ctx.reply("Clicked !");
  },
});
export const redSimpleButton = createButton({
  matcher: "red_simple_button",
  build: () =>
    buildClickableButton({
      label: "Red Simple Button",
      style: "danger",
      customId: "red_simple_button",
    }),
  run: (ctx) => {
    return ctx.reply("Clicked red button !");
  },
});
