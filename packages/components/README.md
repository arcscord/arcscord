# @arcscord/components

Standalone, typed helpers for building Discord Components V2 messages. The package depends only on Discord.js and `discord-api-types`; it does not require the Arcscord framework.

## Using the helpers through Arcscord

Arcscord re-exports the complete Components V2 API. An Arcscord bot can import the helpers from the framework without installing this package separately:

```ts
import { actionRow, container, text, v2Message } from "arcscord";

await ctx.reply(v2Message(
  container(
    text("## Ready"),
    actionRow(confirmButton.build()),
  ),
));
```

## Standalone installation

```sh
pnpm add @arcscord/components discord.js
```

## Standalone usage with Discord.js

```ts
import {
  accessory,
  actionRow,
  container,
  section,
  separator,
  thumbnail,
  v2Message,
} from "@arcscord/components";
import { ButtonBuilder, ButtonStyle } from "discord.js";

const payload = v2Message(
  container(
    { accentColor: 0x5865F2 },
    "## Support",
    section(
      "Open a support request.",
      accessory(thumbnail({ media: { url: "https://example.com/support.png" } })),
    ),
    separator({ divider: true, spacing: "large" }),
    actionRow(
      new ButtonBuilder()
        .setCustomId("support")
        .setLabel("Open")
        .setStyle(ButtonStyle.Primary),
    ),
  ),
);
```

This example does not require an Arcscord client, context, manager, or error package. Pass the result to any compatible Discord.js reply or edit method. `v2Message` adds `MessageFlags.IsComponentsV2` automatically.

## Accepted inputs

Nested components accept:

- Discord.js `*ComponentData` objects;
- official Discord.js builders;
- raw `API*Component` objects from `discord-api-types`;
- strings wherever a text display is allowed.

Builders and raw API objects are recursively normalized to Discord.js camelCase component data. `actionRow` accepts either one to five buttons or exactly one string, user, role, mentionable, or channel select menu. Existing action rows can also be passed directly to `container` or `v2Message`.

`container()` only constructs a new container from options and children. Pass a complete `ContainerBuilder`, Discord.js container datum, or raw `APIContainerComponent` directly to `v2Message()`, or normalize it explicitly with `validateContainer()`.

## Runtime validation

Every helper runs a single serialization, normalization, and validation pipeline before returning. Invalid component fields, nesting, URL protocols, cardinalities, duplicate component/custom IDs, and messages containing more than 40 total components fail locally instead of being sent to Discord.

Component type errors stay neutral: `unexpected-component-type` reports a discriminator outside the accepted set, while `component-placement` reports a known Discord component used at an invalid nesting location. Neither error assumes whether the input is a typo or an API addition.

The same pipeline is available through named exports such as `validateButton`, `validateSection`, `validateContainer`, and `validateV2Message`. Successful calls return newly constructed, recursively normalized Discord.js camelCase data. A failed call throws `MessageComponentValidationError`, whose `rule`, `path`, `componentType`, and `details` fields can be used for structured reporting:

```ts
import {
  isMessageComponentValidationError,
  validateV2Message,
} from "@arcscord/components";

try {
  validateV2Message(payload);
}
catch (error) {
  if (isMessageComponentValidationError(error)) {
    console.error(error.rule, error.path);
  }
}
```

`arcscord` directly re-exports these functions, so direct calls preserve the same `MessageComponentValidationError`, function identity, overloads, and editor documentation. When the error crosses an Arcscord command, component, event, or middleware execution boundary, the framework converts the defect into an `ArcscordError` with code `MESSAGE_COMPONENT_VALIDATION_FAILED`. Use `normalizeArcscordError(error)` when the same conversion is needed manually. The standalone package has no dependency on Arcscord's error packages.

## Nesting

| Parent | Allowed children |
| --- | --- |
| `v2Message` | text, action row, container, file, media gallery, section, separator |
| `container` | text, action row, file, media gallery, section, separator |
| `section` | one or more text displays followed by one `accessory(...)` |
| `accessory` | one button or thumbnail |
| `actionRow` | one to five buttons, or exactly one select menu |

The helpers, validators, return values, and direct validation errors are identical through `@arcscord/components` and `arcscord`. Arcscord only adapts a validation error when it enters the framework execution pipeline or when `normalizeArcscordError` is called explicitly.
