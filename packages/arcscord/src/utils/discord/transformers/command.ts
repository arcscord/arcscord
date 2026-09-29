import type { APIApplicationCommandBasicOption, APIApplicationCommandOptionChoice } from "discord-api-types/v10";
import type { ArcClient } from "#/base";
import type { CommandContexts, CommandIntegrationType } from "#/base/command/command_definition.type";
import type { ChoiceNumber, ChoiceString, CommandOptionType, Option, OptionsList } from "#/base/command/option.type";
import type { LocalizationDefinition } from "#/localization";
import type { LocaleCallback } from "#/manager";
import type { LocaleMap } from "#/utils";
import type { ChannelType } from "#/utils/discord/type/channel.type";
import { commandContextsEnum, commandIntegrationTypesEnum, commandOptionTypesEnum } from "#/base/command/command.enum";
import { isLocalizationDefinition } from "#/localization";
import { channelTypeEnum } from "#/utils/discord/type/channel.enum";
import { localizationCallbackToMap } from "./localization";

export function localizationToAPI(
  locales: LocaleMap | LocaleCallback | LocalizationDefinition | undefined,
  client: ArcClient,
): LocaleMap | undefined {
  if (typeof locales === "undefined") {
    return undefined;
  }
  if (isLocalizationDefinition(locales)) {
    return client.localization.resolveLocalizations(locales);
  }
  if (typeof locales !== "function") {
    return locales;
  }
  if (!client.localeManager.enabled) {
    client.localeManager.trace("locale manager is disabled, skip localization");
    return undefined;
  }
  return localizationCallbackToMap(locales, client);
}

export function contextsToAPI(contexts: CommandContexts[]): number[] {
  return contexts.map(context => commandContextsEnum[context]);
}

export function integrationTypeToAPI(
  interactionTypes: CommandIntegrationType[],
): number[] {
  return interactionTypes.map(
    interactionType => commandIntegrationTypesEnum[interactionType],
  );
}

export function optionTypeToAPI(type: CommandOptionType): number {
  return commandOptionTypesEnum[type];
}

export function optionChannelTypeToAPI(
  channelTypes: Exclude<ChannelType, "dm" | "groupDm">[],
): number[] {
  return channelTypes.map(channelType => channelTypeEnum[channelType]);
}

function choicesToAPI(
  choices:
    | (string | number | APIApplicationCommandOptionChoice<string | number>)[]
    | Record<string, string | number>
    | undefined,
  client: ArcClient,
): APIApplicationCommandOptionChoice<string | number>[] | undefined {
  if (!choices) {
    return undefined;
  }

  if (Array.isArray(choices)) {
    return choices.map((choice) => {
      if (typeof choice === "string" || typeof choice === "number") {
        return { name: `${choice}`, value: choice };
      }
      const localizedChoice = choice as ChoiceString | ChoiceNumber;
      const nameLocalizations = localizationToAPI(localizedChoice.nameLocalizations, client);
      return {
        name: localizedChoice.name,
        ...(nameLocalizations ? { name_localizations: nameLocalizations } : {}),
        value: localizedChoice.value,
      };
    });
  }

  return Object.keys(choices).map((choice) => {
    return {
      name: choice,
      value: choices[choice],
    };
  });
}

export function stringChoiceToAPI(
  choices: (string | ChoiceString)[] | Record<string, string> | undefined,
  client: ArcClient,
): APIApplicationCommandOptionChoice<string>[] | undefined {
  return choicesToAPI(choices, client) as APIApplicationCommandOptionChoice<string>[] | undefined;
}

export function numberChoiceToAPI(
  choices: (number | ChoiceNumber)[] | Record<string, number> | undefined,
  client: ArcClient,
): APIApplicationCommandOptionChoice<number>[] | undefined {
  return choicesToAPI(choices, client) as APIApplicationCommandOptionChoice<number>[] | undefined;
}

export function optionToAPI(
  name: string,
  option: Option,
  client: ArcClient,
): APIApplicationCommandBasicOption {
  if ("choices" in option && option.choices && option.autocomplete) {
    throw new Error(`Option "${name}" cannot use choices and autocomplete together`);
  }

  const baseOption: Omit<APIApplicationCommandBasicOption, "type"> = {
    name,
    description: option.description,
    name_localizations: localizationToAPI(option.nameLocalizations, client),
    description_localizations: localizationToAPI(option.descriptionLocalizations, client),
    required: option.required,
  };

  switch (option.type) {
    case "string": {
      if ("choices" in option) {
        return {
          ...baseOption,
          type: optionTypeToAPI(option.type),
          min_length: option.min_length,
          max_length: option.max_length,
          autocomplete: option.autocomplete,
          choices: stringChoiceToAPI(option.choices, client),
        };
      }
      return {
        ...baseOption,
        type: optionTypeToAPI(option.type),
        min_length: option.min_length,
        max_length: option.max_length,
        choices: undefined,
        autocomplete:
          "autocomplete" in option ? option.autocomplete : undefined,
      };
    }

    case "number":
    case "integer": {
      if ("choices" in option) {
        return {
          ...baseOption,
          type: optionTypeToAPI(option.type),
          min_value: option.min_value,
          max_value: option.max_value,
          autocomplete: option.autocomplete,
          choices: numberChoiceToAPI(option.choices, client),
        };
      }

      return {
        ...baseOption,
        type: optionTypeToAPI(option.type),
        min_value: option.min_value,
        max_value: option.max_value,
        choices: undefined,
        autocomplete:
          "autocomplete" in option ? option.autocomplete : undefined,
      };
    }

    case "channel": {
      return {
        ...baseOption,
        type: optionTypeToAPI(option.type),
        channel_types: option.channel_types
          ? optionChannelTypeToAPI(option.channel_types)
          : undefined,
      };
    }

    case "user":
    case "role":
    case "mentionable":
    case "attachment":
    case "boolean": {
      return {
        ...baseOption,
        type: optionTypeToAPI(option.type),
      };
    }
  }
}

export function optionListToAPI(
  list: OptionsList,
  client: ArcClient,
): APIApplicationCommandBasicOption[] {
  const options: APIApplicationCommandBasicOption[] = [];
  for (const [name, option] of Object.entries(list)) {
    options.push(optionToAPI(name, option, client));
  }

  return options;
}
