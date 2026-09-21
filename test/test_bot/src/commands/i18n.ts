import { actionRow, createCommand } from "arcscord";
import { MessageFlags } from "discord.js";
import { i18nButton } from "../components/i18n_button";
import { localization } from "../localization";

export const i18nCommand = createCommand({
  slash: {
    name: "i18n",
    nameLocalizations: localization.l($ => $.i18n.command.name),
    description: "default description",
    descriptionLocalizations: localization.localizations($ => $.i18n.command.description),
    options: {
      topic: {
        description: "Localized autocomplete topic",
        nameLocalizations: localization.l($ => $.i18n.autocomplete.option.name),
        descriptionLocalizations: localization.l($ => $.i18n.autocomplete.option.description),
        type: "string",
        autocomplete: true,
        required: true,
      },
    },
  },
  run: (ctx) => {
    return ctx.reply({
      components: [actionRow(i18nButton.build())],
      content: localization.localize(ctx)($ => $.i18n.command.run, {
        topic: ctx.options.topic,
      }),
      flags: MessageFlags.Ephemeral,
    });
  },
  autocomplete: {
    topic: (ctx) => {
      return ctx.sendChoices([
        {
          name: localization.localize(ctx)($ => $.i18n.autocomplete.choices.command),
          value: "command",
        },
        {
          name: localization.localize(ctx)($ => $.i18n.autocomplete.choices.component),
          value: "component",
        },
        {
          name: localization.localize(ctx)($ => $.i18n.autocomplete.choices.autocomplete),
          value: "autocomplete",
        },
      ]);
    },
  },
});
