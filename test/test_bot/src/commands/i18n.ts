import { actionRow, createCommand } from "arcscord";
import { MessageFlags } from "discord.js";
import { i18nButton } from "../components/i18n_button";
import { localization } from "../localization";
import * as messages from "../paraglide/messages.js";

export const i18nCommand = createCommand({
  slash: {
    name: "i18n",
    nameLocalizations: localization.discord(messages.i18n_command_name),
    description: "default description",
    descriptionLocalizations: localization.discord(messages.i18n_command_description),
    options: {
      topic: {
        description: "Localized autocomplete topic",
        nameLocalizations: localization.discord(messages.i18n_autocomplete_option_name),
        descriptionLocalizations: localization.discord(messages.i18n_autocomplete_option_description),
        type: "string",
        autocomplete: true,
        required: true,
      },
    },
  },
  run: (ctx) => {
    const m = localization.getFixed(ctx);
    return ctx.reply({
      components: [actionRow(i18nButton.build())],
      content: m.i18n_command_run({
        topic: ctx.options.topic,
      }),
      flags: MessageFlags.Ephemeral,
    });
  },
  autocomplete: {
    topic: (ctx) => {
      const m = localization.getFixed(ctx);
      return ctx.sendChoices([
        {
          name: m.i18n_autocomplete_choice_command(),
          value: "command",
        },
        {
          name: m.i18n_autocomplete_choice_component(),
          value: "component",
        },
        {
          name: m.i18n_autocomplete_choice_autocomplete(),
          value: "autocomplete",
        },
      ]);
    },
  },
});
