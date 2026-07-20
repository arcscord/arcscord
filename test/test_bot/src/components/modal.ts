import {
  buildModal,
  createModal,
  modalChannelSelect,
  modalCheckbox,
  modalCheckboxGroup,
  modalFileUpload,
  modalMentionableSelect,
  modalRadioGroup,
  modalRoleSelect,
  modalStringSelect,
  modalTextInput,
  modalUserSelect,
  text,
} from "arcscord";

function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(", ") || "none";
  }

  if (value === null || value === undefined || value === "") {
    return "none";
  }

  return String(value);
}

export const profileModal = createModal({
  route: "modal/profile",
  fields: {
    name: modalTextInput({
      label: "Name",
      required: true,
      maxLength: 80,
    }),
    age: modalTextInput({
      label: "Age",
      required: false,
      maxLength: 3,
    }),
  },
  // Build args as a single named object (readable): pass localized / variable
  // text here. `.label(overrides)` overrides only the displayed text — the
  // parsed `value`s stay fixed, so `ctx.values` typing is unaffected.
  build: (id, fields, labels?: { title?: string; name?: string; age?: string }) =>
    buildModal({
      title: labels?.title ?? "Profile",
      customId: id(),
      components: [
        fields.name.label({ label: labels?.name }),
        fields.age.label({ label: labels?.age }),
      ],
    }),
  run: (ctx) => {
    const name: string = ctx.values.name;
    const age: string | undefined = ctx.values.age;

    return ctx.reply(
      `Profile: ${formatValue(name)}, age=${formatValue(age)}`,
    );
  },
});

export const feedbackModal = createModal({
  route: "modal/feedback",
  fields: {
    category: modalStringSelect({
      label: "Category",
      description: "Choose the topic closest to your feedback.",
      required: true,
      options: ["bug", "idea", "question"],
    }),
    message: modalTextInput({
      label: "Message",
      style: "paragraph",
      required: true,
      placeholder: "What should be changed or checked?",
    }),
    priority: modalStringSelect({
      label: "Priority",
      required: true,
      options: ["low", "medium", "high"],
    }),
  },
  build: (id, fields) =>
    buildModal({
      title: "Feedback",
      customId: id(),
      components: [
        text("Use the fields below to send structured feedback."),
        fields.category.label(),
        fields.priority.label(),
        fields.message.label(),
      ],
    }),
  run: (ctx) => {
    const category: "bug" | "idea" | "question" = ctx.values.category;
    const priority: "low" | "medium" | "high" = ctx.values.priority;

    return ctx.reply(
      `Feedback (${category}/${priority}): ${formatValue(ctx.values.message)}`,
    );
  },
});

export const surveyModal = createModal({
  route: "modal/survey",
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
        { label: "Message components", value: "message" },
        { label: "Modal components", value: "modal" },
        { label: "Layouts", value: "layout" },
      ],
    }),
    subscribe: modalCheckbox({
      label: "Subscribe to updates",
      default: true,
    }),
  },
  // Per-option display text is overridable too, keyed by the option `value`
  // (type-safe — only declared values are accepted).
  build: (id, fields, labels?: { moodLabel?: string; great?: string }) =>
    buildModal({
      title: "Survey",
      customId: id(),
      components: [
        fields.mood.label({
          label: labels?.moodLabel,
          options: { great: { label: labels?.great } },
        }),
        fields.features.label(),
        fields.subscribe.label(),
      ],
    }),
  run: (ctx) => {
    const mood: "great" | "okay" | "blocked" = ctx.values.mood;
    const features: Array<"message" | "modal" | "layout"> = ctx.values.features;

    return ctx.reply(
      `Survey: mood=${mood}, features=${formatValue(features)}, subscribe=${formatValue(ctx.values.subscribe)}`,
    );
  },
});

export const uploadModal = createModal({
  route: "modal/upload",
  fields: {
    title: modalTextInput({
      label: "Title",
      required: true,
    }),
    attachment: modalFileUpload({
      label: "Attachment",
      required: true,
      minValues: 1,
      maxValues: 1,
    }),
  },
  build: (id, fields) =>
    buildModal({
      title: "Upload",
      customId: id(),
      components: [
        fields.title.label(),
        fields.attachment.label(),
      ],
    }),
  run: (ctx) => {
    return ctx.reply(
      `Upload: ${ctx.values.title}, attachment=${formatValue(ctx.values.attachment.name)}`,
    );
  },
});

export const selectModal = createModal({
  route: "modal/selects",
  fields: {
    owner: modalUserSelect({
      label: "Owner",
      required: true,
    }),
    reviewers: modalUserSelect({
      label: "Reviewers",
      maxValues: 3,
      required: false,
    }),
    role: modalRoleSelect({
      label: "Role",
      required: true,
    }),
    target: modalMentionableSelect({
      label: "Target",
      required: true,
    }),
    channelTest: modalChannelSelect({
      label: "Channel",
      required: true,
    }),
  },
  build: (id, fields) =>
    buildModal({
      title: "Select fields",
      customId: id(),
      components: [
        fields.owner.label(),
        fields.reviewers.label(),
        fields.role.label(),
        fields.target.label(),
        fields.channelTest.label(),
      ],
    }),
  run: (ctx) => {
    const ownerName: string = ctx.values.owner.username;
    const reviewerNames = ctx.values.reviewers?.map(user => user.username).join(", ") ?? "none";
    const roleName: string = ctx.values.role.name;
    const targetName = "username" in ctx.values.target
      ? ctx.values.target.username
      : ctx.values.target.name;
    const channelId: string = ctx.values.channelTest.id;

    return ctx.reply(
      `Selects: owner=${ownerName}, reviewers=${reviewerNames}, role=${roleName}, target=${targetName}, channel=${channelId}`,
    );
  },
});
