import type { TypedSelectMenuOptionOverride, TypedSelectMenuOptionOverrides } from "arcscord";
import type { Attachment, GuildBasedChannel, Role, User } from "discord.js";
import { CommandBotPermissionMiddleware } from "@arcscord/middleware";
import {
  ArcClient,
  buildModal,
  createCommand,
  createModal,
  createTypedStringMenu,
  modalStringSelect,
  modalTextInput,
  modalUserSelect,
} from "arcscord";
import { GatewayIntentBits } from "discord.js";

type IsExact<Actual, Expected>
  = (<Value>() => Value extends Actual ? 1 : 2) extends
  (<Value>() => Value extends Expected ? 1 : 2)
    ? (<Value>() => Value extends Expected ? 1 : 2) extends
      (<Value>() => Value extends Actual ? 1 : 2)
        ? true
        : false
    : false;

function expectExactType<Check extends true>(_check: Check): void {}

const command = createCommand({
  slash: {
    name: "compatibility",
    description: "TypeScript 5.4 compatibility check",
    options: {
      query: { type: "string", description: "Search query", required: true },
      count: { type: "integer", description: "Maximum result count" },
      score: { type: "number", description: "Minimum score", required: true },
      exact: { type: "boolean", description: "Require an exact match" },
      user: { type: "user", description: "Filter by user", required: true },
      channel: { type: "channel", description: "Filter by channel" },
      role: { type: "role", description: "Filter by role", required: true },
      mention: { type: "mentionable", description: "Filter by mentionable" },
      file: { type: "attachment", description: "Attached query", required: true },
      format: { type: "string", description: "Result format", autocomplete: true },
    },
  },
  autocomplete: {
    format: (ctx) => {
      expectExactType<IsExact<typeof ctx.name, "format">>(true);
      expectExactType<IsExact<typeof ctx.value, string>>(true);
      void ctx.sendChoices(["compact", "detailed"]);
      // @ts-expect-error String autocomplete options reject numeric choices.
      void ctx.sendChoices([1, 2]);
      return ctx.ok();
    },
  },
  run: (ctx) => {
    expectExactType<IsExact<typeof ctx.options.query, string>>(true);
    expectExactType<IsExact<typeof ctx.options.count, number | undefined>>(true);
    expectExactType<IsExact<typeof ctx.options.score, number>>(true);
    expectExactType<IsExact<typeof ctx.options.exact, boolean | undefined>>(true);
    expectExactType<IsExact<typeof ctx.options.user, User>>(true);
    expectExactType<IsExact<typeof ctx.options.channel, GuildBasedChannel | undefined>>(true);
    expectExactType<IsExact<typeof ctx.options.role, Role>>(true);
    expectExactType<IsExact<typeof ctx.options.mention, User | Role | undefined>>(true);
    expectExactType<IsExact<typeof ctx.options.file, Attachment>>(true);
    expectExactType<IsExact<typeof ctx.options.format, string | undefined>>(true);
    // @ts-expect-error Undeclared slash options must not exist on the context.
    void ctx.options.missing;
    return ctx.ok("typed slash command" as const);
  },
});

const modal = createModal({
  route: "compat/modal/{requestId}",
  fields: {
    title: modalTextInput({ label: "Title" }),
    note: modalTextInput({ label: "Note", required: false }),
    priority: modalStringSelect({
      label: "Priority",
      options: ["low", "medium", "high"] as const,
    }),
    tags: modalStringSelect({
      label: "Tags",
      options: ["bug", "feature", "docs"] as const,
      maxValues: 3,
    }),
    assignee: modalUserSelect({ label: "Assignee" }),
  },
  build: (id, fields) => {
    fields.priority.label({ options: { high: { label: "High priority" } } });
    // @ts-expect-error Modal option overrides only accept declared values.
    fields.priority.label({ options: { urgent: { label: "Urgent" } } });

    return buildModal({
      title: "Compatibility modal",
      customId: id(),
      components: [
        fields.title.label(),
        fields.note.label(),
        fields.priority.label(),
        fields.tags.label(),
        fields.assignee.label(),
      ],
    });
  },
  run: (ctx) => {
    expectExactType<IsExact<typeof ctx.params, { requestId: string }>>(true);
    expectExactType<IsExact<typeof ctx.values.title, string>>(true);
    expectExactType<IsExact<typeof ctx.values.note, string | undefined>>(true);
    expectExactType<IsExact<typeof ctx.values.priority, "low" | "medium" | "high">>(true);
    expectExactType<IsExact<typeof ctx.values.tags, ("bug" | "feature" | "docs")[]>>(true);
    expectExactType<IsExact<typeof ctx.values.assignee, User>>(true);
    // @ts-expect-error Undeclared modal fields must not exist on the context.
    void ctx.values.missing;
    return ctx.ok(ctx.values.priority);
  },
});

const statusValues = {
  open: { label: "Open" },
  closed: { label: "Closed" },
  archived: { label: "Archived" },
} as const;
const archivedOverride: TypedSelectMenuOptionOverride = {
  emoji: "📦",
  default: false,
};
const statusOverrides: TypedSelectMenuOptionOverrides<typeof statusValues> = {
  archived: archivedOverride,
};

const multiSelect = createTypedStringMenu({
  route: "compat/select/{scope}",
  values: statusValues,
  maxValues: 2,
  build: (id, labels: { open: string; closed: string }) => ({
    customId: id(),
    placeholder: "Choose statuses",
    optionOverrides: {
      ...statusOverrides,
      open: { label: labels.open },
      closed: { label: labels.closed },
    },
  }),
  run: async (ctx) => {
    expectExactType<IsExact<typeof ctx.params, { scope: string }>>(true);
    expectExactType<IsExact<typeof ctx.values, ("open" | "closed" | "archived")[]>>(true);
    // @ts-expect-error A typed selection cannot contain an undeclared value.
    const invalid: typeof ctx.values = ["deleted"];
    void invalid;
    return ctx.ok();
  },
});

const singleSelect = createTypedStringMenu({
  route: "compat/single-select",
  values: {
    yes: { label: "Yes" },
    no: { label: "No" },
  } as const,
  maxValues: 1,
  build: id => ({ customId: id() }),
  run: async (ctx) => {
    expectExactType<IsExact<typeof ctx.values, "yes" | "no">>(true);
    // @ts-expect-error maxValues: 1 exposes one value, not an array.
    const invalid: typeof ctx.values = ["yes"];
    void invalid;
    return ctx.ok();
  },
});

modal.build({ requestId: "request-1" });
multiSelect.build({ scope: "all" }, { open: "Available", closed: "Resolved" });
singleSelect.build();

const client = new ArcClient("", { intents: [GatewayIntentBits.Guilds] });
const middleware = new CommandBotPermissionMiddleware(["SendMessages"], () => ({
  content: "Missing permissions",
}));

void command;
void client;
void middleware;
