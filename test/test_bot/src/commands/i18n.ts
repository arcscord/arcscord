import { actionRow, createCommand } from "arcscord";
import { MessageFlags } from "discord.js";
import { i18nButton } from "../components/i18n_button";

export const i18nCommand = createCommand({
  slash: {
    name: "i18n",
    nameLocalizations: t => t($ => $.i18n.command.name),
    description: "default description",
    descriptionLocalizations: t => t($ => $.i18n.command.description),
    options: {
      topic: {
        description: "Localized autocomplete topic",
        nameLocalizations: t => t($ => $.i18n.autocomplete.option.name),
        descriptionLocalizations: t => t($ => $.i18n.autocomplete.option.description),
        type: "string",
        autocomplete: true,
        required: true,
      },
    },
  },
  run: (ctx) => {
    return ctx.reply({
      components: [actionRow(i18nButton.build())],
      content: ctx.t($ => $.i18n.command.run, {
        topic: ctx.options.topic,
      }),
      flags: MessageFlags.Ephemeral,
    });
  },
  autocomplete: {
    topic: (ctx) => {
      return ctx.sendChoices([
        {
          name: ctx.t($ => $.i18n.autocomplete.choices.command),
          value: "command",
        },
        {
          name: ctx.t($ => $.i18n.autocomplete.choices.component),
          value: "component",
        },
        {
          name: ctx.t($ => $.i18n.autocomplete.choices.autocomplete),
          value: "autocomplete",
        },
      ]);
    },
  },
});
