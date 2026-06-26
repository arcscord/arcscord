import { createSelectMenu, stringSelectMenu as stringSelectMenuComponent } from "arcscord";
import { ComponentType } from "discord.js";

export const stringSelectMenu = createSelectMenu({
  type: ComponentType.StringSelect,
  route: "string_select_menu",
  build: (id, ...options) =>
    stringSelectMenuComponent({
      options,
      customId: id(),
    }),
  run: (ctx) => {
    return ctx.reply(`Selected ${ctx.values.join(", ")} !`);
  },
});
