import type {
  ActionRowData,
  ChannelSelectMenuBuilder,
  ChannelSelectMenuComponentData,
  ComponentEmojiResolvable,
  MentionableSelectMenuBuilder,
  MentionableSelectMenuComponentData,
  RoleSelectMenuBuilder,
  RoleSelectMenuComponentData,
  StringSelectMenuBuilder,
  StringSelectMenuComponentData,
  UserSelectMenuBuilder,
  UserSelectMenuComponentData,
} from "discord.js";
import type {
  ChannelSelectMenu,
  ClickableButton,
  LinkButton,
  MentionableSelectMenu,
  PremiumButton,
  RoleSelectMenu,
  StringSelectMenu,
  UserSelectMenu,
} from "#/base/components/shared/component_definer.type";
import { ButtonStyle, ComponentType } from "discord-api-types/v10";
import {
  selectMenuToAPI,
} from "#/base/components/shared/to_api";

/**
 * Creates a link button.
 * @param options options of link button
 * @example
 * ```ts
 * linkButton({
 *   url: "https://discord.com",
 *   label: "Discord",
 * });
 * ```
 */
export function linkButton(
  options: Omit<LinkButton, "type" | "style"> & { label: string },
): LinkButton;
/**
 * Creates a link button.
 * @param options options of link button
 * @example
 * ```ts
 * linkButton({
 *   url: "https://discord.com",
 *   label: "Discord",
 * });
 * ```
 */
export function linkButton(
  options: Omit<LinkButton, "type" | "style"> & { emoji: ComponentEmojiResolvable },
): LinkButton;

export function linkButton(
  options: Omit<LinkButton, "type" | "style">,
): LinkButton {
  return {
    ...options,
    type: ComponentType.Button,
    style: ButtonStyle.Link,
  };
}

/**
 * Creates a premium button.
 * @param options options of premium button
 */
export function premiumButton(
  options: Omit<PremiumButton, "type" | "style">,
): PremiumButton {
  return {
    ...options,
    type: ComponentType.Button,
    style: ButtonStyle.Premium,
  };
}

/**
 * Creates a clickable button.
 * @param options options of the clickable button
 * @example
 * ```ts
 * button({
 *   style: "primary",
 *   label: "Click here",
 *   customId: "Yeah",
 *   emoji: "❤️",
 * });
 * ```
 */
export function button(
  options: Omit<ClickableButton, "type"> & { label: string },
): ClickableButton;
/**
 * Creates a clickable button.
 * @param options options of the clickable button
 * @example
 * ```ts
 * button({
 *   style: "primary",
 *   label: "Click here",
 *   customId: "Yeah",
 *   emoji: "❤️",
 * });
 * ```
 */
export function button(
  options: Omit<ClickableButton, "type"> & { emoji: ComponentEmojiResolvable },
): ClickableButton;

export function button(
  options: Omit<ClickableButton, "type">,
): ClickableButton {
  return {
    ...options,
    type: ComponentType.Button,
  };
}

/**
 * Creates a string select menu action row.
 * @param options options of the string select menu
 * @example
 * ```ts
 * stringSelectMenu({
 *   customId: "select-1",
 *   options: [
 *     { label: "Option 1", value: "1" },
 *     { label: "Option 2", value: "2" },
 *   ],
 *   placeholder: "Choose an option",
 *   minValues: 1,
 *   maxValues: 1,
 * });
 * ```
 */
export function stringSelectMenu(
  options: Omit<StringSelectMenu<"message">, "type">,
): ActionRowData<StringSelectMenuComponentData>;
export function stringSelectMenu(
  options: StringSelectMenuBuilder,
): ActionRowData<StringSelectMenuComponentData>;
export function stringSelectMenu(
  options: Omit<StringSelectMenu<"message">, "type"> | StringSelectMenuBuilder,
): ActionRowData<StringSelectMenuComponentData> {
  return {
    type: ComponentType.ActionRow,
    components: [
      selectMenuToAPI("toJSON" in options
        ? options
        : {
            ...options,
            type: ComponentType.StringSelect,
          }) as StringSelectMenuComponentData,
    ],
  };
}

/**
 * Creates a user select menu action row.
 * @param option options of the user select menu
 * @example
 * ```ts
 * userSelectMenu({
 *   customId: "user-select-1",
 * });
 * ```
 */
export function userSelectMenu(
  option: Omit<UserSelectMenu<"message">, "type">,
): ActionRowData<UserSelectMenuComponentData>;
export function userSelectMenu(
  option: UserSelectMenuBuilder,
): ActionRowData<UserSelectMenuComponentData>;
export function userSelectMenu(
  option: Omit<UserSelectMenu<"message">, "type"> | UserSelectMenuBuilder,
): ActionRowData<UserSelectMenuComponentData> {
  return {
    type: ComponentType.ActionRow,
    components: [
      selectMenuToAPI("toJSON" in option
        ? option
        : {
            ...option,
            type: ComponentType.UserSelect,
          }) as UserSelectMenuComponentData,
    ],
  };
}

/**
 * Creates a role select menu action row.
 * @param option options of the role select menu
 * @example
 * ```ts
 * roleSelectMenu({
 *   customId: "role-select-1",
 *   placeholder: "Select a role",
 *   maxValues: 25,
 * });
 * ```
 */
export function roleSelectMenu(
  option: Omit<RoleSelectMenu<"message">, "type">,
): ActionRowData<RoleSelectMenuComponentData>;
export function roleSelectMenu(
  option: RoleSelectMenuBuilder,
): ActionRowData<RoleSelectMenuComponentData>;
export function roleSelectMenu(
  option: Omit<RoleSelectMenu<"message">, "type"> | RoleSelectMenuBuilder,
): ActionRowData<RoleSelectMenuComponentData> {
  return {
    type: ComponentType.ActionRow,
    components: [
      selectMenuToAPI("toJSON" in option
        ? option
        : {
            ...option,
            type: ComponentType.RoleSelect,
          }) as RoleSelectMenuComponentData,
    ],
  };
}

/**
 * Creates a mentionable select menu action row.
 * @param option options of the mentionable select menu
 * @example
 * ```ts
 * mentionableSelectMenu({
 *   customId: "mention-select-1",
 *   defaultValues: [
 *     {
 *       id: "858220958378441754",
 *       type: "user",
 *     },
 *   ],
 * });
 * ```
 */
export function mentionableSelectMenu(
  option: Omit<MentionableSelectMenu<"message">, "type">,
): ActionRowData<MentionableSelectMenuComponentData>;
export function mentionableSelectMenu(
  option: MentionableSelectMenuBuilder,
): ActionRowData<MentionableSelectMenuComponentData>;
export function mentionableSelectMenu(
  option: Omit<MentionableSelectMenu<"message">, "type"> | MentionableSelectMenuBuilder,
): ActionRowData<MentionableSelectMenuComponentData> {
  return {
    type: ComponentType.ActionRow,
    components: [
      selectMenuToAPI("toJSON" in option
        ? option
        : {
            ...option,
            type: ComponentType.MentionableSelect,
          }) as MentionableSelectMenuComponentData,
    ],
  };
}

/**
 * Creates a channel select menu action row.
 * @param option options of the channel select menu
 * @example
 * ```ts
 * channelSelectMenu({
 *   customId: "channel-select-1",
 *   placeholder: "Select a channel",
 *   channelTypes: ["guildText", "guildVoice"],
 * });
 * ```
 */
export function channelSelectMenu(
  option: Omit<ChannelSelectMenu<"message">, "type">,
): ActionRowData<ChannelSelectMenuComponentData>;
export function channelSelectMenu(
  option: ChannelSelectMenuBuilder,
): ActionRowData<ChannelSelectMenuComponentData>;
export function channelSelectMenu(
  option: Omit<ChannelSelectMenu<"message">, "type"> | ChannelSelectMenuBuilder,
): ActionRowData<ChannelSelectMenuComponentData> {
  return {
    type: ComponentType.ActionRow,
    components: [
      selectMenuToAPI("toJSON" in option
        ? option
        : {
            ...option,
            type: ComponentType.ChannelSelect,
          }) as ChannelSelectMenuComponentData,
    ],
  };
}
