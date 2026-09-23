import { expectTypeOf, it } from "vitest";
import { createComponentRoute } from "./component_route.util";

it("types public component route codecs", () => {
  const dynamicRoute = createComponentRoute("ticket/{ticketId}/{action}");
  const params = dynamicRoute.match(dynamicRoute.build({ ticketId: "42", action: "close" }));

  expectTypeOf(params).toEqualTypeOf<{ ticketId: string; action: string } | null>();
  // @ts-expect-error dynamic routes require every declared parameter.
  dynamicRoute.build({ ticketId: "42" });
  // @ts-expect-error dynamic routes reject undeclared parameters.
  dynamicRoute.build({ ticketId: "42", action: "close", extra: "no" });

  const staticRoute = createComponentRoute("ticket/create");
  expectTypeOf(staticRoute.build).parameters.toEqualTypeOf<[]>();
  staticRoute.build();
  // @ts-expect-error static routes do not accept parameters.
  staticRoute.build({ ticketId: "42" });
});
