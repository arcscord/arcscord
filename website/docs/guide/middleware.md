---
sidebar_position: 5
---

# Middleware

Arcscord middlewares run before a command or component handler. They are useful for checks and shared behavior such as permissions, feature flags, telemetry, author-only components, or any other logic that should happen before the main handler.

Middleware support is provided by the core `arcscord` package through `CommandMiddleware` and `ComponentMiddleware`. Ready-to-use middleware implementations are documented separately in the [`@arcscord/middleware` package page](/packages/middleware).

## Result Types

Every middleware returns one of three results:

| Result | Helper | Meaning |
| --- | --- | --- |
| Continue | `this.next(value)` | Continue to the next middleware or handler and expose `value` in `ctx.additional`. |
| Cancel | `this.cancel(result)` | Stop the middleware chain and do not run the handler. Use this when the middleware already replied or handled the interaction. |
| Failure | `this.fail(failure)` | Stop the middleware chain and forward an expected failure to the result handler. |

Each helper returns a discriminated object whose `status` is `"next"`, `"cancel"`, or `"failure"`.

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
4. `cancel(result)` awaits its optional result, then stops execution. If that result returns an error `Result`, it becomes an expected failure.
5. `fail(failure)` awaits its value, stops execution, and forwards that expected failure to the configured result handler.
6. If every middleware continues, Arcscord runs the command or component handler.

If middleware execution or a cancelled operation throws, Arcscord forwards it to the result handler as an `ExecutionExit` defect.

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
  slash: {
    name: "admin",
    description: "Admin-only command",
  },
  use: [new AllowedUsersMiddleware()],
  run: (ctx) => {
    const allowedState = ctx.additional.allowedUsers;

    return ctx.reply(`Allowed: ${allowedState.allowed}`);
  },
});
```

### Command failures

Use `this.fail(...)` when the middleware cannot handle the failure by replying. The failure may be any value and is preserved in `ExecutionExit.failure`.

```ts
import type { CommandContext, CommandMiddlewareRun } from "arcscord";
import { CommandMiddleware } from "arcscord";

class RequiredConfigMiddleware extends CommandMiddleware {
  readonly name = "requiredConfig" as const;

  run(_ctx: CommandContext): CommandMiddlewareRun<{ configured: true }> {
    if (!process.env.REQUIRED_CHANNEL_ID) {
      return this.fail({
        _tag: "MissingConfiguration",
        key: "REQUIRED_CHANNEL_ID",
      } as const);
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
import { button, createButton } from "arcscord";

export const secureButton = createButton({
  route: "secure_button",
  build: id => button({
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

### Component failures

Use `this.fail(...)` when the middleware should fail through the component result handler.

```ts
import type { ComponentContext, ComponentMiddlewareRun } from "arcscord";
import { ComponentMiddleware } from "arcscord";

class RequiredRouteParamMiddleware extends ComponentMiddleware {
  readonly name = "requiredRouteParam" as const;

  run(ctx: ComponentContext): ComponentMiddlewareRun<{ itemId: string }> {
    const itemId = ctx.params.itemId;

    if (!itemId) {
      return this.fail({
        _tag: "MissingRouteParameter",
        parameter: "itemId",
      } as const);
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
  slash: {
    name: "scope",
    description: "Read middleware data",
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

Middleware names must be unique inside a single `use` array. Arcscord rejects duplicate names when commands or components are loaded, because duplicate names would overwrite the same `ctx.additional[name]` entry. Command duplicates return `COMMAND_VALIDATION_FAILED`; component duplicates return `COMPONENT_VALIDATION_FAILED`.

For command middleware duplicates, the error message identifies the complete command path and `error.metadata.commandName` contains the same value, such as `admin.ban` or `admin.moderation.ban`. Component errors identify their route in both the message and `error.metadata.route`.

## Choosing `next`, `cancel`, or `fail`

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

Use `fail` when the result handler should receive an expected failure:

```ts
return this.fail({
  _tag: "InvalidMiddlewareState",
} as const);
```

## Reusable Localized Middleware Messages

Middlewares from `@arcscord/middleware` accept message factories. These factories receive middleware data plus `ctx`, `locale`, and `t`, so you can define the user-facing message once and reuse it across commands.

```ts
import type { CommandBotPermissionMiddlewareMessageOptions, MessageOptions } from "@arcscord/middleware";
import type { CommandContext } from "arcscord";
import type { PermissionsString } from "discord.js";
import { CommandBotPermissionMiddleware } from "@arcscord/middleware";

const missingBotPermissionMessage: MessageOptions<CommandBotPermissionMiddlewareMessageOptions, CommandContext> = ({ missingPermissions, t }) => ({
  content: t($ => $.middleware.bot_missing_permissions, {
    permissions: missingPermissions.join(", "),
  }),
});

export const createBotPermissionMiddleware = (permissions: PermissionsString[]) => {
  return new CommandBotPermissionMiddleware(permissions, missingBotPermissionMessage);
};
```

Then each command only chooses the middleware configuration:

```ts
use: [
  createBotPermissionMiddleware(["ManageMessages"]),
];
```

## Best Practices

- Keep middleware focused on one responsibility.
- Use stable `name` values with `as const` so `ctx.additional` is typed correctly.
- Prefer `cancel` for expected user-facing blocks such as missing permissions or disallowed users.
- Prefer `error` for invalid configuration, unexpected state, or failures that should be logged centrally.
- Return small serializable objects from `next`; they are easier to inspect and test.
- Put reusable middleware in shared files or packages instead of duplicating checks in handlers.
