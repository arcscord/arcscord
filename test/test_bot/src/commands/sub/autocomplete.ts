import { createCommand } from "arcscord";
import { MessageFlags } from "discord.js";
import { animeList } from "../../utils/test_values";

export const autocompleteSubCommand = createCommand({
  build: {
    name: "autocomplete",
    description: "autocomplete command testing",
    options: {
      anime: {
        description: "Your favorite anime",
        type: "string",
        autocomplete: true,
        required: true,
      },
    },
  },
  run: (ctx) => {
    return ctx.reply({
      flags: MessageFlags.Ephemeral,
      content: `You choice ${ctx.options.anime}`,
    });
  },
  autocomplete: {
    anime: (ctx) => {
      const choices = animeList
        .filter(anime => anime.includes(ctx.value))
        .slice(0, 25);
      return ctx.sendChoices(choices);
    },
  },
});
