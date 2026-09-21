import { expectTypeOf, it } from "vitest";
import { createLocalizationAdapter } from "./localization";

it("preserves a custom adapter surface", () => {
  const adapter = createLocalizationAdapter({
    defaultLocale: "en",
    locales: ["en"],
    localize: (locale: string) => ({
      greeting: (name: string) => `${locale}:${name}`,
    }),
  });

  expectTypeOf(adapter.localize({ locale: "en" }).greeting).parameter(0).toEqualTypeOf<string>();
  adapter.localizations(surface => surface.greeting("Ada"));
});
