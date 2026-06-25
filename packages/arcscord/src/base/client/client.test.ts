import { describe, expect, it } from "vitest";
import { ArcClient } from "./client.class";

describe("arc client messages", () => {
  it("passes locale context to user-visible base messages", async () => {
    const client = new ArcClient("token", {
      intents: [],
      managers: {
        locale: {
          enabled: true,
          i18nOptions: {
            resources: {
              fr: {
                translation: {
                  "errors.internal": "Erreur {{id}}",
                },
              },
            },
            fallbackLng: "fr",
          },
        },
      },
      baseMessages: {
        error: (id, context) => ({
          content: context?.t?.("errors.internal", { id }) ?? id,
        }),
      },
    });

    await client.localeManager.ready;

    expect(client.getErrorMessage("abc", "fr")).toEqual({
      content: "Erreur abc",
    });
  });
});
