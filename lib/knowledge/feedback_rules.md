---
name: Feedback rules
description: How this user wants collaboration to work — corrections and confirmed approaches
type: feedback
originSessionId: 8d8bcbc1-572d-4c9f-b8bd-4a9ae7f56916
---
**No trailing summaries.** Don't recap what was just done at the end of a response.
**Why:** User can read the diff/code directly. Summaries are noise.
**How to apply:** End responses with the key change in one sentence max, or nothing.

**Throwaway code goes in temp.js, never in main files.**
**Why:** User explicitly said "I do not want to pollute my code." Design experiments, prototypes, and test UIs belong in temp.js as a self-contained IIFE.
**How to apply:** Any exploratory or throwaway UI → temp.js only.

**Always read files before editing.**
**Why:** User rejected a plan execution that skipped reading. Made assumptions that didn't match actual code.
**How to apply:** Read the exact target lines before any Edit call, even for small changes.

**Don't dismiss user's design ideas without full understanding.**
**Why:** Early in role card discussion, assistant said "Auto mode isn't worth having." User pushed back — Auto mode in this context means showing computed read-only values, which is valuable. User was right.
**How to apply:** When a feature seems redundant, ask what problem it solves before dismissing it.

**Plan mode before large refactors.**
**Why:** User works with plan mode deliberately — wants to review approach before any code is written.
**How to apply:** For any change touching more than 2 files or restructuring architecture, enter plan mode first.
