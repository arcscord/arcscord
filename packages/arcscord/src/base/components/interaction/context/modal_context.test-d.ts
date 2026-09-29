import type { ModalContext } from "./modal_context";
import { expectTypeOf, it } from "vitest";

it("requires the message-modal guard before updating the source message", () => {
  const ctx = null as unknown as ModalContext<[], "profile/{userId}", { name: string }>;

  // @ts-expect-error a generic modal is not known to have a source message.
  void ctx.updateSourceMessage("Updated");

  if (ctx.isFromMessage()) {
    expectTypeOf(ctx.message.id).toBeString();
    expectTypeOf(ctx.params.userId).toBeString();
    expectTypeOf(ctx.values.name).toBeString();
    void ctx.updateSourceMessage("Updated");
  }
});
