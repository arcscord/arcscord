import { buildMentionableSelectMenu, createSelectMenu } from "arcscord";
import { ComponentType, User } from "discord.js";

export const mentionableSelectMenu = createSelectMenu({
  type: ComponentType.MentionableSelect,
  route: "mentionable_select_menu",
  build: id =>
    buildMentionableSelectMenu({
      customId: id(),
    }),
  run: (ctx) => {
    const value = ctx.values[0];
    if (value instanceof User) {
      return ctx.reply("Select a user");
    }
    else {
      return ctx.reply("select a role");
    }
  },
});
