import { createSelectMenu, roleSelectMenu as roleSelectMenuComponent } from "arcscord";
import { ComponentType, EmbedBuilder } from "discord.js";

export const roleSelectMenu = createSelectMenu({
  type: ComponentType.RoleSelect,
  route: "role_select_menu",
  build: (id, placeHolder) =>
    roleSelectMenuComponent({
      placeholder: placeHolder,
      customId: id(),
      maxValues: 1,
      minValues: 1,
    }),
  run: (ctx) => {
    const role = ctx.values[0];

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`Info about role ${role.name}`)
          .setDescription(`Position: ${role.position}\nColor: ${role.color}`)
          .setColor(role.color),
      ],
    });
  },
});
