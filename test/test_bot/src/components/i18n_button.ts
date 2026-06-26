import { button, createButton } from "arcscord";
import { MessageFlags } from "discord.js";

export const i18nButton = createButton({
  route: "i18n_button",
  build: id =>
    button({
      customId: id(),
      label: "i18n",
      style: "primary",
    }),
  run: (ctx) => {
    return ctx.reply(ctx.t($ => $.i18n.component.run), {
      flags: MessageFlags.Ephemeral,
    });
  },
});
