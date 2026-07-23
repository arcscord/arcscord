import type {
  APIApplicationCommandSubcommandGroupOption,
  APIApplicationCommandSubcommandOption,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import type {
  APICommandObject,
  ArcClient,
  FullCommandDefinition,
  SlashWithSubsCommandDefinition,
  SubCommandDefinition,
} from "#/base";
import type {
  CommandContexts,
  CommandIntegrationType,
} from "#/base/command/command_definition.type";
import type { LocaleCallback } from "#/manager";
import type { LocaleMap } from "#/utils";
import { ApplicationCommandOptionType, ApplicationCommandType } from "discord-api-types/v10";
import {
  contextsToAPI,
  integrationTypeToAPI,
  localizationToAPI,
  optionListToAPI,
} from "#/utils/discord/transformers/command";
import { permissionToAPI } from "#/utils/discord/transformers/permission";

/** Metadata shared by top-level command definitions and sub-command groups. */
type CommonCommandMetadata = {
  name: string;
  nameLocalizations?: LocaleMap | LocaleCallback;
  defaultMemberPermissions?: Parameters<typeof permissionToAPI>[0];
  nsfw?: boolean;
  contexts?: CommandContexts[];
  integrationTypes?: CommandIntegrationType[];
};

/**
 * Builds the Discord API fields shared by every command flavor (name, name
 * localizations, default member permissions, nsfw, contexts and integration
 * types) so they are declared in a single place.
 */
function commonCommandMetadataToAPI(def: CommonCommandMetadata, client: ArcClient): {
  name: string;
  name_localizations: LocaleMap | undefined;
  default_member_permissions: ReturnType<typeof permissionToAPI> | undefined;
  nsfw: boolean | undefined;
  contexts: number[] | undefined;
  integration_types: number[] | undefined;
} {
  return {
    name: def.name,
    name_localizations: localizationToAPI(def.nameLocalizations, client),
    default_member_permissions: def.defaultMemberPermissions
      ? permissionToAPI(def.defaultMemberPermissions)
      : undefined,
    nsfw: def.nsfw,
    contexts: def.contexts ? contextsToAPI(def.contexts) : undefined,
    integration_types: def.integrationTypes
      ? integrationTypeToAPI(def.integrationTypes)
      : undefined,
  };
}

export function commandToAPI(definer: FullCommandDefinition, client: ArcClient): APICommandObject {
  const obj: APICommandObject = {};

  if (definer.slash) {
    const def = definer.slash;

    obj.slash = {
      type: ApplicationCommandType.ChatInput,
      ...commonCommandMetadataToAPI(def, client),
      description: def.description,
      description_localizations: localizationToAPI(def.descriptionLocalizations, client),
      options: def.options ? optionListToAPI(def.options, client) : undefined,
    };
  }

  if (definer.user) {
    const def = definer.user;

    obj.user = {
      type: ApplicationCommandType.User,
      ...commonCommandMetadataToAPI(def, client),
    };
  }

  if (definer.message) {
    const def = definer.message;

    obj.message = {
      type: ApplicationCommandType.Message,
      ...commonCommandMetadataToAPI(def, client),
    };
  }

  return obj;
}

function subCommandToAPI(
  definer: SubCommandDefinition,
  client: ArcClient,
): APIApplicationCommandSubcommandOption {
  return {
    type: ApplicationCommandOptionType.Subcommand,
    name: definer.name,
    description: definer.description,
    name_localizations: localizationToAPI(definer.nameLocalizations, client),
    description_localizations: localizationToAPI(definer.descriptionLocalizations, client),
    options: definer.options ? optionListToAPI(definer.options, client) : undefined,
  };
}

export function subCommandListToAPI(
  def: SlashWithSubsCommandDefinition,
  client: ArcClient,
): RESTPostAPIChatInputApplicationCommandsJSONBody {
  const subCommands: (
    | APIApplicationCommandSubcommandOption
    | APIApplicationCommandSubcommandGroupOption
  )[] = [];

  if (def.subCommands) {
    subCommands.push(
      ...def.subCommands.map(cmd => subCommandToAPI(cmd, client)),
    );
  }

  if (def.subCommandsGroups) {
    for (const [name, option] of Object.entries(def.subCommandsGroups)) {
      subCommands.push({
        type: ApplicationCommandOptionType.SubcommandGroup,
        name,
        description: option.description,
        name_localizations: localizationToAPI(option.nameLocalizations, client),
        description_localizations: localizationToAPI(option.descriptionLocalizations, client),
        options: option.subCommands.map(cmd => subCommandToAPI(cmd, client)),
      });
    }
  }

  return {
    ...commonCommandMetadataToAPI(def, client),
    description: def.description,
    description_localizations: localizationToAPI(def.descriptionLocalizations, client),
    options: subCommands,
  };
}
