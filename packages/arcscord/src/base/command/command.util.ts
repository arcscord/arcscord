import type {
  AutocompleteInteraction,
  CommandInteraction,
  CommandInteractionOption,
} from "discord.js";
import type { AnyCommandHandler, AutocompleteCommand } from "#/base";
import type {
  FullCommandDefinition,
  PartialCommandDefinitionForMessage,
  PartialCommandDefinitionForSlash,
  PartialCommandDefinitionForUser,
  SlashWithSubsCommandDefinition,
} from "#/base/command/command_definition.type";
import { ApplicationCommandOptionType } from "discord-api-types/v10";

/**
 * @internal
 */
export function isSubCommand(
  props: AnyCommandHandler | SlashWithSubsCommandDefinition,
): props is SlashWithSubsCommandDefinition {
  return "name" in props;
}

/**
 * @internal
 */
export function hasSlashCommand(
  definer: FullCommandDefinition,
): definer is PartialCommandDefinitionForSlash {
  return "slash" in definer;
}

/**
 * @internal
 */
export function hasMessageCommand(
  definer: FullCommandDefinition,
): definer is PartialCommandDefinitionForMessage {
  return "message" in definer;
}

/**
 * @internal
 */
export function hasUserCommand(
  definer: FullCommandDefinition,
): definer is PartialCommandDefinitionForUser {
  return "user" in definer;
}

/**
 * @internal
 */
export function hasAutocomplete(
  command: object,
): command is AutocompleteCommand {
  return "autocomplete" in command;
}

/**
 * Converts a CommandInteractionOption to a string representation based on its
 * ApplicationCommandOptionType, like `Number<30>`
 *
 * @param option - The option to be converted to string.
 * @returns The string representation of the command option.
 */
export function slashCommandOptionValueToString(
  option: CommandInteractionOption,
): string {
  switch (option.type as ApplicationCommandOptionType) {
    case ApplicationCommandOptionType.Subcommand: {
      return `Sub<${option.name}>`;
    }
    case ApplicationCommandOptionType.SubcommandGroup: {
      return `SubGroup<${option.name}>`;
    }
    case ApplicationCommandOptionType.String: {
      return `String<${option.value}>`;
    }
    case ApplicationCommandOptionType.Integer: {
      return `Integer<${option.value}>`;
    }
    case ApplicationCommandOptionType.Boolean: {
      return `Boolean<${option.value}>`;
    }
    case ApplicationCommandOptionType.User: {
      return `User<${option.value}>`;
    }
    case ApplicationCommandOptionType.Channel: {
      return `Channel<${option.value}>`;
    }
    case ApplicationCommandOptionType.Role: {
      return `Role<${option.value}>`;
    }
    case ApplicationCommandOptionType.Mentionable: {
      return `Mentionable<${option.value}>`;
    }
    case ApplicationCommandOptionType.Number: {
      return `Number<${option.value}>`;
    }
    case ApplicationCommandOptionType.Attachment: {
      return `Attachment<${typeof option.value === "string" && option.value.length < 50 ? option.value : "to length"}>`;
    }
    default: {
      return `Unknown<${option.value}>`;
    }
  }
}

/**
 * Make a full string of the command like `slash:ping (1292499977658040353)`
 * @param interaction the interaction of the command
 * @param noOptions if add value of options for slashCommands
 */
export function commandInteractionToString(
  interaction: CommandInteraction | AutocompleteInteraction,
  noOptions = true,
): string {
  switch (true) {
    case interaction.isChatInputCommand(): {
      let commandName = interaction.commandName;

      let options = interaction.options.data;
      if (
        (options[0]?.type as ApplicationCommandOptionType)
        === ApplicationCommandOptionType.SubcommandGroup
      ) {
        commandName += `.${options[0].name}`;
        options = options[0].options || [];
      }

      if (
        (options[0]?.type as ApplicationCommandOptionType)
        === ApplicationCommandOptionType.Subcommand
      ) {
        commandName += `.${options[0].name}`;
        options = options[0].options || [];
      }

      const stringOptions = options
        .map(
          option =>
            `${option.name}=${slashCommandOptionValueToString(option)}`,
        )
        .join(" ");

      return `slash:${commandName} (${interaction.commandId})${noOptions ? "" : ` ${stringOptions}`}`;
    }
    case interaction.isUserContextMenuCommand(): {
      return `user:${interaction.commandName} (${interaction.commandId}) targetUser=${interaction.targetId}`;
    }

    case interaction.isMessageContextMenuCommand(): {
      const targetChannel = interaction.targetMessage.channelId;
      const targetGuild = interaction.targetMessage.guildId;

      return (
        `msg:${interaction.commandName} (${interaction.commandId}) targetMessage=${interaction.targetId}`
        + ` targetChannel=${targetChannel}${
          targetGuild ? ` targetGuild=${targetGuild}` : ""
        }`
      );
    }
    default: {
      return "Unknown Command";
    }
  }
}
