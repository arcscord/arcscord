import type { Result } from "@arcscord/error";
import type { ArcClient } from "#/base";
import type {
  BaseCommandDefinition,
  Command,
  FullCommandDefinition,
  SlashCommandDefinition,
  SlashWithSubsCommandDefinition,
  SubCommandDefinition,
  SubCommandGroupDefinition,
} from "#/base/command/command_definition.type";
import type { Option, OptionsList } from "#/base/command/option.type";
import type { LocaleCallback } from "#/manager";
import type { LocaleMap } from "#/utils";
import type { ValidationContext, ValidationFailure } from "./validator.util";
import { error, ok } from "@arcscord/error";
import { isSubCommand } from "#/base/command";
import { localizationCallbackToMap } from "#/utils/discord/tranformers/localization";
import { ArcscordError } from "#/utils/error/arcscord_error";
import { arcscordErrorCodes } from "#/utils/error/codes";
import {
  validateLocalizations,
  validateLowercase,
  validateNumberBounds,
  validateOrderedBounds,
  validateRegex,
  validateRequiredStringLength,
  validateUniqueName,
} from "./validator.util";

const COMMAND_NAME_MAX_LENGTH = 32;
const COMMAND_DESCRIPTION_MAX_LENGTH = 100;
const COMMAND_CHOICE_NAME_MAX_LENGTH = 100;
const COMMAND_STRING_CHOICE_VALUE_MAX_LENGTH = 100;
const COMMAND_STRING_OPTION_MAX_LENGTH = 6000;
const SLASH_COMMAND_NAME_PATTERN = /^[-_'\p{L}\p{N}\p{Script=Devanagari}\p{Script=Thai}]{1,32}$/u;

type CommandValidationContext = ValidationContext;
type NameValidationMode = "slash" | "contextMenu";

export function validateCommands(
  commands: Command[],
  client: ArcClient,
  context: CommandValidationContext,
): Result<true, ValidationFailure> {
  const commandNames = new Map<string, string>();

  for (const command of commands) {
    if (!isSubCommand(command)) {
      const [validationErr] = validateCommandDefinition(command, client, context);
      if (validationErr) {
        return error(validationErr);
      }

      const commandEntries = [
        ["slash", command.slash],
        ["message", command.message],
        ["user", command.user],
      ] as const;

      for (const [type, definition] of commandEntries) {
        if (!definition) {
          continue;
        }

        const [duplicateErr] = validateUniqueName(
          commandNames,
          `${type}:${definition.name}`,
          definition.name,
          `${type} command`,
          context,
        );
        if (duplicateErr) {
          return error(duplicateErr);
        }
      }
    }
    else {
      const [validationErr] = validateSubCommandListDefinition(command, client, context);
      if (validationErr) {
        return error(validationErr);
      }

      const [duplicateErr] = validateUniqueName(
        commandNames,
        `slash:${command.name}`,
        command.name,
        "slash command",
        context,
      );
      if (duplicateErr) {
        return error(duplicateErr);
      }
    }
  }

  return ok(true);
}

function validateCommandDefinition(
  definition: FullCommandDefinition,
  client: ArcClient,
  context: CommandValidationContext,
): Result<true, ValidationFailure> {
  if (definition.slash) {
    const [err] = validateSlashCommandDefinition(definition.slash, `slash command "${definition.slash.name}"`, client, context);
    if (err) {
      return error(err);
    }
  }

  if (definition.message) {
    const [err] = validateBaseCommandDefinition(definition.message, `message command "${definition.message.name}"`, "contextMenu", client, context);
    if (err) {
      return error(err);
    }
  }

  if (definition.user) {
    const [err] = validateBaseCommandDefinition(definition.user, `user command "${definition.user.name}"`, "contextMenu", client, context);
    if (err) {
      return error(err);
    }
  }

  return ok(true);
}

function validateSubCommandListDefinition(
  command: SlashWithSubsCommandDefinition,
  client: ArcClient,
  context: CommandValidationContext,
): Result<true, ValidationFailure> {
  const [baseErr] = validateBaseCommandDefinition(command, `slash command "${command.name}"`, "slash", client, context);
  if (baseErr) {
    return error(baseErr);
  }

  const [descriptionErr] = validateDescription(
    command.description,
    command.descriptionLocalizations,
    `slash command "${command.name}" description`,
    client,
    context,
  );
  if (descriptionErr) {
    return error(descriptionErr);
  }

  const topLevelNames = new Map<string, string>();

  for (const subCommand of command.subCommands ?? []) {
    const [duplicateErr] = validateUniqueName(
      topLevelNames,
      subCommand.name,
      subCommand.name,
      `subcommand in slash command "${command.name}"`,
      context,
    );
    if (duplicateErr) {
      return error(duplicateErr);
    }

    const [subCommandErr] = validateSubCommandDefinition(
      subCommand,
      `subcommand "${command.name}.${subCommand.name}"`,
      client,
      context,
    );
    if (subCommandErr) {
      return error(subCommandErr);
    }
  }

  for (const [groupName, subCommandGroup] of Object.entries(command.subCommandsGroups ?? {})) {
    const [duplicateErr] = validateUniqueName(
      topLevelNames,
      groupName,
      groupName,
      `subcommand group in slash command "${command.name}"`,
      context,
    );
    if (duplicateErr) {
      return error(duplicateErr);
    }

    const [groupErr] = validateSubCommandGroupDefinition(
      groupName,
      subCommandGroup,
      `subcommand group "${command.name}.${groupName}"`,
      client,
      context,
    );
    if (groupErr) {
      return error(groupErr);
    }
  }

  return ok(true);
}

function validateBaseCommandDefinition(
  command: BaseCommandDefinition,
  path: string,
  mode: NameValidationMode,
  client: ArcClient,
  context: CommandValidationContext,
): Result<true, ValidationFailure> {
  return validateName(command.name, command.nameLocalizations, `${path} name`, mode, client, context);
}

function validateSlashCommandDefinition(
  command: SlashCommandDefinition,
  path: string,
  client: ArcClient,
  context: CommandValidationContext,
): Result<true, ValidationFailure> {
  const [baseErr] = validateBaseCommandDefinition(command, path, "slash", client, context);
  if (baseErr) {
    return error(baseErr);
  }

  const [descriptionErr] = validateDescription(command.description, command.descriptionLocalizations, `${path} description`, client, context);
  if (descriptionErr) {
    return error(descriptionErr);
  }

  if (command.options) {
    const [optionsErr] = validateOptions(command.options, `${path} option`, client, context);
    if (optionsErr) {
      return error(optionsErr);
    }
  }

  return ok(true);
}

function validateSubCommandDefinition(
  command: SubCommandDefinition,
  path: string,
  client: ArcClient,
  context: CommandValidationContext,
): Result<true, ValidationFailure> {
  const [nameErr] = validateName(command.name, command.nameLocalizations, `${path} name`, "slash", client, context);
  if (nameErr) {
    return error(nameErr);
  }

  const [descriptionErr] = validateDescription(command.description, command.descriptionLocalizations, `${path} description`, client, context);
  if (descriptionErr) {
    return error(descriptionErr);
  }

  if (command.options) {
    const [optionsErr] = validateOptions(command.options, `${path} option`, client, context);
    if (optionsErr) {
      return error(optionsErr);
    }
  }

  return ok(true);
}

function validateSubCommandGroupDefinition(
  name: string,
  groupDefinition: SubCommandGroupDefinition,
  path: string,
  client: ArcClient,
  context: CommandValidationContext,
): Result<true, ValidationFailure> {
  const [nameErr] = validateName(name, groupDefinition.nameLocalizations, `${path} name`, "slash", client, context);
  if (nameErr) {
    return error(nameErr);
  }

  const [descriptionErr] = validateDescription(groupDefinition.description, groupDefinition.descriptionLocalizations, `${path} description`, client, context);
  if (descriptionErr) {
    return error(descriptionErr);
  }

  const subCommandNames = new Map<string, string>();

  for (const subCommand of groupDefinition.subCommands) {
    const [duplicateErr] = validateUniqueName(
      subCommandNames,
      subCommand.name,
      subCommand.name,
      `${path} subcommand`,
      context,
    );
    if (duplicateErr) {
      return error(duplicateErr);
    }

    const [subCommandErr] = validateSubCommandDefinition(
      subCommand,
      `${path} subcommand "${subCommand.name}"`,
      client,
      context,
    );
    if (subCommandErr) {
      return error(subCommandErr);
    }
  }

  return ok(true);
}

function validateOptions(
  options: OptionsList,
  path: string,
  client: ArcClient,
  context: CommandValidationContext,
): Result<true, ValidationFailure> {
  const optionNames = new Map<string, string>();

  for (const [optionName, option] of Object.entries(options)) {
    const optionPath = `${path} "${optionName}"`;
    const [duplicateErr] = validateUniqueName(optionNames, optionName, optionName, `${path}s`, context);
    if (duplicateErr) {
      return error(duplicateErr);
    }

    const [nameErr] = validateName(optionName, option.nameLocalizations, `${optionPath} name`, "slash", client, context);
    if (nameErr) {
      return error(nameErr);
    }

    const [descriptionErr] = validateDescription(option.description, option.descriptionLocalizations, `${optionPath} description`, client, context);
    if (descriptionErr) {
      return error(descriptionErr);
    }

    if (option.type === "string") {
      const [lengthErr] = validateStringOptionLengthBounds(option, optionPath, context);
      if (lengthErr) {
        return error(lengthErr);
      }
    }

    if ("choices" in option && option.choices) {
      const [choicesErr] = validateOptionChoices(optionName, option, optionPath, client, context);
      if (choicesErr) {
        return error(choicesErr);
      }
    }
  }

  return ok(true);
}

function validateStringOptionLengthBounds(option: Option, path: string, context: CommandValidationContext): Result<true, ValidationFailure> {
  if (option.type !== "string") {
    return ok(true);
  }

  const [minErr] = validateNumberBounds(option.min_length, path, "min_length", 0, COMMAND_STRING_OPTION_MAX_LENGTH, context);
  if (minErr) {
    return error(minErr);
  }

  const [maxErr] = validateNumberBounds(option.max_length, path, "max_length", 1, COMMAND_STRING_OPTION_MAX_LENGTH, context);
  if (maxErr) {
    return error(maxErr);
  }

  return validateOrderedBounds(option.min_length, option.max_length, path, "min_length", "max_length", context);
}

function validateOptionChoices(
  optionName: string,
  option: Option,
  path: string,
  client: ArcClient,
  context: CommandValidationContext,
): Result<true, ValidationFailure> {
  if (!("choices" in option) || !option.choices) {
    return ok(true);
  }

  const choiceNames = new Map<string, string>();
  const choices = Array.isArray(option.choices)
    ? option.choices.map((choice) => {
        if (typeof choice === "string" || typeof choice === "number") {
          return { name: `${choice}`, value: choice, nameLocalizations: undefined };
        }

        return choice;
      })
    : Object.entries(option.choices).map(([name, value]) => ({ name, value, nameLocalizations: undefined }));

  for (const choice of choices) {
    const [duplicateErr] = validateUniqueName(choiceNames, choice.name, choice.name, `${path} choice`, context);
    if (duplicateErr) {
      return error(duplicateErr);
    }

    const [nameErr] = validateChoiceName(choice.name, choice.nameLocalizations, `${path} choice "${choice.name}" name`, client, context);
    if (nameErr) {
      return error(nameErr);
    }

    if (option.type === "string" && typeof choice.value === "string" && choice.value.length > COMMAND_STRING_CHOICE_VALUE_MAX_LENGTH) {
      const message = `${path} choice "${choice.name}" value must be at most ${COMMAND_STRING_CHOICE_VALUE_MAX_LENGTH} characters`;
      const metadata = {
        rule: "choice-value-length",
        group: context.group,
        optionName,
        path,
        valueLength: choice.value.length,
        maxLength: COMMAND_STRING_CHOICE_VALUE_MAX_LENGTH,
      };
      return error(context.createError?.({ message, metadata }) ?? new ArcscordError({
        code: arcscordErrorCodes.CommandValidationFailed,
        message,
        metadata,
      }));
    }
  }

  return ok(true);
}

function validateName(
  value: string,
  localizations: LocaleMap | LocaleCallback | undefined,
  path: string,
  mode: NameValidationMode,
  client: ArcClient,
  context: CommandValidationContext,
): Result<true, ValidationFailure> {
  const [lengthErr] = validateRequiredStringLength(value, path, COMMAND_NAME_MAX_LENGTH, context);
  if (lengthErr) {
    return error(lengthErr);
  }

  if (mode === "slash") {
    const [formatErr] = validateSlashNameFormat(value, path, context);
    if (formatErr) {
      return error(formatErr);
    }
  }

  return validateLocalizations(resolveLocalizations(localizations, client), path, context, (localeValue, localePath) => {
    const [localeLengthErr] = validateRequiredStringLength(localeValue, localePath, COMMAND_NAME_MAX_LENGTH, context);
    if (localeLengthErr) {
      return error(localeLengthErr);
    }

    if (mode === "slash") {
      return validateSlashNameFormat(localeValue, localePath, context);
    }

    return ok(true);
  });
}

function validateChoiceName(
  value: string,
  localizations: LocaleMap | LocaleCallback | undefined,
  path: string,
  client: ArcClient,
  context: CommandValidationContext,
): Result<true, ValidationFailure> {
  const [lengthErr] = validateRequiredStringLength(value, path, COMMAND_CHOICE_NAME_MAX_LENGTH, context);
  if (lengthErr) {
    return error(lengthErr);
  }

  return validateLocalizations(resolveLocalizations(localizations, client), path, context, (localeValue, localePath) => {
    return validateRequiredStringLength(localeValue, localePath, COMMAND_CHOICE_NAME_MAX_LENGTH, context);
  });
}

function validateDescription(
  value: string,
  localizations: LocaleMap | LocaleCallback | undefined,
  path: string,
  client: ArcClient,
  context: CommandValidationContext,
): Result<true, ValidationFailure> {
  const [lengthErr] = validateRequiredStringLength(value, path, COMMAND_DESCRIPTION_MAX_LENGTH, context);
  if (lengthErr) {
    return error(lengthErr);
  }

  return validateLocalizations(resolveLocalizations(localizations, client), path, context, (localeValue, localePath) => {
    return validateRequiredStringLength(localeValue, localePath, COMMAND_DESCRIPTION_MAX_LENGTH, context);
  });
}

function validateSlashNameFormat(value: string, path: string, context: CommandValidationContext): Result<true, ValidationFailure> {
  const [lowercaseErr] = validateLowercase(value, path, context);
  if (lowercaseErr) {
    return error(lowercaseErr);
  }

  return validateRegex(
    value,
    path,
    SLASH_COMMAND_NAME_PATTERN,
    `${path} contains characters that Discord does not allow`,
    context,
  );
}

function resolveLocalizations(
  localizations: LocaleMap | LocaleCallback | undefined,
  client: ArcClient,
): LocaleMap | undefined {
  if (!localizations) {
    return undefined;
  }

  if (typeof localizations !== "function") {
    return localizations;
  }

  if (!client.localeManager.enabled) {
    return undefined;
  }

  return localizationCallbackToMap(localizations, client);
}
