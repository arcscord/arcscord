import * as standalone from "@arcscord/components";
import { describe, expect, it } from "vitest";
import * as display from "./index";

describe("standalone components delegation", () => {
  it("re-exports the standalone implementations without wrappers", () => {
    expect(display.v2Message).toBe(standalone.v2Message);
    expect(display.container).toBe(standalone.container);
    expect(display.section).toBe(standalone.section);
    expect(display.actionRow).toBe(standalone.actionRow);
  });
});
