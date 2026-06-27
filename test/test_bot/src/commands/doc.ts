import { Buffer } from "node:buffer";
import {
  accessory,
  actionRow,
  buildModal,
  channelSelectMenu,
  container,
  createCommand,
  createModal,
  file,
  mediaGallery,
  mentionableSelectMenu,
  modalCheckbox,
  modalCheckboxGroup,
  modalFileUpload,
  modalMentionableSelect,
  modalRadioGroup,
  modalRoleSelect,
  modalStringSelect,
  modalTextInput,
  modalUserSelect,
  section,
  separator,
  stringSelectMenu,
  text,
  thumbnail,
  userSelectMenu,
  v2Message,
} from "arcscord";
import { redSimpleButton, simpleButton } from "../components/simple_button";

// ─── Modal handlers (declared inline for doc purposes) ─────────────────────

// screenshot: static/img/components/modal/modal-basic.png
const docModalBasic = createModal({
  route: "doc/modal/basic",
  fields: {
    name: modalTextInput({ label: "Name", required: true, maxLength: 80 }),
    bio: modalTextInput({ label: "Bio", style: "paragraph", required: false, placeholder: "Tell us about yourself…" }),
  },
  build: (id, fields) => buildModal({
    title: "Edit profile",
    customId: id(),
    components: [
      "Fill in your profile details below.",
      fields.name.label(),
      fields.bio.label(),
    ],
  }),
  run: ctx => ctx.reply(`Name: ${ctx.values.name}, bio: ${ctx.values.bio ?? "—"}`),
});

// screenshot: static/img/components/modal/modal-select-fields.png
const docModalSelectFields = createModal({
  route: "doc/modal/select-fields",
  fields: {
    category: modalStringSelect({
      label: "Category",
      description: "Choose the closest topic.",
      required: true,
      options: ["bug", "idea", "question"],
    }),
    priority: modalStringSelect({
      label: "Priority",
      required: true,
      options: ["low", "medium", "high"],
    }),
  },
  build: (id, fields) => buildModal({
    title: "Feedback",
    customId: id(),
    components: [fields.category.label(), fields.priority.label()],
  }),
  run: ctx => ctx.reply(`Feedback: ${ctx.values.category} / ${ctx.values.priority}`),
});

// screenshot: static/img/components/modal/modal-radio-checkbox.png
const docModalRadioCheckbox = createModal({
  route: "doc/modal/radio-checkbox",
  fields: {
    mood: modalRadioGroup({
      label: "Mood",
      required: true,
      options: [
        { label: "Great", value: "great" },
        { label: "Okay", value: "okay" },
        { label: "Blocked", value: "blocked" },
      ],
    }),
    features: modalCheckboxGroup({
      label: "Features used",
      description: "Pick every component family you tested.",
      required: false,
      minValues: 0,
      maxValues: 3,
      options: [
        { label: "Commands", value: "commands" },
        { label: "Components", value: "components" },
        { label: "Events", value: "events" },
      ],
    }),
    subscribe: modalCheckbox({ label: "Subscribe to updates", default: true }),
  },
  build: (id, fields) => buildModal({
    title: "Survey",
    customId: id(),
    components: [fields.mood.label(), fields.features.label(), fields.subscribe.label()],
  }),
  run: ctx => ctx.reply(`Mood: ${ctx.values.mood}, features: ${ctx.values.features.join(", ")}, subscribe: ${ctx.values.subscribe}`),
});

// screenshot: static/img/components/modal/modal-file-upload.png
const docModalFileUpload = createModal({
  route: "doc/modal/file-upload",
  fields: {
    title: modalTextInput({ label: "Title", required: true }),
    attachment: modalFileUpload({ label: "Attachment", required: true, minValues: 1, maxValues: 1 }),
  },
  build: (id, fields) => buildModal({
    title: "Upload file",
    customId: id(),
    components: [fields.title.label(), fields.attachment.label()],
  }),
  run: ctx => ctx.reply(`Title: ${ctx.values.title}, file: ${ctx.values.attachment.name}`),
});

// screenshot: static/img/components/modal/modal-entity-selects.png
const docModalEntitySelects = createModal({
  route: "doc/modal/entity-selects",
  fields: {
    owner: modalUserSelect({ label: "Owner", required: true }),
    role: modalRoleSelect({ label: "Role", required: true }),
    target: modalMentionableSelect({ label: "Target", required: true }),
  },
  build: (id, fields) => buildModal({
    title: "Assign",
    customId: id(),
    components: [fields.owner.label(), fields.role.label(), fields.target.label()],
  }),
  run: ctx => ctx.reply(`Owner: ${ctx.values.owner.username}, role: ${ctx.values.role.name}`),
});

// ─── Command ───────────────────────────────────────────────────────────────

export const docModals = [
  docModalBasic,
  docModalSelectFields,
  docModalRadioCheckbox,
  docModalFileUpload,
  docModalEntitySelects,
];

export const docCommand = createCommand({
  build: {
    slash: {
      name: "doc",
      description: "Documentation screenshot helper — trigger modals and v2 layouts for docs screenshots",
      options: {
        screenshot: {
          type: "string",
          description: "Which screenshot to generate",
          required: true,
          choices: [
            // ── Modals (opens a form dialog — screenshot the dialog) ──────
            { name: "modal_basic", value: "modal_basic" },
            // screenshot: static/img/components/modal/modal-basic.png
            { name: "modal_select_fields", value: "modal_select_fields" },
            // screenshot: static/img/components/modal/modal-select-fields.png
            { name: "modal_radio_checkbox", value: "modal_radio_checkbox" },
            // screenshot: static/img/components/modal/modal-radio-checkbox.png
            { name: "modal_file_upload", value: "modal_file_upload" },
            // screenshot: static/img/components/modal/modal-file-upload.png
            { name: "modal_entity_selects", value: "modal_entity_selects" },
            // screenshot: static/img/components/modal/modal-entity-selects.png

            // ── Select menus (sends a message — screenshot the message) ──
            { name: "select_menu_overview", value: "select_menu_overview" },
            // screenshot: static/img/components/select-menu/select-menu-overview.png

            // ── Components v2 (sends a message — screenshot the message) ──
            { name: "v2_layout", value: "v2_layout" },
            // screenshot: static/img/components/v2/v2-layout.png
            { name: "v2_media", value: "v2_media" },
            // screenshot: static/img/components/v2/v2-media.png
            { name: "v2_practical", value: "v2_practical" },
            // screenshot: static/img/components/v2/v2-practical.png
            { name: "v2_section_thumbnail", value: "v2_section_thumbnail" },
            // screenshot: static/img/components/v2/v2-section-thumbnail.png
          ] as const,
        },
      },
    },
  },
  run: async (ctx) => {
    switch (ctx.options.screenshot) {
      // ── Modals ────────────────────────────────────────────────────────
      case "modal_basic":
        return ctx.showModal(docModalBasic.build());

      case "modal_select_fields":
        return ctx.showModal(docModalSelectFields.build());

      case "modal_radio_checkbox":
        return ctx.showModal(docModalRadioCheckbox.build());

      case "modal_file_upload":
        return ctx.showModal(docModalFileUpload.build());

      case "modal_entity_selects":
        return ctx.showModal(docModalEntitySelects.build());

      // ── Select menus ──────────────────────────────────────────────────
      case "select_menu_overview":
        // screenshot: static/img/components/select-menu/select-menu-overview.png
        return ctx.reply({
          content: "**Select menu types**",
          components: [stringSelectMenu({
            customId: "doc_str",
            placeholder: "String select — choose an option",
            options: [
              { label: "Commands", value: "commands", description: "Slash commands & context menus" },
              { label: "Components", value: "components", description: "Buttons, selects, modals" },
              { label: "Events", value: "events", description: "Discord gateway events" },
            ],
          }), userSelectMenu({ customId: "doc_user", placeholder: "User select — pick a member" }), mentionableSelectMenu({ customId: "doc_mentionable", placeholder: "Mentionable select — user or role" }), channelSelectMenu({
            customId: "doc_channel",
            placeholder: "Channel select — text channels only",
            channelTypes: ["guildText", "guildAnnouncement"],
          })],
        });

      // ── Components v2 ─────────────────────────────────────────────────
      case "v2_layout":
        // screenshot: static/img/components/v2/v2-layout.png
        return ctx.reply(
          v2Message(
            text("## Components v2 — layout\nText, section with thumbnail, container, separator, and action row."),
            section(
              "Top-level section — text on the left, thumbnail on the right.",
              accessory(thumbnail({
                media: { url: "https://cdn.discordapp.com/embed/avatars/0.png" },
                description: "Default avatar",
              })),
            ),
            separator({ divider: true, spacing: "large" }),
            container(
              { accentColor: 0x5865F2 },
              "Container content groups text, sections, separators, and action rows.",
              section(
                "Section inside a container.",
                accessory(thumbnail({
                  media: { url: "https://cdn.discordapp.com/embed/avatars/0.png" },
                  description: "Avatar",
                })),
              ),
              separator({ divider: true, spacing: "large" }),
              actionRow(simpleButton.build()),
            ),
          ),
        );

      case "v2_media":
        // screenshot: static/img/components/v2/v2-media.png
        return ctx.reply(v2Message(
          {
            files: [{
              attachment: Buffer.from("This file is rendered by a Components v2 File component.\n"),
              name: "doc-note.txt",
            }],
          },
          text("## Components v2 — media\nMedia gallery and file component with an uploaded attachment."),
          mediaGallery({
            items: [
              { media: { url: "https://cdn.discordapp.com/embed/avatars/1.png" }, description: "Gallery image 1" },
              { media: { url: "https://cdn.discordapp.com/embed/avatars/2.png" }, description: "Gallery image 2 (spoiler)", spoiler: true },
            ],
          }),
          file({ file: { url: "attachment://doc-note.txt" } }),
        ));

      case "v2_practical":
        // screenshot: static/img/components/v2/v2-practical.png
        return ctx.reply(
          v2Message(
            container(
              section(
                "Support",
                "Click to open a support ticket.",
                accessory(simpleButton.build()),
              ),
              separator({ spacing: "large" }),
              section(
                "Bug report",
                "Report a bug to the team.",
                accessory(redSimpleButton.build()),
              ),
            ),
          ),
        );

      case "v2_section_thumbnail":
        // screenshot: static/img/components/v2/v2-section-thumbnail.png
        return ctx.reply(
          v2Message(
            text("## Section with thumbnail accessory"),
            section(
              { id: 1 },
              "The section component places text on the left and an accessory on the right. The accessory can be a thumbnail (image) or a button.",
              accessory(thumbnail({
                media: { url: "https://cdn.discordapp.com/embed/avatars/0.png" },
                description: "Thumbnail accessory",
              })),
            ),
            separator({ divider: false, spacing: "large" }),
            section(
              { id: 2 },
              "A button can also be an accessory — it appears inline next to the text.",
              accessory(simpleButton.build()),
            ),
          ),
        );

      default:
        return ctx.reply("Unknown screenshot option.");
    }
  },
});
