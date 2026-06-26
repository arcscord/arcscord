/**
 * Controls automatic interaction deferral before a handler runs.
 *
 * `true` defers a public response. `"ephemeral"` defers a response visible only
 * to the user who triggered the interaction.
 */
export type PreReplyMode = boolean | "ephemeral";
