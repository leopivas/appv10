---
name: Orval codegen quirk
description: orval 8.18 fails silently on certain path combinations in openapi.yaml; workarounds documented
---

## Rule
When adding new paths to `lib/api-spec/openapi.yaml`, avoid the `/landing` operationId (`getLanding`) — it causes orval to throw "Failed to resolve input" and wipes the generated output without a useful error message.

**Why:** Unknown orval 8.18 parsing quirk. The path name `/landing` in combination with other paths in the `tiktok` tag triggers the failure. Other paths work fine individually and in small groups.

**How to apply:**
- Use `PassthroughResponse` (`$ref: "#/components/schemas/PassthroughResponse"`) for new endpoint schemas when you just need the path documented — avoids needing custom schema definitions that might also trigger parse issues.
- Do not add a `/landing` path to the spec.
- Always test codegen incrementally if adding multiple new paths.
- The generated directories get wiped on each failed codegen run; restart the Vite workflow after a successful run to clear pre-transform errors.
