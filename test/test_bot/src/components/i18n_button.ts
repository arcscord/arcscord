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
    const m = localization.getFixed(ctx);
    return ctx.reply(m.i18n_component_run(), {
      flags: MessageFlags.Ephemeral,
    });
  },
});
