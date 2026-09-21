import { button, createButton } from "arcscord";
import { MessageFlags } from "discord.js";
import { localization } from "../localization";

export const i18nButton = createButton({
  route: "i18n_button",
  build: id =>
    button({
      customId: id(),
      label: "i18n",
      style: "primary",
    }),
  run: (ctx) => {
    return ctx.reply(localization.getFixed(ctx)($ => $.i18n.component.run), {
      flags: MessageFlags.Ephemeral,
    });
  },
});
