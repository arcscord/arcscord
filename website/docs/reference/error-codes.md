# Arcscord error codes

`ArcscordError.code` is a stable public identifier. Adding a code is backward-compatible; removing or renaming one is a breaking change.

| Code | Meaning | Important metadata |
|---|---|---|
| `CLIENT_READY_TIMEOUT` | Client readiness timed out | `timeoutMs` |
| `APPLICATION_UNAVAILABLE` | Discord application data was unavailable | `operation` |
| `COMMAND_VALIDATION_FAILED` | A command definition is invalid | `rule`, `path`, `commandName`, `group` |
| `COMMAND_REGISTRATION_FAILED` | Discord command synchronization failed | `scope`, `guildId`, `operation` |
| `COMMAND_RESOLUTION_FAILED` | An interaction could not be resolved to a command surface | `commandName`, `reason` |
| `COMPONENT_VALIDATION_FAILED` | A component definition is invalid | `rule`, `route` |
| `COMPONENT_ROUTE_INVALID` | A component route is malformed | `route`, `reason` |
| `COMPONENT_ROUTE_DUPLICATE` | Two components use the same canonical route | `route`, `canonicalRoute` |
| `COMPONENT_CUSTOM_ID_TOO_LONG` | A generated custom ID exceeds Discord's limit | `route`, `length`, `maximum` |
| `EVENT_HANDLER_DUPLICATE` | Two event handlers use the same name | `handlerName`, `eventName` |
| `EVENT_INTENT_MISSING` | Required gateway intents are missing | `missingIntents`, `presentIntents` |
| `INTERACTION_OPERATION_FAILED` | Reply, edit, defer, modal, or autocomplete response failed | `operation` |
| `COMMAND_NOT_FOUND` | No loaded command matched an interaction | dispatch context |
| `COMMAND_OPTION_PARSING_FAILED` | Slash-command option parsing failed | parsing context |
| `COMMAND_CONTEXT_CREATION_FAILED` | The interaction did not match the command surface | dispatch context |
| `COMMAND_DEFER_FAILED` | Command pre-reply failed | dispatch context |
| `COMPONENT_NOT_FOUND` | No component route matched | route context |
| `COMPONENT_MULTIPLE_MATCHES` | Multiple component routes matched | route context |
| `COMPONENT_CONTEXT_CREATION_FAILED` | Component context or modal parsing failed | dispatch context |
| `COMPONENT_TYPED_SELECT_INVALID_VALUES` | Typed select values violated their declaration | selected/allowed values |
| `COMPONENT_DEFER_FAILED` | Component pre-reply failed | dispatch context |
| `AUTOCOMPLETE_EXECUTION_FAILED` | Autocomplete dispatch or response failed | command context |

All command-loading errors with `COMMAND_VALIDATION_FAILED` include `commandName` and `group`. For subcommands, `commandName` is the complete path, such as `admin.ban` or `admin.moderation.ban`. All component-loading validation errors identify the component through `route`, including `COMPONENT_VALIDATION_FAILED`, `COMPONENT_ROUTE_INVALID`, and `COMPONENT_ROUTE_DUPLICATE`.
