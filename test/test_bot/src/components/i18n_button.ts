import { buildClickableButton, createButton } from "arcscord";

export const i18nButton = createButton({
  route: "i18n_button",
  build: id =>
    buildClickableButton({
      customId: id(),
      label: "i18n",
      style: "primary",
    }),
  run: (ctx) => {
    return ctx.reply(ctx.t($ => $.i18n.component.run), {
      ephemeral: true,
    });
  },
});
