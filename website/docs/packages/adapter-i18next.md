---
description: Typed i18next localization adapter for Arcscord.
---

# @arcscord/adapter-i18next

The official i18next adapter initializes an isolated i18next instance or uses an already initialized custom instance. It preserves i18next selector typing, fixed-locale runtime translation, namespaces, and resource filtering for Discord metadata.

Runtime translations use the native fixed `t` function. Discord metadata accepts native
i18next selectors or string keys through `localizations(...)` and its short alias `l(...)`.

```ts
nameLocalizations: localization.l($ => $.commands.ping.name)
```

- [Localization guide](/guide/localization#i18next)
- [API reference](/api?package=adapter-i18next)
- [npm package](https://www.npmjs.com/package/@arcscord/adapter-i18next)

```sh
pnpm add arcscord @arcscord/adapter-i18next i18next
```
