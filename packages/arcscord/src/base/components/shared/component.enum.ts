/**
 * Enum for component types.
 * @enum {number}
 * @see [Discord Docs](https://discord.com/developers/docs/interactions/message-components#component-object-component-types)
 */
export enum componentTypesEnum {
  /**
   * Represents an action row component.
   */
  actionRow = 1,
  /**
   * Represents a button component.
   */
  button = 2,
  /**
   * Represents a string select component.
   */
  stringSelect = 3,
  /**
   * Represents a text input component.
   */
  textInput = 4,
  /**
   * Represents a user select component.
   */
  userSelect = 5,
  /**
   * Represents a role select component.
   */
  roleSelect = 6,
  /**
   * Represents a mentionable select component.
   */
  mentionableSelect = 7,
  /**
   * Represents a channel select component.
   */
  channelSelect = 8,
  /**
   * Represents a section component.
   */
  section = 9,
  /**
   * Represents a text display component.
   */
  textDisplay = 10,
  /**
   * Represents a thumbnail component.
   */
  thumbnail = 11,
  /**
   * Represents a media gallery component.
   */
  mediaGallery = 12,
  /**
   * Represents a file component.
   */
  file = 13,
  /**
   * Represents a separator component.
   */
  separator = 14,
  /**
   * Represents a container component.
   */
  container = 17,
  /**
   * Represents a label component.
   */
  label = 18,
  /**
   * Represents a file upload component.
   */
  fileUpload = 19,
  /**
   * Represents a radio group component.
   */
  radioGroup = 21,
  /**
   * Represents a checkbox group component.
   */
  checkboxGroup = 22,
  /**
   * Represents a checkbox component.
   */
  checkbox = 23,
}

/**
 * Type of Discord interaction handled by an arcscord component handler.
 */
export const componentHandlerTypeEnum = {
  /**
   * Represents a message component interaction.
   */
  messageComponent: "messageComponent",
  /**
   * Represents a modal submit interaction.
   */
  modal: "modal",
} as const;

/**
 * Enum for button styles.
 * @enum {number}
 * @see [Discord Docs](https://discord.com/developers/docs/interactions/message-components#button-object-button-styles)
 */
export const buttonStyleEnum = {
  /**
   * Represents a primary button style.
   */
  primary: 1,
  /**
   * Represents a secondary button style.
   */
  secondary: 2,
  /**
   * Represents a success button style.
   */
  success: 3,
  /**
   * Represents a danger button style.
   */
  danger: 4,
  /**
   * Represents a link button style.
   */
  link: 5,
  /**
   * Represents a premium button style.
   */
  premium: 6,
};

/**
 * Enum for button style alias with color
 * @enum {number}
 */
export const buttonColorEnum = {
  /**
   * Represents a blurple button color.
   */
  blurple: buttonStyleEnum.primary,
  /**
   * Represents a grey button color.
   */
  grey: buttonStyleEnum.secondary,
  /**
   * Represents a green button color.
   */
  green: buttonStyleEnum.success,
  /**
   * Represents a red button color.
   */
  red: buttonStyleEnum.danger,
};

/**
 * Complete enum for button types, combining styles and colors.
 * @enum {number}
 */
export const buttonTypeEnum = {
  ...buttonStyleEnum,
  ...buttonColorEnum,
};

/**
 * Enum for text input styles.
 * @enum {number}
 * @see [Discord Docs](https://discord.com/developers/docs/interactions/message-components#text-input-object-text-input-styles)
 */
export const textInputStyleEnum = {
  /**
   * Represents a short text input style.
   */
  short: 1,
  /**
   * Represents a paragraph text input style.
   */
  paragraph: 2,
};

/**
 * Enum for separator spacing sizes.
 * @enum {number}
 * @see [Discord Docs](https://discord.com/developers/docs/components/reference#separator)
 */
export const separatorSpacingSizeEnum = {
  /**
   * Represents a small separator spacing.
   */
  small: 1,
  /**
   * Represents a large separator spacing.
   */
  large: 2,
};
