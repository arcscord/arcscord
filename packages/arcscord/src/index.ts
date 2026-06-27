export { ArcClient } from "./base/client/client.class";
export type {
  ArcClientLoggerOptions,
  ArcClientOptions,
  HandlersList,
  ManagersOptions,
  MessageOptions,
} from "./base/client/client.type";

export {
  AutocompleteContext,
} from "./base/command/autocomplete_context";
export type {
  AutocompleteHandler,
  AutocompleteHandlers,
  AutocompleteOptionName,
} from "./base/command/autocomplete_context";
export {
  commandContextsEnum,
  commandIntegrationTypesEnum,
  commandOptionTypesEnum,
} from "./base/command/command.enum";
export type {
  AnyCommandHandler,
  AnySubCommandHandler,
  AutocompleteCommand,
  CommandHandler,
  CommandRunResult,
  CommandRunReturn,
} from "./base/command/command.type";
export {
  BaseCommandContext,
  MessageCommandContext,
  SlashCommandContext,
  UserCommandContext,
} from "./base/command/command_context";
export type {
  BaseCommandContextBuilderOptions,
  CommandContext,
  MessageCommandContextBuilderOptions,
  SlashCommandContextBuilderOptions,
  UserCommandContextBuilderOptions,
} from "./base/command/command_context";
export type {
  BaseCommandDefinition,
  Command,
  CommandContexts,
  CommandIntegrationType,
  FullCommandDefinition,
  PartialCommandDefinitionForMessage,
  PartialCommandDefinitionForSlash,
  PartialCommandDefinitionForUser,
  SlashCommandDefinition,
  SlashWithSubsCommandDefinition,
  SubCommandDefinition,
  SubCommandGroupDefinition,
} from "./base/command/command_definition.type";
export { buildCommandWithSubs, createCommand } from "./base/command/command_func";
export {
  CommandMiddleware,
} from "./base/command/command_middleware";
export type {
  CancelCommandMiddleware,
  CommandMiddlewareRun,
  ErrorCommandMiddleware,
  NextCommandMiddleware,
} from "./base/command/command_middleware";
export type {
  AttachmentOption,
  Autocomplete,
  BaseIntegerOption,
  BaseNumberOption,
  BaseSlashOption,
  BaseStringOption,
  BooleanOption,
  ChannelOption,
  ChoiceNumber,
  ChoiceOptionNumber,
  ChoiceOptionString,
  ChoiceString,
  CommandOptionType,
  ContextOption,
  ContextOptions,
  MentionableOption,
  NumberChoices,
  Option,
  OptionalContextOption,
  OptionsList,
  RoleOption,
  StringChoices,
  UserOption,
} from "./base/command/option.type";

export {
  accessory,
  actionRow,
  container,
  file,
  mediaGallery,
  section,
  separator,
  text,
  thumbnail,
  v2Message,
} from "./base/components/display";
export type {
  ButtonActionRow,
  ContainerChild,
  ContainerOptions,
  DisplayButton,
  FileOptions,
  MediaGalleryOptions,
  MessageV2Child,
  MessageV2Component,
  MessageV2Options,
  MessageV2ReplyOptions,
  SectionAccessory,
  SectionAccessoryValue,
  SectionInput,
  SectionOptions,
  SectionTextInput,
  SeparatorOptions,
  TextDisplayOptions,
  ThumbnailOptions,
} from "./base/components/display";
export type { ComponentRunResult, ComponentRunReturn } from "./base/components/interaction/component.type";
export {
  createButton,
  createModal,
  createSelectMenu,
  createTypedStringMenu,
} from "./base/components/interaction/component_handler.func";
export type {
  AnyModalComponentHandler,
  BaseComponentHandler,
  BaseMessageComponentHandler,
  BaseModalSubmitHandler,
  ButtonComponentHandler,
  ChannelSelectMenuComponentHandler,
  ComponentBuilderOptions,
  ComponentHandler,
  MentionableSelectMenuComponentHandler,
  ModalComponentBuilderOptions,
  ModalComponentHandler,
  RoleSelectMenuComponentHandler,
  RouteComponentHandle,
  SelectMenuComponentHandler,
  StringSelectMenuComponentHandler,
  UserSelectMenuComponentHandler,
} from "./base/components/interaction/component_handlers.type";
export {
  ComponentMiddleware,
} from "./base/components/interaction/component_middleware";
export type {
  CancelComponentMiddleware,
  ComponentMiddlewareRun,
  ErrorComponentMiddleware,
  NextComponentMiddleware,
} from "./base/components/interaction/component_middleware";
export {
  BaseComponentContext,
  ButtonContext,
  ChannelSelectMenuContext,
  MentionableSelectMenuContext,
  MessageComponentContext,
  ModalContext,
  RoleSelectMenuContext,
  SelectMenuContext,
  StringSelectMenuContext,
  UserSelectMenuContext,
} from "./base/components/interaction/context";
export type {
  BaseComponentContextOptions,
  ChannelSelectMenuContextOptions,
  ComponentContext,
  MentionableSelectMenuContextOptions,
  ModalContextValue,
  RoleSelectMenuContextOptions,
  StringSelectMenuContextOptions,
  UserSelectMenuContextOptions,
} from "./base/components/interaction/context";
export type {
  ComponentBuildArgs,
  IdInitialiseFunction,
  RouteVariables,
  RouteVariablesObject,
} from "./base/components/interaction/route";
export {
  buildModal,
  modalChannelSelect,
  modalCheckbox,
  modalCheckboxGroup,
  modalFileUpload,
  modalLabel,
  modalMentionableSelect,
  modalRadioGroup,
  modalRoleSelect,
  modalStringSelect,
  modalTextInput,
  modalUserSelect,
} from "./base/components/modal";
export {
  button,
  channelSelectMenu,
  linkButton,
  mentionableSelectMenu,
  premiumButton,
  roleSelectMenu,
  stringSelectMenu,
  userSelectMenu,
} from "./base/components/shared/builders";
export {
  buttonColorEnum,
  buttonStyleEnum,
  buttonTypeEnum,
  componentHandlerTypeEnum,
  componentTypesEnum,
  separatorSpacingSizeEnum,
  textInputStyleEnum,
} from "./base/components/shared/component.enum";
export type {
  AnyMessageTopLevelComponentData,
  AnyModalComponentData,
  AnySelectMenuComponentData,
  BaseButton,
  BaseComponent,
  BaseSelectMenu,
  Button,
  ChannelSelectMenu,
  Checkbox,
  CheckboxGroup,
  ClickableButton,
  ComponentHandlerType,
  ComponentInContainer,
  ComponentInLabel,
  ComponentUsage,
  Container,
  File,
  FileUpload,
  Label,
  LabeledTextInput,
  LinkButton,
  MediaGallery,
  MentionableSelectMenu,
  MessageComponentType,
  MessageSelectMenu,
  MessageTopLevelComponent,
  ModalChannelSelectValue,
  ModalCheckboxGroupValue,
  ModalComponentType,
  ModalFieldDefinition,
  ModalFields,
  ModalFieldValues,
  ModalFileUploadValue,
  ModalMentionableSelectValue,
  ModalRadioGroupValue,
  ModalRoleSelectValue,
  ModalSelectableValue,
  ModalSelectMenu,
  ModalStringSelectValue,
  ModalTopLevelComponent,
  ModalUserSelectValue,
  ModalValues,
  PremiumButton,
  RadioGroup,
  RoleSelectMenu,
  Section,
  SelectMenu,
  SelectMenuComponentType,
  SelectMenuDefaultValue,
  SelectMenuDefaultValueType,
  SelectOptions,
  Separator,
  StringButtonColor,
  StringButtonStyle,
  StringComponentType,
  StringSelectMenu,
  StringSelectMenuValues,
  StringSeparatorSpacingSize,
  TextDisplay,
  TextDisplayInput,
  TextInput,
  TextInputStyle,
  Thumbnail,
  TypedSelectMenuOptions,
  TypedTextInput,
  UserSelectMenu,
} from "./base/components/shared/component_definer.type";

export { createEvent } from "./base/event/event.func";
export type {
  AnyEventHandler,
  EventBeforeReadyMode,
  EventHandler,
  EventHandleResult,
  EventHandleReturn,
  EventHandlerOptions,
} from "./base/event/event.type";
export { EventContext } from "./base/event/event_context";

export { BaseManager } from "./base/manager/manager.class";
export type {
  CommandContextDocs,
  ContextDocs,
  ContextInDm,
  ContextInGuild,
  ContextInGuildOrDm,
  MessageCommandContextDocs,
  SlashCommandContextDocs,
} from "./base/utils/context.type";
export {
  InteractionContext,
} from "./base/utils/interaction_context.class";
export {
  CommandManager,
  ComponentManager,
  EventManager,
  LocaleManager,
} from "./manager";
export type {
  ApplicationCommandRegistration,
} from "./manager";
export type {
  CommandManagerOptions,
  CommandResultHandler,
  CommandResultHandlerImplementer,
  CommandResultHandlerInfos,
  CommandReturnedHandlerInfos,
  CommandThrownHandlerInfos,
} from "./manager/command/command_manager.type";
export type {
  ComponentList,
  ComponentManagerOptions,
  ComponentResultHandler,
  ComponentResultHandlerInfos,
  ComponentReturnedHandlerInfos,
  ComponentThrownHandlerInfos,
} from "./manager/component/component_manager.type";

export type {
  EventIntentCheckAction,
  EventIntentCheckCoverage,
  EventIntentCheckIssue,
  EventIntentCheckIssueType,
  EventIntentCheckOptions,
  EventManagerOptions,
  EventResultHandler,
  EventResultHandlerInfos,
  EventReturnedHandlerInfos,
  EventThrownHandlerInfos,
} from "./manager/event/event_manager.type";
export type {
  EventIntentAlternatives,
  EventIntentCoverageTarget,
  EventIntentRequirement,
} from "./manager/event/intents_map";
export type {
  BaseLocaleManagerOptions,
  LangDetector,
  LocaleCallback,
  LocaleManagerOptions,
} from "./manager/locale/locale_manager.type";

export { channelTypeEnum } from "./utils/discord/type/channel.enum";
export type { ChannelType } from "./utils/discord/type/channel.type";
export type { Locale, LocaleMap } from "./utils/discord/type/locale.type";
export { isGuildTextChannel } from "./utils/discord/utils/util.func";
export type { GuildTextFirstBasedChannel } from "./utils/discord/utils/util.type";

export {
  CommandError,
  CommandValidationError,
  ComponentError,
  EventError,
  InteractionError,
} from "./utils/error/class";
export type {
  CommandDispatchDiagnostics,
  ComponentDispatchDiagnostics,
  DiagnosticLevel,
  DispatchErrorConfig,
  DispatchMessageContext,
  DispatchReplyFn,
} from "./utils/error/dispatch.type";
export type {
  DebugValues,
  DebugValueString,
} from "./utils/error/error.type";
export {
  stringifyDebugValue,
  stringifyDebugValues,
} from "./utils/error/error.util";
export {
  isArcscordResult,
  normalizeRunReturn,
} from "./utils/error/run_normalize";

export {
  ArcLogger,
  createErrorReport,
  createLogger,
  defaultLogger,
  formatJsonLog,
  renderErrorReport,
  renderJsonErrorReport,
  resolveLogFormat,
  resolveLogLevel,
  shouldLog,
  shouldUseJsonLogs,
} from "./utils/logger";
export type {
  DiagnosticLoggerOptions,
  ErrorReport,
  LogFunc,
  LoggerConstructor,
  LoggerInterface,
  LoggerOptions,
  LogLevel,
  SerializedError,
} from "./utils/logger";
export { logLevels } from "./utils/logger/logger.enum";
export type {
  PreReplyMode,
} from "./utils/type/pre_reply.type";
export type {
  MaybePromise,
  OptionalProperties,
} from "./utils/type/util.type";

export { BaseError } from "@arcscord/better-error";
export type {
  Debugs,
  DebugStringObject,
  ErrorOptions,
  GetDebugOptions,
  StackFormat,
} from "@arcscord/better-error";
export {
  anyToError,
  error,
  forceSafe,
  multiple,
  ok,
} from "@arcscord/error";
export type {
  Result,
  ResultErr,
  ResultOk,
} from "@arcscord/error";
