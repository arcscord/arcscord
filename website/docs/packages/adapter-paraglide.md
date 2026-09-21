---
description: Typed Paraglide JS localization adapter for Arcscord.
---

# @arcscord/adapter-paraglide

The official Paraglide adapter consumes the application's generated `messages`, `locales`, and `baseLocale` exports. It preserves generated message types and fixes a locale per interaction without mutating global Paraglide state.

Pass generated message functions directly when defining Discord metadata:

```ts
nameLocalizations: localization.l(messages.commands_ping_name)
```

- [Localization guide](/guide/localization#paraglide-js)
- [API reference](/api?package=adapter-paraglide)
- [npm package](https://www.npmjs.com/package/@arcscord/adapter-paraglide)

```sh
pnpm add arcscord @arcscord/adapter-paraglide
```
