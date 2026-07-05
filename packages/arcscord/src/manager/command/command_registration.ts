import type { Result } from "@arcscord/error";
import type {
  APIApplicationCommand,
  RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import type { ArcClient } from "#/base";
import type { LoggerInterface } from "#/utils/logger/logger.type";
import { anyToError, error, ok } from "@arcscord/error";
import { ApplicationCommandType, Routes } from "discord-api-types/v10";
import { InternalError } from "#/utils/error/class/internal_error";

export type ApplicationCommandRegistration = Pick<APIApplicationCommand, "id" | "name" | "type"> & {
  guildId: string | null;
};

export type CommandRegistrationCommandMode = "put" | "create" | "warn" | "ignore";

export type CommandRegistrationUnusedMode = "delete" | "warn" | "ignore";

export type CommandRegistrationScope = "global" | "guild";

export type CommandRegistrationScopeConfig = {
  /**
   * How local command definitions are pushed to Discord.
   *
   * - `put`: bulk overwrite this scope.
   * - `create`: create or update local commands one by one without deleting unused commands.
   * - `warn`: compare local commands with Discord and only log differences.
   * - `ignore`: do not create, update, or warn about local commands.
   *
   * @default "put"
   */
  commands?: CommandRegistrationCommandMode;

  /**
   * How Discord commands that are absent from the local command list are handled.
   *
   * This has no practical effect with `commands: "put"` because Discord bulk
   * overwrite already removes unused commands.
   *
   * @default "ignore"
   */
  unused?: CommandRegistrationUnusedMode;
};

export type CommandRegistrationConfig = {
  /**
   * Registration behavior for global application commands.
   */
  global?: CommandRegistrationScopeConfig;

  /**
   * Registration behavior for guild application commands.
   */
  guild?: CommandRegistrationScopeConfig;
};

export type RequiredCommandRegistrationScopeConfig = Required<CommandRegistrationScopeConfig>;

export type RequiredCommandRegistrationConfig = {
  global: RequiredCommandRegistrationScopeConfig;
  guild: RequiredCommandRegistrationScopeConfig;
};

type CommandRegistrationOptions = {
  client: ArcClient;
  logger: LoggerInterface;
  scope: CommandRegistrationScope;
  config: CommandRegistrationScopeConfig | undefined;
  commands: RESTPostAPIApplicationCommandsJSONBody[];
  guildId?: string;
};

type CommandRouteOptions = {
  applicationId: string;
  guildId?: string;
};

type ExistingCommand = APIApplicationCommand;

const defaultScopeConfig: RequiredCommandRegistrationScopeConfig = {
  commands: "put",
  unused: "ignore",
};

export function normalizeCommandRegistrationConfig(
  config?: CommandRegistrationConfig,
): RequiredCommandRegistrationConfig {
  return {
    global: {
      ...defaultScopeConfig,
      ...config?.global,
    },
    guild: {
      ...defaultScopeConfig,
      ...config?.guild,
    },
  };
}

export async function registerCommands(
  options: CommandRegistrationOptions,
): Promise<Result<ApplicationCommandRegistration[], InternalError>> {
  const resolvedConfig = {
    ...defaultScopeConfig,
    ...options.config,
  };
  const applicationId = resolveApplicationId(options.client);

  if (!applicationId) {
    if (resolvedConfig.commands === "ignore" && resolvedConfig.unused === "ignore") {
      return ok([]);
    }
    return error(new InternalError("No application found in client"));
  }

  try {
    const routeOptions = {
      applicationId,
      guildId: options.guildId,
    };

    if (resolvedConfig.commands === "put") {
      const data = await putCommands(options.client, routeOptions, options.commands);
      options.logger.trace(
        `Registered ${options.commands.length} ${options.scope} commands`,
      );
      return ok(data.map(apiCommandToResolvedCommand));
    }

    const existingCommands = await fetchCommands(options.client, routeOptions);
    const localCommands = mapLocalCommands(options.commands);
    const existingCommandsMap = mapExistingCommands(existingCommands);

    if (resolvedConfig.commands === "create") {
      await createOrUpdateCommands(
        options.client,
        routeOptions,
        options.commands,
        existingCommandsMap,
      );
    }
    else if (resolvedConfig.commands === "warn") {
      warnLocalCommandDifferences(
        options.logger,
        options.scope,
        options.commands,
        existingCommandsMap,
      );
    }

    await handleUnusedCommands(
      options.client,
      options.logger,
      options.scope,
      routeOptions,
      resolvedConfig.unused,
      localCommands,
      existingCommands,
    );

    const hasMutation = resolvedConfig.commands === "create" || resolvedConfig.unused === "delete";
    const finalCommands = hasMutation
      ? await fetchCommands(options.client, routeOptions)
      : existingCommands;

    return ok(finalCommands.map(apiCommandToResolvedCommand));
  }
  catch (e) {
    return error(new InternalError({
      message: options.scope === "guild" && options.guildId
        ? `failed to load commands for guild ${options.guildId}`
        : "Failed to load commands globally",
      originalError: anyToError(e),
    }));
  }
}

function resolveApplicationId(client: ArcClient): string | undefined {
  return client.arcOptions.applicationId ?? client.application?.id;
}

async function putCommands(
  client: ArcClient,
  routeOptions: CommandRouteOptions,
  commands: RESTPostAPIApplicationCommandsJSONBody[],
): Promise<ExistingCommand[]> {
  return await client.rest.put(
    commandsRoute(routeOptions),
    {
      body: commands,
    },
  ) as ExistingCommand[];
}

async function fetchCommands(
  client: ArcClient,
  routeOptions: CommandRouteOptions,
): Promise<ExistingCommand[]> {
  return await client.rest.get(
    commandsRoute(routeOptions),
    {
      query: new URLSearchParams({
        with_localizations: "true",
      }),
    },
  ) as ExistingCommand[];
}

async function createOrUpdateCommands(
  client: ArcClient,
  routeOptions: CommandRouteOptions,
  commands: RESTPostAPIApplicationCommandsJSONBody[],
  existingCommands: Map<string, ExistingCommand>,
): Promise<void> {
  for (const command of commands) {
    const existingCommand = existingCommands.get(commandKey(command));
    if (existingCommand) {
      await client.rest.patch(
        commandRoute(routeOptions, existingCommand.id),
        {
          body: command,
        },
      );
    }
    else {
      await client.rest.post(
        commandsRoute(routeOptions),
        {
          body: command,
        },
      );
    }
  }
}

async function handleUnusedCommands(
  client: ArcClient,
  logger: LoggerInterface,
  scope: CommandRegistrationScope,
  routeOptions: CommandRouteOptions,
  unusedMode: CommandRegistrationUnusedMode,
  localCommands: Map<string, RESTPostAPIApplicationCommandsJSONBody>,
  existingCommands: ExistingCommand[],
): Promise<void> {
  if (unusedMode === "ignore") {
    return;
  }

  const unusedCommands = existingCommands.filter(command => !localCommands.has(commandKey(command)));

  for (const command of unusedCommands) {
    if (unusedMode === "warn") {
      logger.warn(
        `Unused ${scope} command "${command.name}" (${formatCommandType(command.type)}) exists on Discord`,
      );
      continue;
    }

    await client.rest.delete(commandRoute(routeOptions, command.id));
  }
}

function warnLocalCommandDifferences(
  logger: LoggerInterface,
  scope: CommandRegistrationScope,
  commands: RESTPostAPIApplicationCommandsJSONBody[],
  existingCommands: Map<string, ExistingCommand>,
): void {
  for (const command of commands) {
    const existingCommand = existingCommands.get(commandKey(command));
    const commandType = normalizedCommandType(command);

    if (!existingCommand) {
      logger.warn(
        `${scope} command "${command.name}" (${formatCommandType(commandType)}) is missing on Discord`,
      );
      continue;
    }

    if (!commandsAreEquivalent(command, existingCommand)) {
      logger.warn(
        `${scope} command "${command.name}" (${formatCommandType(commandType)}) differs from Discord registration`,
      );
    }
  }
}

function commandsAreEquivalent(
  localCommand: RESTPostAPIApplicationCommandsJSONBody,
  existingCommand: ExistingCommand,
): boolean {
  return stableStringify(normalizeLocalCommandForCompare(localCommand))
    === stableStringify(normalizeExistingCommandForCompare(existingCommand, localCommand));
}

function mapLocalCommands(
  commands: RESTPostAPIApplicationCommandsJSONBody[],
): Map<string, RESTPostAPIApplicationCommandsJSONBody> {
  return new Map(commands.map(command => [commandKey(command), command]));
}

function mapExistingCommands(commands: ExistingCommand[]): Map<string, ExistingCommand> {
  return new Map(commands.map(command => [commandKey(command), command]));
}

function commandKey(command: { name: string; type?: ApplicationCommandType | number }): string {
  return `${normalizedCommandType(command)}:${command.name}`;
}

function normalizedCommandType(command: { type?: ApplicationCommandType | number }): ApplicationCommandType | number {
  return command.type ?? ApplicationCommandType.ChatInput;
}

function commandsRoute(options: CommandRouteOptions): `/${string}` {
  if (options.guildId) {
    return Routes.applicationGuildCommands(options.applicationId, options.guildId);
  }
  return Routes.applicationCommands(options.applicationId);
}

function commandRoute(options: CommandRouteOptions, commandId: string): `/${string}` {
  if (options.guildId) {
    return Routes.applicationGuildCommand(options.applicationId, options.guildId, commandId);
  }
  return Routes.applicationCommand(options.applicationId, commandId);
}

export function apiCommandToResolvedCommand(command: APIApplicationCommand): ApplicationCommandRegistration {
  return {
    id: command.id,
    name: command.name,
    type: command.type,
    guildId: command.guild_id ?? null,
  };
}

function normalizeLocalCommandForCompare(command: RESTPostAPIApplicationCommandsJSONBody): unknown {
  const type = normalizedCommandType(command);

  return pruneEmptyValues({
    type,
    name: command.name,
    name_localizations: command.name_localizations,
    description: type === ApplicationCommandType.ChatInput && "description" in command
      ? command.description
      : undefined,
    description_localizations: type === ApplicationCommandType.ChatInput
      ? command.description_localizations
      : undefined,
    options: "options" in command ? command.options : undefined,
    default_member_permissions: normalizePrimitive(command.default_member_permissions),
    dm_permission: command.dm_permission,
    integration_types: normalizeNumberArray(command.integration_types),
    contexts: normalizeNumberArray(command.contexts),
    nsfw: command.nsfw,
  });
}

function normalizeExistingCommandForCompare(
  command: ExistingCommand,
  localCommand: RESTPostAPIApplicationCommandsJSONBody,
): unknown {
  const type = normalizedCommandType(localCommand);

  return pruneEmptyValues({
    type: normalizedCommandType(command),
    name: command.name,
    name_localizations: command.name_localizations,
    description: type === ApplicationCommandType.ChatInput ? command.description : undefined,
    description_localizations: type === ApplicationCommandType.ChatInput
      ? command.description_localizations
      : undefined,
    options: "options" in command ? command.options : undefined,
    default_member_permissions: normalizePrimitive(command.default_member_permissions),
    dm_permission: hasExplicitValue(localCommand, "dm_permission") ? command.dm_permission : undefined,
    integration_types: hasExplicitValue(localCommand, "integration_types")
      ? normalizeNumberArray(command.integration_types)
      : undefined,
    contexts: hasExplicitValue(localCommand, "contexts")
      ? normalizeNumberArray(command.contexts)
      : undefined,
    nsfw: hasExplicitValue(localCommand, "nsfw") ? command.nsfw : undefined,
  });
}

function hasExplicitValue<T extends object>(value: T, key: keyof T): boolean {
  return Object.hasOwn(value, key) && value[key] !== undefined;
}

function normalizePrimitive(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}

function normalizeNumberArray(value: readonly number[] | null | undefined): number[] | undefined {
  return value ? [...value].sort((left, right) => left - right) : undefined;
}

function pruneEmptyValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => pruneEmptyValues(item));
  }

  if (!value || typeof value !== "object") {
    return value === null ? undefined : normalizePrimitive(value);
  }

  const normalizedEntries = Object.entries(value)
    .map(([key, entry]) => [key, pruneEmptyValues(entry)] as const)
    .filter(([, entry]) => {
      if (entry === undefined) {
        return false;
      }
      if (Array.isArray(entry)) {
        return entry.length > 0;
      }
      if (entry && typeof entry === "object") {
        return Object.keys(entry).length > 0;
      }
      return true;
    })
    .filter(([key, entry]) => {
      if ((key === "required" || key === "autocomplete" || key === "nsfw") && entry === false) {
        return false;
      }
      if (key === "dm_permission" && entry === true) {
        return false;
      }
      return true;
    });

  return Object.fromEntries(normalizedEntries);
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => sortValue(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortValue(entry)]),
  );
}

function formatCommandType(type: ApplicationCommandType | number): string {
  if (type === ApplicationCommandType.ChatInput) {
    return "slash";
  }
  if (type === ApplicationCommandType.Message) {
    return "message";
  }
  if (type === ApplicationCommandType.User) {
    return "user";
  }
  return String(type);
}
