import {
  checkbox,
  checkboxGroup,
  createModal,
  label,
  modal as modalComponent,
  radioGroup,
  stringSelectModalComponent,
  text,
  textInput,
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
  build: (id, title) =>
    modalComponent(
      title,
      id(),
      label({
        label: "Name",
        component: textInput({
          customId: "name",
          style: "short",
          required: true,
        }),
      }),
      label({
        label: "Age",
        component: textInput({
          customId: "age",
          style: "short",
          required: true,
        }),
      }),
    ),
  run: (ctx) => {
    return ctx.reply(
      `Profile: ${formatValue(ctx.values.get("name"))}, ${formatValue(ctx.values.get("age"))}`,
    );
  },
});

export const feedbackModal = createModal({
  route: "modal/feedback",
  build: (id, title) =>
    modalComponent(
      title,
      id(),
      text("Use the fields below to send structured feedback."),
      label({
        label: "Category",
        description: "Choose the topic closest to your feedback.",
        component: stringSelectModalComponent({
          customId: "category",
          required: true,
          options: [
            { label: "Bug", value: "bug" },
            { label: "Idea", value: "idea" },
            { label: "Question", value: "question" },
          ],
        }),
      }),
      label({
        label: "Message",
        component: textInput({
          customId: "message",
          style: "paragraph",
          required: true,
          placeholder: "What should be changed or checked?",
        }),
      }),
    ),
  run: (ctx) => {
    return ctx.reply(
      `Feedback (${formatValue(ctx.values.get("category"))}): ${formatValue(ctx.values.get("message"))}`,
    );
  },
});

export const surveyModal = createModal({
  route: "modal/survey",
  build: (id, title) =>
    modalComponent(
      title,
      id(),
      label({
        label: "Mood",
        component: radioGroup({
          customId: "mood",
          required: true,
          options: [
            { label: "Great", value: "great" },
            { label: "Okay", value: "okay" },
            { label: "Blocked", value: "blocked" },
          ],
        }),
      }),
      label({
        label: "Features used",
        description: "Pick every component family you tested.",
        component: checkboxGroup({
          customId: "features",
          required: false,
          minValues: 0,
          maxValues: 3,
          options: [
            { label: "Message components", value: "message" },
            { label: "Modal components", value: "modal" },
            { label: "Layouts", value: "layout" },
          ],
        }),
      }),
      label({
        label: "Subscribe to updates",
        component: checkbox({
          customId: "subscribe",
          default: true,
        }),
      }),
    ),
  run: (ctx) => {
    return ctx.reply(
      `Survey: mood=${formatValue(ctx.values.get("mood"))}, features=${formatValue(ctx.values.get("features"))}, subscribe=${formatValue(ctx.values.get("subscribe"))}`,
    );
  },
});

export const modal = profileModal;
