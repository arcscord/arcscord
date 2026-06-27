---
sidebar_position: 2
---

# Command options

Slash commands and subcommands can define options. Options are declared as a named object in `build.slash.options` or in a subcommand `build.options`.

Discord documents the raw option model in the [application command option structure](https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-structure) and the [application command option types](https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type).

## Basic shape

Every option needs a `type` and `description`. Options are optional by default.

```ts
options: {
  user: {
    type: "user",
    description: "User to inspect",
  },
  reason: {
    type: "string",
    description: "Reason to show in logs",
    required: true,
  },
}
```

The object key is the option name. In the example above, the handler reads `ctx.options.user` and `ctx.options.reason`.

## Supported option types

Arcscord supports these Discord option types:

| Type | Handler value | Use for |
| --- | --- | --- |
| `string` | `string` | Free text, ids, labels, modes, or any text value. |
| `integer` | `number` | Whole numbers only. |
| `boolean` | `boolean` | True/false switches. |
| `user` | Discord.js `User` | Selecting a Discord user. |
| `channel` | Discord.js channel object | Selecting a channel. |
| `role` | Discord.js `Role` | Selecting a role. |
| `mentionable` | Discord.js `User` or `Role` | Selecting either a user or a role. |
| `number` | `number` | Decimal or whole numeric values. |
| `attachment` | Discord.js `Attachment` | Uploading a file with the command. |

Discord also has raw `subcommand` and `subcommand_group` option types. In Arcscord, use `buildCommandWithSubs` instead of declaring those manually.

## String

Use `string` for text input. You can restrict length with `min_length` and `max_length`.

```ts
options: {
  query: {
    type: "string",
    description: "Search query",
    required: true,
    min_length: 3,
    max_length: 100,
  },
}
```

## Integer

Use `integer` for whole numbers. You can restrict the value with `min_value` and `max_value`.

```ts
options: {
  count: {
    type: "integer",
    description: "Number of messages to delete",
    required: true,
    min_value: 1,
    max_value: 100,
  },
}
```

## Number

Use `number` when decimal values are valid.

```ts
options: {
  multiplier: {
    type: "number",
    description: "Score multiplier",
    min_value: 0.1,
    max_value: 10,
  },
}
```

## Boolean

Use `boolean` for true/false settings.

```ts
options: {
  silent: {
    type: "boolean",
    description: "Hide the response from other users",
  },
}
```

## User

Use `user` when the command needs a Discord user.

```ts
options: {
  user: {
    type: "user",
    description: "User to inspect",
    required: true,
  },
}
```

## Channel

Use `channel` when the command needs a Discord channel. Restrict allowed channel types with `channel_types`.

```ts
options: {
  channel: {
    type: "channel",
    description: "Channel to configure",
    required: true,
    channel_types: ["guildText", "guildAnnouncement"],
  },
}
```

Arcscord channel type names map to Discord channel types. See Discord's [channel type documentation](https://discord.com/developers/docs/resources/channel#channel-object-channel-types).

## Role

Use `role` when the command needs a guild role.

```ts
options: {
  role: {
    type: "role",
    description: "Role to assign",
    required: true,
  },
}
```

## Mentionable

Use `mentionable` when either a user or a role is valid.

```ts
options: {
  target: {
    type: "mentionable",
    description: "User or role to notify",
    required: true,
  },
}
```

## Attachment

Use `attachment` when the user must upload a file with the command.

```ts
options: {
  file: {
    type: "attachment",
    description: "File to import",
    required: true,
  },
}
```

## Choices

`string`, `integer`, and `number` options can define fixed choices. Choices can be simple values, objects, or a name-to-value map.

```ts
options: {
  color: {
    type: "string",
    description: "Color to use",
    choices: [
      "red",
      "green",
      {
        name: "Deep blue",
        value: "blue",
      },
    ],
  },
  size: {
    type: "integer",
    description: "Image size",
    choices: {
      Small: 128,
      Medium: 512,
      Large: 1024,
    },
  },
}
```

### Typed choices with `as const`

Adding `as const` to the choices array narrows `ctx.options` to the exact union of values instead of the broader type (`string`, `number`):

```ts
options: {
  action: {
    type: "string",
    description: "Action to perform",
    required: true,
    choices: [
      { name: "Ban", value: "ban" },
      { name: "Kick", value: "kick" },
      "warn",
    ] as const,
  },
}

// ctx.options.action is "ban" | "kick" | "warn"  (not just string)
```

Choices and autocomplete are mutually exclusive for the same option.

## Autocomplete

`string`, `integer`, and `number` options can enable autocomplete.

```ts
import { createCommand } from "arcscord";

export const searchCommand = createCommand({
  build: {
    slash: {
      name: "search",
      description: "Search by tag",
      options: {
        tag: {
          type: "string",
          description: "Tag to search",
          autocomplete: true,
        },
      },
    },
  },
  autocomplete: {
    tag: (ctx) => {
      return ctx.sendChoices([
        {
          name: "TypeScript",
          value: "typescript",
        },
        {
          name: "Discord.js",
          value: "discordjs",
        },
      ]);
    },
  },
  run: ctx => ctx.reply(`Searching ${ctx.options.tag}`),
});
```

The `autocomplete` object must contain one handler for each option with `autocomplete: true`. Read the [command autocomplete](./autocomplete.md) page for validation rules, multiple-option examples, and choice limits.
