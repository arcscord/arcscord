import type { LocalizationDefinition } from "./localization.type";
import { expectTypeOf, it } from "vitest";
import { createLocalizationAdapter, createLocalizationDefinition } from "./localization";

it("preserves a custom adapter surface", () => {
  const adapter = createLocalizationAdapter({
    defaultLocale: "en",
    locales: ["en"],
    localize: (locale: string) => ({
      greeting: (name: string) => `${locale}:${name}`,
    }),
  });

  expectTypeOf(adapter.localize({ locale: "en" }).greeting).parameter(0).toEqualTypeOf<string>();
  const localizations = (name: string): LocalizationDefinition => createLocalizationDefinition(
    adapter,
    locale => adapter.localize(locale).greeting(name),
  );
  expectTypeOf(localizations).parameter(0).toEqualTypeOf<string>();
});
