---
sidebar_position: 5
---

# Middleware

Arcscord middlewares run before a command or component handler. They are useful for checks and shared behavior such as permissions, feature flags, telemetry, cooldowns, author-only components, or any other logic that should happen before the main handler.

Middleware support is provided by the core `arcscord` package through `CommandMiddleware` and `ComponentMiddleware`. Ready-to-use middleware implementations are documented separately in the [`@arcscord/middleware` package page](/packages/middleware).

## Result Types

Every middleware returns one of three results:

| Result | Helper | Meaning |
| --- | --- | --- |
| Continue | `this.next(value)` | Continue to the next middleware or handler and expose `value` in `ctx.additional`. |
| Cancel | `this.cancel(result)` | Stop the middleware chain and do not run the handler. Use this when the middleware already replied or handled the interaction. |
| Error | `this.error(error)` | Stop the middleware chain and forward the error to Arcscord's error handler. |

Only one result is active at a time. Returned objects always contain `next`, `cancel`, and `error`, with inactive fields set to `null`.

## Execution Flow

Middlewares run in the order they are listed in `use`.

```ts
use: [
  new FirstMiddleware(),
  new SecondMiddleware(),
];
```

The flow is:

1. Arcscord creates the command or component context.
2. Each middleware runs in order.
3. `next(value)` stores the value under `ctx.additional[middleware.name]`.
4. `cancel(result)` stops execution after the cancel result resolves successfully.
5. `error(error)` stops execution and calls the configured error handler.
6. If every middleware continues, Arcscord runs the command or component handler.

If a middleware throws, Arcscord converts it to a command or component error and forwards it through the same error path.

## Command Middleware

Create command middleware by extending `CommandMiddleware`.

```ts
import type { CommandContext, CommandMiddlewareRun } from "arcscord";
import { CommandMiddleware } from "arcscord";
import { MessageFlags } from "discord.js";

const allowedUserIds = new Set(["123456789"]);

type AllowedUserState = {
  allowed: true;
};

class AllowedUsersMiddleware extends CommandMiddleware {
  readonly name = "allowedUsers" as const;

  run(ctx: CommandContext): CommandMiddlewareRun<AllowedUserState> {
    if (!allowedUserIds.has(ctx.user.id)) {
      return this.cancel(ctx.reply({
        content: "You cannot use this command.",
        flags: MessageFlags.Ephemeral,
      }));
    }

    return this.next({ allowed: true });
  }
}
```

Use it on a command:

```ts
import { createCommand } from "arcscord";

export const adminCommand = createCommand({
  build: {
    slash: {
      name: "admin",
      description: "Admin-only command",
    },
  },
  use: [new AllowedUsersMiddleware()],
  run: (ctx) => {
    const allowedState = ctx.additional.allowedUsers;

    return ctx.reply(`Allowed: ${allowedState.allowed}`);
  },
});
```

### Command Errors

Use `this.error(...)` when the middleware cannot handle the failure by replying.

```ts
import type { CommandContext, CommandMiddlewareRun } from "arcscord";
import { CommandError, CommandMiddleware } from "arcscord";

class RequiredConfigMiddleware extends CommandMiddleware {
  readonly name = "requiredConfig" as const;

  run(ctx: CommandContext): CommandMiddlewareRun<{ configured: true }> {
    if (!process.env.REQUIRED_CHANNEL_ID) {
      return this.error(new CommandError({
        ctx,
        message: "Missing REQUIRED_CHANNEL_ID",
      }));
    }

    return this.next({ configured: true });
  }
}
```

## Component Middleware

Create component middleware by extending `ComponentMiddleware`.

```ts
import type { ComponentContext, ComponentMiddlewareRun } from "arcscord";
import { ComponentMiddleware } from "arcscord";
import { MessageFlags } from "discord.js";

type AuthorState = {
  status: "author" | "ignored";
};

class SameAuthorMiddleware extends ComponentMiddleware {
  readonly name = "sameAuthor" as const;

  run(ctx: ComponentContext): ComponentMiddlewareRun<AuthorState> {
    if (!ctx.isMessageComponentContext()) {
      return this.next({ status: "ignored" });
    }

    if (!ctx.message.interactionMetadata) {
      return this.next({ status: "ignored" });
    }

    if (ctx.message.interactionMetadata.user.id !== ctx.user.id) {
      return this.cancel(ctx.reply({
        content: "Only the original author can use this component.",
        flags: MessageFlags.Ephemeral,
      }));
    }

    return this.next({ status: "author" });
  }
}
```

Use it on a component:

```ts
import { buildClickableButton, createButton } from "arcscord";

export const secureButton = createButton({
  route: "secure_button",
  build: id => buildClickableButton({
    customId: id(),
    label: "Confirm",
    style: "success",
  }),
  use: [new SameAuthorMiddleware()],
  run: (ctx) => {
    const authorState = ctx.additional.sameAuthor;

    return ctx.reply(`Status: ${authorState.status}`);
  },
});
```

### Component Errors

Use `this.error(...)` with `ComponentError` when the middleware should fail through Arcscord's error handler.

```ts
import type { ComponentContext, ComponentMiddlewareRun } from "arcscord";
import { ComponentError, ComponentMiddleware } from "arcscord";

class RequiredRouteParamMiddleware extends ComponentMiddleware {
  readonly name = "requiredRouteParam" as const;

  run(ctx: ComponentContext): ComponentMiddlewareRun<{ itemId: string }> {
    const itemId = ctx.params.itemId;

    if (!itemId) {
      return this.error(new ComponentError({
        interaction: ctx.interaction,
        message: "Missing itemId route parameter",
      }));
    }

    return this.next({ itemId });
  }
}
```

## Accessing Middleware Values

Values returned with `next(value)` are stored in `ctx.additional` using the middleware `name`.

```ts
class UserScopeMiddleware extends CommandMiddleware {
  readonly name = "userScope" as const;

  run(ctx: CommandContext): CommandMiddlewareRun<{ userId: string }> {
    return this.next({ userId: ctx.user.id });
  }
}

export const scopedCommand = createCommand({
  build: {
    slash: {
      name: "scope",
      description: "Read middleware data",
    },
  },
  use: [new UserScopeMiddleware()],
  run: (ctx) => {
    return ctx.reply(`User id: ${ctx.additional.userScope.userId}`);
  },
});
```

For best type inference, define middleware names with `as const`.

```ts
readonly name = "userScope" as const;
```

Middleware names must be unique inside a single `use` array. Arcscord rejects duplicate names before running any middleware, because duplicate names would overwrite the same `ctx.additional[name]` entry.

## Choosing `next`, `cancel`, or `error`

Use `next` when the handler should continue:

```ts
return this.next({ checked: true });
```

Use `cancel` when the middleware handled the interaction and the handler should not run:

```ts
return this.cancel(ctx.reply({
  content: "You cannot use this.",
  flags: MessageFlags.Ephemeral,
}));
```

Use `error` when the framework error handler should receive the failure:

```ts
return this.error(new ComponentError({
  interaction: ctx.interaction,
  message: "Unexpected middleware state",
}));
```

## Best Practices

- Keep middleware focused on one responsibility.
- Use stable `name` values with `as const` so `ctx.additional` is typed correctly.
- Prefer `cancel` for expected user-facing blocks such as missing permissions or cooldowns.
- Prefer `error` for invalid configuration, unexpected state, or failures that should be logged centrally.
- Return small serializable objects from `next`; they are easier to inspect and test.
- Put reusable middleware in shared files or packages instead of duplicating checks in handlers.
