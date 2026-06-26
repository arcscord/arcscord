import { createSelectMenu, userSelectMenu as userSelectMenuComponent } from "arcscord";
import { ComponentType, EmbedBuilder } from "discord.js";

export const userSelectMenu = createSelectMenu({
  type: ComponentType.UserSelect,
  route: "user_select_menu",
  build: id =>
    userSelectMenuComponent({
      customId: id(),
      minValues: 1,
      maxValues: 25,
    }),
  run: (ctx) => {
    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("User Select")
          .setDescription(
            `Selected :\n-${ctx.values.map(user => user.displayName).join("\n- ")}`,
          ),
      ],
    });
  },
});
