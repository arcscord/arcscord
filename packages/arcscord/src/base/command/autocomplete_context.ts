import type {
  ApplicationCommandOptionChoiceData,
  AutocompleteFocusedOption,
  AutocompleteInteraction,
} from "discord.js";
import type i18next from "i18next";
import type {
  AnyCommandHandler,
  AnySubCommandHandler,
  ArcClient,
  CommandRunResult,
  NumberChoices,
  StringChoices,
} from "#/base";
import type {
  FullCommandDefinition,
  PartialCommandDefinitionForSlash,
  SubCommandDefinition,
} from "#/base/command/command_definition.type";
import type {
  BaseIntegerOption,
  BaseNumberOption,
  BaseStringOption,
  Option,
  OptionsList,
} from "#/base/command/option.type";
import type { ContextDocs } from "#/base/utils/context.type";
import type { MaybePromise } from "#/utils/type/util.type";
import { anyToError, error, ok } from "@arcscord/error";
import { ArcscordError, arcscordErrorCodes } from "#/utils";
import { InteractionContext } from "../utils/interaction_context.class";

type BaseAutocompleteOptions = {
  resolvedName: string;
  client: ArcClient;
  locale: string;
};

type AutocompleteOptionsDef<
  T extends FullCommandDefinition | SubCommandDefinition,
> = T extends PartialCommandDefinitionForSlash
  ? T["slash"]["options"] extends OptionsList
    ? T["slash"]["options"]
    : never
  : T extends SubCommandDefinition
    ? T["options"] extends OptionsList
      ? T["options"]
      : never
    : never;

/** The union of option names in `T` that are declared with `autocomplete: true`. */
export type AutocompleteOptionName<T extends OptionsList> = {
  [K in keyof T]: T[K] extends { autocomplete: true } ? K : never;
}[keyof T] & string;

type AutocompleteOptionByName<
  T extends OptionsList,
  Name extends AutocompleteOptionName<T>,
> = T[Name] extends { autocomplete: true } ? T[Name] : never;

type AutocompleteValue<T extends Option>
  = T extends BaseStringOption | BaseIntegerOption | BaseNumberOption
    ? string
    : never;

type AutocompleteChoices<T extends Option>
  = T extends BaseStringOption
    ? StringChoices
    : T extends BaseIntegerOption | BaseNumberOption
      ? NumberChoices
      : never;

/**
 * Handler for a single autocomplete-enabled option: receives a typed
 * {@link AutocompleteContext} for the option and returns the choices to display.
 *
 * @typeParam Build - The command (or sub-command) definition the option belongs to.
 * @typeParam Name - The name of the autocomplete option handled.
 */
export type AutocompleteHandler<
  Build extends FullCommandDefinition | SubCommandDefinition,
  Name extends AutocompleteOptionName<AutocompleteOptionsDef<Build>>,
> = {
  /** Bivariance-preserving wrapper. @internal */
  bivarianceHack: (
    ctx: AutocompleteContext<Build, Name>,
  ) => MaybePromise<CommandRunResult>;
}["bivarianceHack"];

/**
 * Map associating each autocomplete-enabled option of a command definition with
 * its {@link AutocompleteHandler}.
 *
 * @typeParam Build - The command (or sub-command) definition.
 */
export type AutocompleteHandlers<
  Build extends FullCommandDefinition | SubCommandDefinition,
> = {
  [Name in AutocompleteOptionName<AutocompleteOptionsDef<Build>>]:
  Name extends never ? never : AutocompleteHandler<Build, Name>;
};

type AutocompleteChoicesFor<
  Build extends FullCommandDefinition | SubCommandDefinition,
  Name extends string,
> = Name extends AutocompleteOptionName<AutocompleteOptionsDef<Build>>
  ? AutocompleteChoices<AutocompleteOptionByName<AutocompleteOptionsDef<Build>, Name>>
  : StringChoices | NumberChoices;

type StoredCommandHandler = AnyCommandHandler | AnySubCommandHandler;

type AutocompleteValueFor<
  Build extends FullCommandDefinition | SubCommandDefinition,
  Name extends string,
> = Name extends AutocompleteOptionName<AutocompleteOptionsDef<Build>>
  ? AutocompleteValue<AutocompleteOptionByName<AutocompleteOptionsDef<Build>, Name>>
  : string;

/**
 * Base class for handling autocomplete context.
 */
export class AutocompleteContext<
  Build extends FullCommandDefinition | SubCommandDefinition = FullCommandDefinition | SubCommandDefinition,
  Name extends string = string,
  InGuild extends true | false = true | false,
> extends InteractionContext<InGuild> implements ContextDocs {
  client: ArcClient;

  command: StoredCommandHandler;

  interaction: AutocompleteInteraction;

  resolvedCommandName: string;

  /**
   * get a locale text, with language detected self
   */
  t: typeof i18next.t;

  /**
   * Detected i18next language used by this autocomplete context.
   */
  locale: string;

  /**
   * Constructs a new BaseAutocompleteContext.
   *
   * @param command - The command props.
   * @param interaction - The autocomplete interaction.
   * @param options - The base autocomplete options.
   */
  constructor(
    command: StoredCommandHandler,
    interaction: AutocompleteInteraction,
    options: BaseAutocompleteOptions,
  ) {
    super(options.client, interaction);
    this.command = command;
    this.interaction = interaction;
    this.resolvedCommandName = options.resolvedName;
    this.client = options.client;
    this.locale = options.locale;
    if (this.client.localeManager.enabled) {
      this.t = this.client.localeManager.i18n.getFixedT(options.locale);
    }
    else {
      this.t = this.client.localeManager.t;
    }
  }

  /**
   * Gets the focused option name.
   */
  get name(): Name {
    return this.fullFocus.name as Name;
  }

  /**
   * Gets the focused option value.
   */
  get value(): AutocompleteValueFor<Build, Name> {
    return this.fullFocus.value as AutocompleteValueFor<Build, Name>;
  }

  /**
   * Gets the full focused option.
   */
  get fullFocus(): AutocompleteFocusedOption {
    return this.interaction.options.getFocused(true);
  }

  /**
   * Sends choices to the interaction.
   *
   * @param choices - The choices to send.
   * @returns A promise that resolves to CommandRunResult.
   */
  async sendChoices(
    choices: AutocompleteChoicesFor<Build, Name>,
  ): Promise<CommandRunResult<ArcscordError<"INTERACTION_OPERATION_FAILED">>> {
    try {
      const apiChoices: ApplicationCommandOptionChoiceData[] = [];

      if (Array.isArray(choices)) {
        for (const choice of choices) {
          if (typeof choice === "object") {
            if (typeof choice.nameLocalizations === "function") {
              const nameLocalization = choice.nameLocalizations(this.t);
              apiChoices.push({ ...choice, nameLocalizations: {
                [this.interaction.locale]: nameLocalization,
              } });
            }
            else {
              apiChoices.push(choice as ApplicationCommandOptionChoiceData);
            }
          }
          else {
            apiChoices.push({
              name: `${choice}`,
              value: choice,
            });
          }
        }
      }
      else {
        for (const choice of Object.keys(choices)) {
          apiChoices.push({
            name: choice,
            value: choices[choice],
          });
        }
      }

      await this.interaction.respond(apiChoices);
      return ok(true);
    }
    catch (e) {
      return error(
        new ArcscordError({
          code: arcscordErrorCodes.InteractionOperationFailed,
          message: `Failed to send choices for command, error : ${anyToError(e).message}`,
          metadata: { operation: "autocomplete" },
          cause: e,
        }),
      );
    }
  }

  /**
   * Returns a successful CommandRunResult.
   *
   * @param value A value to pass to the command. Can be a string or true.
   */
  ok(value: string | true = true): CommandRunResult {
    return ok(value);
  }

  /**
   * Returns a failed CommandRunResult.
   *
   * @param failure - The expected failure value.
   */
  error<E>(failure: E): CommandRunResult<E> {
    return error(failure);
  }

  /**
   * Executes multiple functions in sequence, returning an error if any fail.
   *
   * @param funcList - The list of functions to execute.
   * @returns A promise that resolves to CommandRunResult.
   */
  async multiple(
    ...funcList: Promise<CommandRunResult<ArcscordError<"INTERACTION_OPERATION_FAILED">>>[]
  ): Promise<CommandRunResult<ArcscordError<"INTERACTION_OPERATION_FAILED">>> {
    for (const func of funcList) {
      const [err] = await func;

      if (err) {
        return error(err);
      }
    }

    return ok(true);
  }
}
