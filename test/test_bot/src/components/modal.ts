import {
  buildCheckbox,
  buildCheckboxGroup,
  buildLabel,
  buildModal,
  buildRadioGroup,
  buildStringSelectModalComponent,
  buildTextDisplay,
  buildTextInput,
  createModal,
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
  matcher: "modal:profile",
  build: title =>
    buildModal(
      title,
      "modal:profile",
      buildLabel({
        label: "Name",
        component: buildTextInput({
          customId: "name",
          style: "short",
          required: true,
        }),
      }),
      buildLabel({
        label: "Age",
        component: buildTextInput({
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
  matcher: "modal:feedback",
  build: title =>
    buildModal(
      title,
      "modal:feedback",
      buildTextDisplay({
        content: "Use the fields below to send structured feedback.",
      }),
      buildLabel({
        label: "Category",
        description: "Choose the topic closest to your feedback.",
        component: buildStringSelectModalComponent({
          customId: "category",
          required: true,
          options: [
            { label: "Bug", value: "bug" },
            { label: "Idea", value: "idea" },
            { label: "Question", value: "question" },
          ],
        }),
      }),
      buildLabel({
        label: "Message",
        component: buildTextInput({
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
  matcher: "modal:survey",
  build: title =>
    buildModal(
      title,
      "modal:survey",
      buildLabel({
        label: "Mood",
        component: buildRadioGroup({
          customId: "mood",
          required: true,
          options: [
            { label: "Great", value: "great" },
            { label: "Okay", value: "okay" },
            { label: "Blocked", value: "blocked" },
          ],
        }),
      }),
      buildLabel({
        label: "Features used",
        description: "Pick every component family you tested.",
        component: buildCheckboxGroup({
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
      buildLabel({
        label: "Subscribe to updates",
        component: buildCheckbox({
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
