/**
 * Extracts dynamic segment names from a component route.
 */
export type RouteVariables<T extends string>
  = T extends `${string}/{${infer Var}}/${infer Rest}` ? Var | RouteVariables<`/${Rest}`>
    : T extends `${string}/{${infer Var}}` ? Var
      : never;

/**
 * Object passed when building a component whose route contains dynamic segments.
 */
export type RouteVariablesObject<T extends string> = {
  [K in RouteVariables<T>]: string;
};

/**
 * Arguments accepted by a component build function.
 *
 * Routes with dynamic segments require the route params first:
 * `button.build({ ticketId }, "Label")`.
 *
 * Static routes keep the regular typed arguments:
 * `button.build("Label")`.
 */
export type ComponentBuildArgs<Route extends string, Options extends string[]>
  = string extends Route
    ? Options
    : [RouteVariables<Route>] extends [never]
        ? Options
        : [params: RouteVariablesObject<Route>, ...args: Options];

/**
 * Function received by component builders to produce the final custom ID.
 */
export type IdInitialiseFunction = () => string;
