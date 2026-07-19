import type { ComponentType } from "discord-api-types/v10";
import type {
  FileComponentData,
  MediaGalleryComponentData,
  SeparatorComponentData,
  TextDisplayComponentData,
  ThumbnailComponentData,
} from "discord.js";
import type {
  CanonicalButtonComponentData,
  DisplayButton,
  MessageActionRow,
  SelectMenuComponentData,
  SelectMenuInput,
} from "../action-row";
import type { CanonicalComponentData } from "../component";
import type { CanonicalContainerComponentData, ContainerChild, ContainerComponentInput } from "../container";
import type { MessageV2Child, MessageV2EditOptions, MessageV2MigrationOptions, MessageV2Options } from "../message";
import type { CanonicalSectionComponentData } from "../section";
import type { ThumbnailInput } from "../thumbnail";

/** Any individual component shape accepted by {@link validateMessageComponent}. */
export type MessageComponentInput = ContainerChild | ContainerComponentInput | DisplayButton | SelectMenuInput | ThumbnailInput;

/** Canonical output from {@link validateMessageComponent}. */
export type CanonicalMessageComponent
  = | MessageActionRow
    | CanonicalButtonComponentData
    | SelectMenuComponentData
    | CanonicalContainerComponentData
    | CanonicalComponentData<FileComponentData, ComponentType.File>
    | CanonicalComponentData<MediaGalleryComponentData, ComponentType.MediaGallery>
    | CanonicalSectionComponentData
    | CanonicalComponentData<SeparatorComponentData, ComponentType.Separator>
    | CanonicalComponentData<TextDisplayComponentData, ComponentType.TextDisplay>
    | CanonicalComponentData<ThumbnailComponentData, ComponentType.Thumbnail>;

/** Edit-compatible payload accepted by {@link validateV2Message}. */
export type MessageV2EditValidationInput = MessageV2EditOptions & {
  readonly components: readonly MessageV2Child[];
};

/** Migration payload accepted by {@link validateV2Message}. */
export type MessageV2MigrationValidationInput = MessageV2MigrationOptions & {
  readonly components: readonly MessageV2Child[];
};

/** Reply-compatible payload accepted by {@link validateV2Message}. */
export type MessageV2ReplyValidationInput = MessageV2Options & {
  readonly components: readonly MessageV2Child[];
};

/** Complete payload shape accepted by {@link validateV2Message}. */
export type MessageV2ValidationInput = MessageV2EditValidationInput | MessageV2MigrationValidationInput | MessageV2ReplyValidationInput;
