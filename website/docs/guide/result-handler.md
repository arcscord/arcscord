---
sidebar_position: 7
---

# Result handlers

Managers call a result handler after a command, component, or event handler
returns a result. Commands and components also have error handlers for failures
that happen outside the regular handler result path, such as thrown errors,
validation failures, or missing handlers.

## Event result handler

Event handlers return an `EventHandleResult`:

```ts
import { createEvent } from "arcscord";

export const messageEvent = createEvent({
  event: "messageCreate",
  run: (ctx, message) => {
    if (message.author.bot) {
      return ctx.ok("ignored bot message");
    }

    return ctx.ok(true);
  },
});
```

By default, Arcscord logs event errors through the event manager logger. You can
replace that behavior with `managers.event.resultHandler`:

```ts
import { ArcClient } from "arcscord";
import { MessageFlags } from "discord.js";

const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds", "GuildMessages"],
  managers: {
    event: {
      resultHandler: async ({ result, event, eventName }) => {
        const [err, value] = result;

        if (err) {
          err.generateId();
          client.logger.logError(err);
          return;
        }

        client.logger.debug(
          `Event ${event.name} handled ${String(eventName)} with ${String(value)}`,
        );
      },
    },
  },
});
```

The event result handler receives:

- `result`: the result returned by the event `run` function.
- `event`: the loaded event handler.
- `eventName`: the Discord.js event name.

The result handler may be async. Arcscord awaits it before finishing the event
execution path.

## Handling thrown errors

If an event handler throws, Arcscord converts the thrown value to an
`EventError` and passes it to the result handler as an error result:

```ts
const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds", "GuildMessages"],
  managers: {
    event: {
      resultHandler: ({ result, event }) => {
        const [err] = result;

        if (!err) {
          return;
        }

        err.generateId();
        client.logger.error(`Event ${event.name} failed`, {
          errorId: err.id,
          event: event.event,
        });
      },
    },
  },
});
```

Prefer returning `ctx.error(...)` for expected event failures and throwing only
for unexpected failures.

## Default behavior

The default event result handler checks the result and logs errors:

```ts
async handleResult(infos) {
  const [err] = infos.result;

  if (err !== null) {
    err.generateId();
    this.logger.logError(err);
  }
}
```

Successful event results are ignored by default.

## Command result handler

Command handlers return a `CommandRunResult`. By default, Arcscord logs failed
results, sends the configured internal-error message to the interaction, and
logs successful command execution at debug level.

```ts
import { ArcClient } from "arcscord";

const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds"],
  managers: {
    command: {
      resultHandler: async ({ result, interaction, command, defer, locale }) => {
        const [err, value] = result;

        if (err) {
          err.generateId();
          client.logger.logError(err);

          const message = client.getErrorMessage(err.id, locale);

          if (defer) {
            await interaction.editReply(message);
          }
          else {
            await interaction.reply({
              ...message,
              flags: MessageFlags.Ephemeral,
            });
          }

          return;
        }

        client.logger.debug(`Command ${command.build.slash?.name ?? "context"} returned ${String(value)}`);
      },
    },
  },
});
```

The command result handler receives:

- `result`: the result returned by the command `run` function.
- `interaction`: the Discord.js command interaction.
- `command`: the loaded command handler.
- `context`: the Arcscord command context.
- `locale`: the detected i18next language.
- `defer`: whether the command reply was deferred.
- `start` and `end`: execution timestamps.

## Command error handler

`managers.command.errorHandler` handles errors that bypass the command result
handler. This includes thrown command errors, autocomplete errors, middleware
errors, and framework validation errors.

```ts
import { MessageFlags } from "discord.js";

const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds"],
  managers: {
    command: {
      errorHandler: ({ error, interaction, autocomplete, context, internal }) => {
        const err = error.generateId();

        client.logger.logError(err);

        if (autocomplete) {
          return;
        }

        return interaction.reply({
          content: internal
            ? `Internal command error: ${err.id}`
            : `Command failed: ${err.id}`,
          flags: MessageFlags.Ephemeral,
        });
      },
    },
  },
});
```

Autocomplete interactions cannot receive normal message replies. If
`autocomplete` is `true`, log the error and return without replying.

## Component result handler

Component handlers return a `ComponentRunResult`. By default, Arcscord logs
failed results, sends the configured internal-error message to the component
interaction, and logs successful component execution at debug level.

```ts
import { MessageFlags } from "discord.js";

const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds"],
  managers: {
    component: {
      resultHandler: async ({ result, interaction, component, defer, locale }) => {
        const [err] = result;

        if (err) {
          err.generateId();
          client.logger.logError(err);

          const message = client.getErrorMessage(err.id, locale);

          if (defer) {
            await interaction.editReply(message);
          }
          else {
            await interaction.reply({
              ...message,
              flags: MessageFlags.Ephemeral,
            });
          }

          return;
        }

        client.logger.debug(`Component executed: ${component.route}`);
      },
    },
  },
});
```

The component result handler receives:

- `result`: the result returned by the component `run` function.
- `component`: the loaded component handler.
- `interaction`: the Discord.js component or modal interaction.
- `context`: the Arcscord component context when one was created.
- `locale`: the detected i18next language.
- `defer`: whether the component reply was deferred.
- `start` and `end`: execution timestamps.

## Component error handler

`managers.component.errorHandler` handles thrown component errors, missing
component routes, middleware errors, and other component dispatch failures.

```ts
import { MessageFlags } from "discord.js";

const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds"],
  managers: {
    component: {
      errorHandler: ({ error, interaction, context, internal }) => {
        const err = error.generateId();

        client.logger.logError(err);

        if (!interaction) {
          return;
        }

        if (context?.defer) {
          return interaction.editReply({
            content: `Component failed: ${err.id}`,
          });
        }

        return interaction.reply({
          content: internal
            ? `Internal component error: ${err.id}`
            : `Component failed: ${err.id}`,
          flags: MessageFlags.Ephemeral,
        });
      },
    },
  },
});
```

Use a custom result or error handler when you need centralized metrics,
structured logging, custom user-facing error messages, or different handling
for expected application errors.
