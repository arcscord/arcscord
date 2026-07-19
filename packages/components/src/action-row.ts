import type {
  APIActionRowComponent,
  APIButtonComponent,
  APIComponentInMessageActionRow,
  APISelectMenuComponent,
  ButtonStyle,
  ComponentType,
} from "discord-api-types/v10";
import type {
  ActionRowData,
  ButtonComponentData,
  ChannelSelectMenuComponentData,
  MentionableSelectMenuComponentData,
  MessageActionRowComponentData,
  RoleSelectMenuComponentData,
  StringSelectMenuComponentData,
  UserSelectMenuComponentData,
} from "discord.js";
import type { ComponentBuilderLike } from "./component";
import { ComponentType as DiscordComponentType } from "discord-api-types/v10";
import { rootContext } from "./validation/context";
import { decodeActionRow } from "./validation/interactive";

/** String button styles and Arcscord's historical color aliases. */
export type StringButtonStyle = "primary" | "secondary" | "success" | "danger" | "link" | "premium" | "blurple" | "grey" | "green" | "red";

/**
 * Compatibility button data supporting Arcscord's historical string styles.
 * Standalone consumers should prefer Discord.js `ButtonComponentData` or `ButtonBuilder`.
 */
export type FlexibleButtonData = {
  readonly type?: ComponentType.Button;
  readonly id?: number;
  readonly style: ButtonStyle | StringButtonStyle;
  readonly customId?: string;
  readonly url?: string;
  readonly skuId?: string;
  readonly label?: string;
  readonly emoji?: ButtonComponentData["emoji"];
  readonly disabled?: boolean;
};

/** Discord.js data/builder, raw API data, or compatibility data for one button. */
export type DisplayButton
  = | ButtonComponentData
    | APIButtonComponent
    | ComponentBuilderLike<APIButtonComponent>
    | FlexibleButtonData;

/** Canonical premium button data missing from Discord.js' public component-data union. */
export type PremiumButtonComponentData = {
  readonly type: ComponentType.Button;
  readonly style: ButtonStyle.Premium;
  readonly skuId: string;
  readonly id?: number;
  readonly disabled?: boolean;
};

/** Canonical button data, including premium buttons missing from Discord.js' union. */
export type CanonicalButtonComponentData = ButtonComponentData | PremiumButtonComponentData;

/** Resolved Discord.js data for every select menu allowed in a message action row. */
export type SelectMenuComponentData
  = | StringSelectMenuComponentData
    | UserSelectMenuComponentData
    | RoleSelectMenuComponentData
    | MentionableSelectMenuComponentData
    | ChannelSelectMenuComponentData;

/** Discord.js data/builder or raw API data for one message select menu. */
export type SelectMenuInput
  = | SelectMenuComponentData
    | APISelectMenuComponent
    | ComponentBuilderLike<APISelectMenuComponent>;

/** Any individual component accepted by a message action row. */
export type ActionRowComponentInput
  = | MessageActionRowComponentData
    | APIComponentInMessageActionRow
    | FlexibleButtonData;

/** Tuple enforcing Discord's limit of one to five buttons in an action row. */
export type ButtonList
  = | [DisplayButton]
    | [DisplayButton, DisplayButton]
    | [DisplayButton, DisplayButton, DisplayButton]
    | [DisplayButton, DisplayButton, DisplayButton, DisplayButton]
    | [DisplayButton, DisplayButton, DisplayButton, DisplayButton, DisplayButton];

/** Valid positional arguments for {@link actionRow}: one-to-five buttons or exactly one select menu. */
export type ActionRowItems = ButtonList | [SelectMenuInput];

/** A resolved action row containing buttons. */
export type ButtonActionRow = {
  readonly type: ComponentType.ActionRow;
  readonly id?: number;
  readonly components: readonly CanonicalButtonComponentData[];
};

/** A resolved action row containing exactly one select menu. */
export type SelectMenuActionRow = {
  readonly type: ComponentType.ActionRow;
  readonly id?: number;
  readonly components: readonly [SelectMenuComponentData];
};

/** A resolved message action row containing buttons or one select menu. */
export type MessageActionRow = ButtonActionRow | SelectMenuActionRow;

/** An existing action row accepted inside a Components V2 message or container. */
export type MessageActionRowInput
  = | ActionRowData<MessageActionRowComponentData>
    | {
      readonly type: ComponentType.ActionRow;
      readonly id?: number;
      readonly components: readonly ActionRowComponentInput[];
    }
    | APIActionRowComponent<APIComponentInMessageActionRow>
    | ComponentBuilderLike<APIActionRowComponent<APIComponentInMessageActionRow>>;

/**
 * Creates an action row containing one to five buttons.
 *
 * @param buttons - Discord.js button data/builders, raw `APIButtonComponent` objects,
 * or Arcscord-compatible string-style button definitions.
 * @example
 * ```ts
 * actionRow(saveButton, cancelButton)
 * ```
 */
export function actionRow(...buttons: ButtonList): ButtonActionRow;
/**
 * Creates an action row containing exactly one message select menu.
 *
 * @param selectMenu - A string, user, role, mentionable, or channel select as Discord.js
 * data/builder or raw `APISelectMenuComponent`.
 * @example
 * ```ts
 * actionRow(new StringSelectMenuBuilder().setCustomId("choice").addOptions({ label: "One", value: "one" }))
 * ```
 */
export function actionRow(selectMenu: SelectMenuInput): SelectMenuActionRow;
export function actionRow(...components: ActionRowItems): ButtonActionRow | SelectMenuActionRow {
  return decodeActionRow({
    type: DiscordComponentType.ActionRow,
    components,
  }, rootContext("actionRow"));
}
