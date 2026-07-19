import {
  accessory,
  actionRow,
  container,
  file,
  isMessageComponentValidationError,
  mediaGallery,
  section,
  separator,
  text,
  thumbnail,
  v2Message,
  validateActionRow,
  validateButton,
  validateContainer,
  validateFile,
  validateMediaGallery,
  validateMediaGalleryItem,
  validateMessageComponent,
  validateSection,
  validateSelectMenu,
  validateSeparator,
  validateTextDisplay,
  validateThumbnail,
  validateV2Message,
} from "@arcscord/components";
import { ButtonStyle, ComponentType } from "discord-api-types/v10";
import { StringSelectMenuBuilder } from "discord.js";

type ValidationCheck = {
  readonly name: string;
  readonly run: () => unknown;
};

export function runValidationSuite(): string {
  const button = {
    type: ComponentType.Button,
    style: ButtonStyle.Primary,
    customId: "validation-button",
    label: "Validate",
  } as const;
  const select = new StringSelectMenuBuilder()
    .setCustomId("validation-select")
    .addOptions({ label: "One", value: "one" });
  const row = actionRow(button);
  const thumb = thumbnail({ media: { url: "https://cdn.discordapp.com/embed/avatars/0.png" } });
  const galleryItem = { media: { url: "https://cdn.discordapp.com/embed/avatars/1.png" }, description: "Test image" };
  const gallery = mediaGallery({ items: [galleryItem] });
  const fileComponent = file({ file: { url: "attachment://validation.txt" } });
  const sectionComponent = section("Validation section", accessory(thumb));
  const containerComponent = container("Validation container", separator(), row);
  const message = v2Message(containerComponent);

  const checks: readonly ValidationCheck[] = [
    { name: "validateTextDisplay", run: () => validateTextDisplay(text("Valid")) },
    { name: "validateSeparator", run: () => validateSeparator(separator({ spacing: "large" })) },
    { name: "validateThumbnail", run: () => validateThumbnail(thumb) },
    { name: "validateMediaGalleryItem", run: () => validateMediaGalleryItem(galleryItem) },
    { name: "validateMediaGallery", run: () => validateMediaGallery(gallery) },
    { name: "validateFile", run: () => validateFile(fileComponent) },
    { name: "validateButton", run: () => validateButton(button) },
    { name: "validateSelectMenu", run: () => validateSelectMenu(select) },
    { name: "validateActionRow", run: () => validateActionRow(row) },
    { name: "validateSection", run: () => validateSection(sectionComponent) },
    { name: "validateContainer", run: () => validateContainer(containerComponent) },
    { name: "validateMessageComponent", run: () => validateMessageComponent(button) },
    { name: "validateV2Message", run: () => validateV2Message(message) },
  ];

  const results = checks.map((check) => {
    try {
      check.run();
      return `- ✅ \`${check.name}\``;
    }
    catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return `- ❌ \`${check.name}\`: ${detail}`;
    }
  });

  let expectedFailure = "The invalid-input check did not fail.";
  try {
    validateTextDisplay("");
  }
  catch (error) {
    expectedFailure = isMessageComponentValidationError(error)
      ? `Captured \`${error.name}\`: rule=\`${error.rule}\`, path=\`${error.path}\``
      : `Captured unexpected error: ${String(error)}`;
  }

  return [
    "## Runtime validation suite",
    `${checks.length}/${checks.length} public validator entry points executed:`,
    ...results,
    "",
    "### Expected invalid input",
    expectedFailure,
  ].join("\n");
}
