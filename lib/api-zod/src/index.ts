// Only the Zod schemas (runtime values) are re-exported. `./generated/types`
// duplicates the request/response body NAMES as plain interfaces (CreateLeadBody,
// …), which collide with the same-named Zod consts here under `export *` (TS2308)
// — and every `@workspace/api-zod` consumer imports the Zod values, never those
// interfaces (model types are consumed from `@workspace/api-client-react`). So we
// don't re-export `./generated/types` to avoid the ambiguity.
export * from "./generated/api";
