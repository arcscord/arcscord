import type {
  MessageV2Component,
  MessageV2EditReplyOptions,
  MessageV2MigrationReplyOptions,
  MessageV2ReplyOptions,
} from "../message";
import type { ValidationContext } from "./context";
import type {
  CanonicalMessageComponent,
  MessageComponentInput,
  MessageV2EditValidationInput,
  MessageV2MigrationValidationInput,
  MessageV2ReplyValidationInput,
  MessageV2ValidationInput,
} from "./types";
import { ComponentType, MessageFlags } from "discord-api-types/v10";
import { MessageFlagsBitField } from "discord.js";
import {
  isSelectMenuType,
  isTopLevelComponentType,
  messageComponentTypes,
  rejectComponentPlacement,
  topLevelComponentTypes,
} from "./component-kinds";
import {
  childContext,
  rootContext,
  serializeInput,
  validationFailure,
} from "./context";
import {
  decodeFile,
  decodeMediaGallery,
  decodeSeparator,
  decodeTextDisplay,
  decodeThumbnail,
} from "./display";
import { decodeActionRow, decodeButton, decodeSelectMenu } from "./interactive";
import { decodeContainer, decodeContainerChild, decodeSection } from "./layout";

type MessageTraversalState = {
  count: number;
  readonly ids: Map<number, string>;
  readonly customIds: Map<string, string>;
};

type MessageFlagResolvable = Parameters<typeof MessageFlagsBitField.resolve>[0];

const allowedV2MessageFlags = MessageFlags.SuppressEmbeds
  | MessageFlags.Ephemeral
  | MessageFlags.SuppressNotifications
  | MessageFlags.IsComponentsV2;

function isMessageFlagResolvable(value: unknown): value is MessageFlagResolvable {
  if (value === undefined || typeof value === "number" || typeof value === "string") {
    return true;
  }
  if (value instanceof MessageFlagsBitField) {
    return true;
  }
  return Array.isArray(value) && value.every(isMessageFlagResolvable);
}

export function decodeMessageFlags(value: unknown, context: ValidationContext): number {
  if (value === undefined) {
    return 0;
  }
  if (!isMessageFlagResolvable(value)) {
    validationFailure(context, "message-flags", `${context.path} cannot be resolved`);
  }
  let flags: number;
  try {
    flags = MessageFlagsBitField.resolve(value);
  }
  catch (cause) {
    validationFailure(context, "message-flags", `${context.path} cannot be resolved`, undefined, {}, cause);
  }
  const unsupported = flags & ~allowedV2MessageFlags;
  if (unsupported !== 0) {
    validationFailure(context, "message-flags", `${context.path} contains flags that cannot be set on a Components V2 payload`, undefined, {
      allowed: allowedV2MessageFlags,
      unsupported,
    });
  }
  return flags;
}

export function decodeMessageComponent(input: unknown, context: ValidationContext): CanonicalMessageComponent {
  if (typeof input === "string") {
    return decodeTextDisplay(input, context);
  }
  const record = serializeInput(input, context);
  const type = record.type;
  if (type === ComponentType.Button || (type === undefined && record.style !== undefined)) {
    return decodeButton(record, context);
  }
  if (isSelectMenuType(type)) {
    return decodeSelectMenu(record, context);
  }
  switch (type) {
    case ComponentType.ActionRow:
      return decodeActionRow(record, context);
    case ComponentType.Section:
      return decodeSection(record, context);
    case ComponentType.TextDisplay:
      return decodeTextDisplay(record, context);
    case ComponentType.Thumbnail:
      return decodeThumbnail(record, context);
    case ComponentType.MediaGallery:
      return decodeMediaGallery(record, context);
    case ComponentType.File:
      return decodeFile(record, context);
    case ComponentType.Separator:
      return decodeSeparator(record, context);
    case ComponentType.Container:
      return decodeContainer(record, context);
    default:
      return rejectComponentPlacement(record, context, messageComponentTypes);
  }
}

function decodeTopLevelComponent(input: unknown, context: ValidationContext): MessageV2Component {
  if (typeof input === "string") {
    return decodeTextDisplay(input, context);
  }
  const record = serializeInput(input, context);
  if (!isTopLevelComponentType(record.type)) {
    rejectComponentPlacement(record, context, topLevelComponentTypes);
  }
  return record.type === ComponentType.Container
    ? decodeContainer(record, context)
    : decodeContainerChild(record, context);
}

function registerUniqueIdentifiers(component: CanonicalMessageComponent, path: string, state: MessageTraversalState): void {
  state.count += 1;
  if (component.id !== undefined && component.id !== 0) {
    const existing = state.ids.get(component.id);
    if (existing !== undefined) {
      validationFailure(
        rootContext(`${path}.id`),
        "unique-component-id",
        `${path}.id duplicates the component id at ${existing}`,
        component.type,
        { id: component.id, firstPath: existing },
      );
    }
    state.ids.set(component.id, `${path}.id`);
  }
  if ("customId" in component && typeof component.customId === "string") {
    const existing = state.customIds.get(component.customId);
    if (existing !== undefined) {
      validationFailure(
        rootContext(`${path}.customId`),
        "unique-custom-id",
        `${path}.customId duplicates the custom id at ${existing}`,
        component.type,
        { firstPath: existing },
      );
    }
    state.customIds.set(component.customId, `${path}.customId`);
  }

  if (component.type === ComponentType.ActionRow || component.type === ComponentType.Container || component.type === ComponentType.Section) {
    component.components.forEach((child, index) => registerUniqueIdentifiers(child, `${path}.components[${index}]`, state));
  }
  if (component.type === ComponentType.Section) {
    registerUniqueIdentifiers(component.accessory, `${path}.accessory`, state);
  }
}

/** Validates and normalizes any supported message component. */
export function validateMessageComponent(input: MessageComponentInput): CanonicalMessageComponent {
  return decodeMessageComponent(input, rootContext("component"));
}

/** Validates and normalizes an edit payload that migrates a legacy message to Components V2. */
export function validateV2Message(input: MessageV2MigrationValidationInput): MessageV2MigrationReplyOptions;
/** Validates and normalizes a complete Components V2 message payload. */
export function validateV2Message(input: MessageV2EditValidationInput): MessageV2EditReplyOptions;
/** Validates and normalizes a reply-compatible Components V2 message payload. */
export function validateV2Message(input: MessageV2ReplyValidationInput): MessageV2ReplyOptions;
export function validateV2Message(input: MessageV2ValidationInput): MessageV2EditReplyOptions | MessageV2MigrationReplyOptions | MessageV2ReplyOptions {
  return decodeV2Message(input, rootContext("message"));
}

/** Internal message decoder shared by the public validator and the message helper. */
export function decodeV2Message(
  input: MessageV2ValidationInput,
  context: ValidationContext,
): MessageV2EditReplyOptions | MessageV2MigrationReplyOptions | MessageV2ReplyOptions {
  const record = serializeInput(input, context);
  const resetFields: Readonly<Record<string, (value: unknown) => boolean>> = {
    content: value => value === null,
    embeds: value => Array.isArray(value) && value.length === 0,
    poll: value => value === null,
    stickers: value => Array.isArray(value) && value.length === 0,
    sticker_ids: value => Array.isArray(value) && value.length === 0,
  };
  for (const [field, isResetValue] of Object.entries(resetFields)) {
    const value = record[field];
    if (value !== undefined && !isResetValue(value)) {
      validationFailure(childContext(context, field), "v2-incompatible-field", `message.${field} must be reset before enabling Components V2`);
    }
  }
  for (const incompatibleField of ["sharedClientTheme", "shared_client_theme"] as const) {
    if (record[incompatibleField] !== undefined) {
      validationFailure(childContext(context, incompatibleField), "v2-incompatible-field", `message.${incompatibleField} is incompatible with Components V2 messages`);
    }
  }
  const flags = decodeMessageFlags(record.flags, childContext(context, "flags"));
  if ((flags & MessageFlags.IsComponentsV2) === 0) {
    validationFailure(childContext(context, "flags"), "components-v2-flag", "message.flags must include IsComponentsV2");
  }
  if (!Array.isArray(record.components) || record.components.length < 1) {
    validationFailure(childContext(context, "components"), "message-components", "message.components must contain at least one component", undefined, {
      minimum: 1,
      actual: Array.isArray(record.components) ? record.components.length : undefined,
    });
  }

  const componentsContext = childContext(context, "components");
  const components = record.components.map((component, index) => {
    return decodeTopLevelComponent(component, childContext(componentsContext, index));
  });
  const state: MessageTraversalState = { count: 0, ids: new Map(), customIds: new Map() };
  components.forEach((component, index) => registerUniqueIdentifiers(component, `message.components[${index}]`, state));
  if (state.count > 40) {
    validationFailure(componentsContext, "message-component-count", "message cannot contain more than 40 total components", undefined, {
      maximum: 40,
      actual: state.count,
    });
  }

  const { components: _components, flags: _flags, ...options } = input;
  return {
    ...options,
    flags,
    components,
  };
}
