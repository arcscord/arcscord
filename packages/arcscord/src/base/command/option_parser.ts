import type { Result } from "@arcscord/error";
import type {
  Attachment,
  ChatInputCommandInteraction,
  GuildBasedChannel,
} from "discord.js";
import type {
  ChannelOption,
  ContextOptions,
  NumberChoices,
  Option,
  OptionsList,
  StringChoices,
} from "#/base/command/option.type";
import { anyToError, error, ok } from "@arcscord/error";
import {
  BaseChannel,
  Attachment as DiscordAttachment,
  GuildMember,
  Role,
  User,
} from "discord.js";
import { ArcscordError, arcscordErrorCodes } from "#/utils";
import { channelTypeEnum } from "#/utils/discord/type/channel.enum";

type ParsedOptionValue
  = | Attachment
    | boolean
    | GuildBasedChannel
    | number
    | Role
    | string
    | undefined
    | User;

type NumberOption = Extract<Option, { type: "integer" | "number" }>;
type ParserContext = {
  interaction: ChatInputCommandInteraction;
  name: string;
  option: Option;
  optionsList: OptionsList;
};
type StringOption = Extract<Option, { type: "string" }>;

class CommandOptionParsingError extends ArcscordError<"COMMAND_OPTION_PARSING_FAILED"> {
  constructor(options: { cause?: unknown; message: string; metadata: Record<string, unknown> }) {
    super({
      code: arcscordErrorCodes.CommandOptionParsingFailed,
      message: options.message,
      metadata: options.metadata,
      cause: options.cause,
    });
  }
}

/**
 * Parses the configured options from a chat-input interaction.
 *
 * @internal
 */
export async function parseOptions<T extends OptionsList>(
  interaction: ChatInputCommandInteraction,
  optionsList: T,
): Promise<Result<ContextOptions<T>, CommandOptionParsingError>> {
  const parsed: Record<string, ParsedOptionValue> = {};

  for (const [name, option] of Object.entries(optionsList)) {
    const context: ParserContext = { interaction, name, option, optionsList };
    const [parseError, value] = await parseOption(context);

    if (parseError !== null) {
      return error(parseError);
    }

    parsed[name] = value;
  }

  return ok(parsed as ContextOptions<T>);
}

async function parseOption(
  context: ParserContext,
): Promise<Result<ParsedOptionValue, CommandOptionParsingError>> {
  switch (context.option.type) {
    case "user":
      return parseSimpleOption(
        context,
        () => context.interaction.options.getUser(context.name, false),
        value => value instanceof User,
      );
    case "boolean":
      return parseSimpleOption(
        context,
        () => context.interaction.options.getBoolean(context.name, false),
        value => typeof value === "boolean",
      );
    case "attachment":
      return parseSimpleOption(
        context,
        () => context.interaction.options.getAttachment(context.name, false),
        value => value instanceof DiscordAttachment,
      );
    case "string":
      return parseStringOption(context, context.option);
    case "integer":
    case "number":
      return parseNumberOption(context, context.option);
    case "role":
      return parseRoleOption(context);
    case "channel":
      return parseChannelOption(context, context.option);
    case "mentionable":
      return parseMentionableOption(context);
    default:
      return error(createParsingError(
        context,
        `Unsupported option type "${String((context.option as Option).type)}" for option ${context.name}`,
      ));
  }
}

function parseSimpleOption<T extends ParsedOptionValue>(
  context: ParserContext,
  reader: () => T | null,
  isValid: (value: unknown) => value is T,
): Result<T | undefined, CommandOptionParsingError> {
  const [readError, value] = readOption(context, reader);
  if (readError !== null) {
    return error(readError);
  }

  const requiredError = checkRequired(context, value);
  if (requiredError) {
    return error(requiredError);
  }
  if (value === null) {
    return ok(undefined);
  }
  if (!isValid(value)) {
    return error(createInvalidValueError(context, value));
  }

  return ok(value);
}

function parseStringOption(
  context: ParserContext,
  option: StringOption,
): Result<string | undefined, CommandOptionParsingError> {
  const [readError, value] = readOption(
    context,
    () => context.interaction.options.getString(context.name, false),
  );
  if (readError !== null) {
    return error(readError);
  }

  const requiredError = checkRequired(context, value);
  if (requiredError) {
    return error(requiredError);
  }
  if (value === null) {
    return ok(undefined);
  }
  if (typeof value !== "string") {
    return error(createInvalidValueError(context, value));
  }

  const rangeError = checkRange(
    context,
    value.length,
    option.min_length,
    option.max_length,
    "length",
  );
  if (rangeError) {
    return error(rangeError);
  }

  const choicesError = "choices" in option
    ? checkChoices(context, value, option.choices)
    : null;
  return choicesError ? error(choicesError) : ok(value);
}

function parseNumberOption(
  context: ParserContext,
  option: NumberOption,
): Result<number | undefined, CommandOptionParsingError> {
  const isInteger = option.type === "integer";
  const [readError, value] = readOption(
    context,
    () => isInteger
      ? context.interaction.options.getInteger(context.name, false)
      : context.interaction.options.getNumber(context.name, false),
  );
  if (readError !== null) {
    return error(readError);
  }

  const requiredError = checkRequired(context, value);
  if (requiredError) {
    return error(requiredError);
  }
  if (value === null) {
    return ok(undefined);
  }
  if (
    typeof value !== "number"
    || !Number.isFinite(value)
    || (isInteger && !Number.isSafeInteger(value))
  ) {
    return error(createInvalidValueError(context, value));
  }

  const rangeError = checkRange(
    context,
    value,
    option.min_value,
    option.max_value,
    "value",
  );
  if (rangeError) {
    return error(rangeError);
  }

  const choicesError = "choices" in option
    ? checkChoices(context, value, option.choices)
    : null;
  return choicesError ? error(choicesError) : ok(value);
}

async function parseRoleOption(
  context: ParserContext,
): Promise<Result<Role | undefined, CommandOptionParsingError>> {
  const [readError, role] = readOption(
    context,
    () => context.interaction.options.getRole(context.name, false),
  );
  if (readError !== null) {
    return error(readError);
  }

  return resolvePartial(
    context,
    role,
    value => value instanceof Role,
    id => context.interaction.guild?.roles.fetch(id),
    "role",
  );
}

async function parseChannelOption(
  context: ParserContext,
  option: ChannelOption,
): Promise<Result<GuildBasedChannel | undefined, CommandOptionParsingError>> {
  const allowedTypes = option.channel_types?.map(type => channelTypeEnum[type]);
  const [readError, channel] = readOption(
    context,
    () => context.interaction.options.getChannel(context.name, false, allowedTypes),
  );
  if (readError !== null) {
    return error(readError);
  }

  const [resolveError, resolved] = await resolvePartial(
    context,
    channel,
    value => value instanceof BaseChannel,
    id => context.interaction.guild?.channels.fetch(id),
    "channel",
  );
  if (resolveError !== null) {
    return error(resolveError);
  }
  if (resolved === undefined) {
    return ok(undefined);
  }
  if (!isGuildBasedChannel(resolved)) {
    return error(createParsingError(
      context,
      `Channel option ${context.name} resolved to a non-guild channel`,
      { receivedType: resolved.type },
    ));
  }
  if (allowedTypes && !allowedTypes.includes(resolved.type)) {
    return error(createParsingError(
      context,
      `Channel option ${context.name} does not match the configured channel types`,
      { receivedType: resolved.type, valid: allowedTypes },
    ));
  }

  return ok(resolved);
}

function isGuildBasedChannel(channel: BaseChannel): channel is GuildBasedChannel {
  return !channel.isDMBased();
}

function parseMentionableOption(
  context: ParserContext,
): Result<Role | User | undefined, CommandOptionParsingError> {
  const [readError, mentionable] = readOption(
    context,
    () => context.interaction.options.getMentionable(context.name, false),
  );
  if (readError !== null) {
    return error(readError);
  }

  const requiredError = checkRequired(context, mentionable);
  if (requiredError) {
    return error(requiredError);
  }
  if (mentionable === null) {
    return ok(undefined);
  }
  if (mentionable instanceof Role || mentionable instanceof User) {
    return ok(mentionable);
  }
  if (mentionable instanceof GuildMember) {
    return mentionable.user instanceof User
      ? ok(mentionable.user)
      : error(createInvalidValueError(context, mentionable));
  }

  return error(createInvalidValueError(context, mentionable));
}

function readOption<T>(
  context: ParserContext,
  reader: () => T,
): Result<T, CommandOptionParsingError> {
  try {
    return ok(reader());
  }
  catch (cause) {
    return error(createParsingError(
      context,
      `Failed to read option ${context.name}`,
      {},
      cause,
    ));
  }
}

function checkRequired(
  context: ParserContext,
  value: unknown,
): CommandOptionParsingError | null {
  if (context.option.required && value === null) {
    return createParsingError(
      context,
      `Option ${context.name} is required but was not provided.`,
    );
  }
  return null;
}

function checkRange(
  context: ParserContext,
  value: number,
  minimum: number | undefined,
  maximum: number | undefined,
  rangeName: "length" | "value",
): CommandOptionParsingError | null {
  if (minimum !== undefined && value < minimum) {
    return createParsingError(
      context,
      `Minimum ${rangeName} is ${minimum}, received ${value} for option ${context.name}`,
      { minimum, value },
    );
  }
  if (maximum !== undefined && value > maximum) {
    return createParsingError(
      context,
      `Maximum ${rangeName} is ${maximum}, received ${value} for option ${context.name}`,
      { maximum, value },
    );
  }
  return null;
}

function checkChoices(
  context: ParserContext,
  value: number | string,
  choices: NumberChoices | StringChoices | undefined,
): CommandOptionParsingError | null {
  if (!choices) {
    return null;
  }

  const valid: (number | string)[] = Array.isArray(choices)
    ? choices.map(choice =>
        typeof choice === "number" || typeof choice === "string"
          ? choice
          : choice.value)
    : Object.values(choices);

  if (!valid.includes(value)) {
    return createParsingError(
      context,
      `Invalid choice for ${context.name} option received`,
      { valid, value },
    );
  }
  return null;
}

async function resolvePartial<T>(
  context: ParserContext,
  value: unknown,
  isResolved: (candidate: unknown) => candidate is T,
  fetch: (id: string) => Promise<T | null | undefined> | undefined,
  kind: "channel" | "role",
): Promise<Result<T | undefined, CommandOptionParsingError>> {
  const requiredError = checkRequired(context, value);
  if (requiredError) {
    return error(requiredError);
  }
  if (value === null) {
    return ok(undefined);
  }
  if (isResolved(value)) {
    return ok(value);
  }
  if (!hasId(value)) {
    return error(createInvalidValueError(context, value));
  }

  try {
    const resolved = await fetch(value.id);
    if (!resolved || !isResolved(resolved)) {
      return error(createParsingError(
        context,
        `Failed to fetch ${kind} with id ${value.id} in guild ${context.interaction.guildId}`,
        { id: value.id },
      ));
    }
    return ok(resolved);
  }
  catch (cause) {
    return error(createParsingError(
      context,
      `Failed to fetch ${kind} with id ${value.id} in guild ${context.interaction.guildId}`,
      { id: value.id },
      cause,
    ));
  }
}

function hasId(value: unknown): value is { id: string } {
  return typeof value === "object"
    && value !== null
    && "id" in value
    && typeof value.id === "string";
}

function createInvalidValueError(
  context: ParserContext,
  value: unknown,
): CommandOptionParsingError {
  return createParsingError(
    context,
    `Invalid value received for ${context.option.type} option ${context.name}`,
    { value },
  );
}

function createParsingError(
  context: ParserContext,
  message: string,
  metadata: Record<string, unknown> = {},
  cause?: unknown,
): CommandOptionParsingError {
  return new CommandOptionParsingError({
    message,
    metadata: {
      optionName: context.name,
      optionType: context.option.type,
      options: context.interaction.options.data,
      definer: context.optionsList,
      ...metadata,
    },
    cause: cause === undefined ? undefined : anyToError(cause),
  });
}
