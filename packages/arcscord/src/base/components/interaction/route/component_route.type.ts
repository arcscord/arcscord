/**
 * Extracts dynamic segment names from a component route.
 */
export type RouteVariables<T extends string>
  = T extends `${infer Segment}/${infer Rest}`
    ? (Segment extends `{${infer Var}}` ? Var : never) | RouteVariables<Rest>
    : T extends `{${infer Var}}` ? Var
      : never;

/**
 * Object passed when building a component whose route contains dynamic segments.
 */
export type RouteVariablesObject<T extends string> = {
  [K in RouteVariables<T>]: string;
};

/** Parameters accepted by a compiled component route. */
export type ComponentRouteParams<Route extends string>
  = string extends Route ? Record<string, string> : RouteVariablesObject<Route>;

/** Builds a custom ID for a component route. */
export type ComponentRouteBuild<Route extends string>
  = string extends Route
    ? (params?: ComponentRouteParams<Route>) => string
    : [RouteVariables<Route>] extends [never]
        ? () => string
        : (params: ComponentRouteParams<Route>) => string;

/** Public codec for building and matching one component route. */
export type ComponentRoute<Route extends string> = {
  /** The original route pattern. */
  readonly pattern: Route;

  /** Builds a Discord custom ID from the route parameters. */
  readonly build: ComponentRouteBuild<Route>;

  /** Matches and decodes a Discord custom ID, or returns `null`. */
  match: (customId: string) => ComponentRouteParams<Route> | null;
};

/**
 * Arguments accepted by a component build function.
 *
 * Routes with dynamic segments require the route params first:
 * `button.build({ ticketId }, "Label")`.
 *
 * Static routes keep the regular typed arguments:
 * `button.build("Label")`.
 *
 * `Options` is a tuple of build arguments. It is usually `string[]` (e.g. a
 * localized label), but modals also accept a single object argument for
 * readability, e.g. `modal.build({ title, nameLabel })`.
 */
export type ComponentBuildArgs<Route extends string, Options extends unknown[]>
  = string extends Route
    ? Options
    : [RouteVariables<Route>] extends [never]
        ? Options
        : [params: RouteVariablesObject<Route>, ...args: Options];

/**
 * Function received by component builders to produce the final custom ID.
 */
export type IdInitialiseFunction = () => string;
