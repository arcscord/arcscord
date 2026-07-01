---
sidebar_position: 3
---

# Command autocomplete

Autocomplete lets Discord request suggestions while a user is typing a slash command option. Arcscord models autocomplete per option: enable it in the command definition, then provide one handler for each autocomplete option.

Discord only supports autocomplete for `string`, `integer`, and `number` options.

:::warning
Autocomplete is only partially typed. TypeScript may still accept missing handlers, handlers for options that do not exist, or handlers for options without `autocomplete: true`. Arcscord validates these rules when commands are loaded, so invalid autocomplete definitions fail during bot startup before command registration.
:::

## Basic usage

Set `autocomplete: true` on the option, then add a handler with the same option name in the command `autocomplete` object.

```ts
import { createCommand } from "arcscord";

const animeList = ["Naruto", "Bleach", "One Piece"];

export const searchCommand = createCommand({
  slash: {
    name: "search",
    description: "Search anime",
    options: {
      anime: {
        type: "string",
        description: "Anime name",
        autocomplete: true,
        required: true,
      },
    },
  },

  autocomplete: {
    anime: (ctx) => {
      const choices = animeList
        .filter(anime => anime.includes(ctx.value))
        .slice(0, 25);

      return ctx.sendChoices(choices);
    },
  },

  run: (ctx) => {
    return ctx.reply(`You chose ${ctx.options.anime}`);
  },
});
```

## Focused option context

Each autocomplete handler receives a context specialized for its option.

```ts
autocomplete: {
  anime: (ctx) => {
    ctx.name;
    ctx.value;
    ctx.fullFocus;

    return ctx.sendChoices(["Naruto"]);
  },
}
```

For the `anime` handler above:

| Property | Type | Description |
| --- | --- | --- |
| `ctx.name` | `"anime"` | The focused option name. |
| `ctx.value` | `string` | The current typed value. |
| `ctx.fullFocus` | Discord.js `AutocompleteFocusedOption` | The raw focused option from Discord.js. |

For `integer` and `number` autocomplete options, `ctx.value` is still typed as `string`. Discord sends autocomplete input as the raw typed value, even for numeric options. Parse it yourself when needed and handle invalid partial input.

## Multiple autocomplete options

Declare one handler per autocomplete option.

```ts
export const searchCommand = createCommand({
  slash: {
    name: "search",
    description: "Search anime",
    options: {
      anime: {
        type: "string",
        description: "Anime name",
        autocomplete: true,
      },
      year: {
        type: "integer",
        description: "Release year",
        autocomplete: true,
      },
    },
  },

  autocomplete: {
    anime: (ctx) => {
      return ctx.sendChoices(["Naruto", "Bleach"]);
    },
    year: (ctx) => {
      return ctx.sendChoices([1999, 2004, 2011]);
    },
  },

  run: ctx => ctx.reply("Done"),
});
```

The handler key must match an option with `autocomplete: true`. Arcscord partially types `ctx.sendChoices()` from that option when it can infer the focused option:

```ts
autocomplete: {
  anime: (ctx) => {
    return ctx.sendChoices(["Naruto"]);
  },
  year: (ctx) => {
    return ctx.sendChoices([2002]);
  },
}
```

## Rules

Autocomplete follows these rules:

1. An option with `autocomplete: true` must have a matching handler in `autocomplete`.
2. A handler key must match an option declared in the definition.
3. A handler key must target a `string`, `integer`, or `number` option.
4. An option cannot use both `choices` and `autocomplete: true`.
5. `ctx.value` is the raw typed string from Discord, and `ctx.sendChoices()` is typed from the focused option.

Arcscord validates these handler rules when commands are loaded. Invalid autocomplete definitions fail before command registration, even when TypeScript accepts them.

## Choice limit

Discord accepts up to 25 autocomplete choices per response. Slice dynamic results before sending them.

```ts
autocomplete: {
  anime: (ctx) => {
    const choices = animeList
      .filter(anime => anime.toLowerCase().includes(ctx.value.toLowerCase()))
      .slice(0, 25);

    return ctx.sendChoices(choices);
  },
}
```
