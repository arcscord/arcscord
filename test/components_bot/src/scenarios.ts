import type {
  MessageV2EditReplyOptions,
  MessageV2MigrationReplyOptions,
  MessageV2ReplyOptions,
} from "@arcscord/components";
import type { APIContainerComponent } from "discord-api-types/v10";
import type { InteractionReplyOptions } from "discord.js";
import { Buffer } from "node:buffer";
import { fileURLToPath } from "node:url";
import {
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
} from "@arcscord/components";
import { ButtonStyle, ComponentType } from "discord-api-types/v10";
import {
  AttachmentBuilder,
  ButtonBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  MentionableSelectMenuBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
  UserSelectMenuBuilder,
} from "discord.js";
import { componentIds } from "./ids";
import { runValidationSuite } from "./validation-suite";

const logoPath = fileURLToPath(new URL("../../../website/assets/Arcscord_Logo.png", import.meta.url));

function testButton(label: string, customId: string, style: ButtonStyle): ButtonBuilder {
  return new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(style);
}

export function layoutScenario(): MessageV2EditReplyOptions {
  return v2Message(
    container(
      { accentColor: 0x5865F2 },
      text("# Components V2 layout\nA standalone `@arcscord/components` composition."),
      separator({ divider: true, spacing: "large" }),
      section(
        "## Section with an accessory",
        "The button is placed directly in the section accessory slot.",
        accessory(testButton("Inspect", componentIds.buttons.primary, ButtonStyle.Primary)),
      ),
      separator({ divider: false, spacing: "small" }),
      "Strings are automatically normalized into text display components.",
      actionRow(
        testButton("Success", componentIds.buttons.success, ButtonStyle.Success),
        testButton("Danger", componentIds.buttons.danger, ButtonStyle.Danger),
      ),
    ),
  );
}

export function mediaScenario(): MessageV2ReplyOptions {
  const image = new AttachmentBuilder(logoPath, {
    name: "arcscord-logo.png",
    description: "Arcscord logo used by the Components V2 media test",
  });
  const report = new AttachmentBuilder(Buffer.from("@arcscord/components standalone file test\n", "utf8"), {
    name: "components-report.txt",
    description: "Components V2 file test",
  });

  return v2Message(
    { files: [image, report] },
    container(
      { accentColor: 0x57F287, spoiler: false },
      "# Media and attachments",
      section(
        "The thumbnail and gallery resolve an uploaded `attachment://` URL.",
        accessory(thumbnail({
          media: { url: "attachment://arcscord-logo.png" },
          description: "Test thumbnail",
        })),
      ),
      mediaGallery({
        items: [{
          media: { url: "attachment://arcscord-logo.png" },
          description: "Attachment-backed gallery item",
          spoiler: true,
        }],
      }),
      separator({ divider: true }),
      file({
        file: { url: "attachment://components-report.txt" },
        spoiler: false,
      }),
    ),
  );
}

export function interactionsScenario(): MessageV2EditReplyOptions {
  return v2Message(
    container(
      { accentColor: 0xFEE75C },
      "# Interactive components\nEvery interaction is routed by this plain Discord.js bot.",
      actionRow(
        testButton("Primary", componentIds.buttons.primary, ButtonStyle.Primary),
        testButton("Secondary", componentIds.buttons.secondary, ButtonStyle.Secondary),
        testButton("Success", componentIds.buttons.success, ButtonStyle.Success),
        testButton("Danger", componentIds.buttons.danger, ButtonStyle.Danger),
        new ButtonBuilder().setLabel("Link").setURL("https://arcscord.dev").setStyle(ButtonStyle.Link),
      ),
      actionRow(new StringSelectMenuBuilder()
        .setCustomId(componentIds.selects.string)
        .setPlaceholder("Choose test values")
        .setMinValues(1)
        .setMaxValues(2)
        .addOptions(
          { label: "Alpha", value: "alpha", description: "First typed value" },
          { label: "Beta", value: "beta", description: "Second typed value" },
          { label: "Gamma", value: "gamma", description: "Third typed value" },
        )),
      actionRow(new UserSelectMenuBuilder().setCustomId(componentIds.selects.user).setPlaceholder("Select users")),
      actionRow(new RoleSelectMenuBuilder().setCustomId(componentIds.selects.role).setPlaceholder("Select roles")),
      actionRow(new MentionableSelectMenuBuilder().setCustomId(componentIds.selects.mentionable).setPlaceholder("Select mentionables")),
      actionRow(new ChannelSelectMenuBuilder()
        .setCustomId(componentIds.selects.channel)
        .setPlaceholder("Select a text channel")
        .addChannelTypes(ChannelType.GuildText)),
    ),
  );
}

export function inputsScenario(): MessageV2EditReplyOptions {
  const rawContainer: APIContainerComponent = {
    type: ComponentType.Container,
    accent_color: 0xEB459E,
    components: [
      { type: ComponentType.TextDisplay, content: "## Raw Discord API object\nSnake-case fields are normalized." },
      {
        type: ComponentType.ActionRow,
        components: [{
          type: ComponentType.Button,
          style: ButtonStyle.Secondary,
          custom_id: componentIds.buttons.secondary,
          label: "Raw API button",
        }],
      },
    ],
  };

  return v2Message(
    new TextDisplayBuilder().setContent("# Accepted input formats\nThis title is a Discord.js `TextDisplayBuilder`."),
    rawContainer,
    container(
      "## Helper and compatibility data",
      actionRow({
        style: "green",
        customId: componentIds.buttons.success,
        label: "String-style compatibility button",
      }),
    ),
  );
}

export function validationScenario(): MessageV2EditReplyOptions {
  return v2Message(
    container(
      { accentColor: 0x57F287 },
      runValidationSuite(),
    ),
  );
}

export function migratedScenario(): MessageV2MigrationReplyOptions {
  return v2Message(
    { content: null },
    container(
      { accentColor: 0x57F287 },
      "# Migration successful",
      "The legacy `content` field was explicitly reset to `null` and the Components V2 flag was added.",
    ),
  );
}

export function migrationStarter(): InteractionReplyOptions {
  return {
    content: "Legacy Discord message. Click the button to migrate it to Components V2.",
    components: [
      {
        type: ComponentType.ActionRow,
        components: [testButton("Migrate now", componentIds.migration, ButtonStyle.Primary)],
      },
    ],
  };
}
