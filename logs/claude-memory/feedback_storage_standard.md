---
name: easystress-is-reference
description: "EasyStress is the stable reference project, Maixiang is derived from it"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: bb6b28f4-936a-4b86-9f9d-da5519c0f7e5
---

**Rule:** EasyStress (D:\EasyStress) is the stable, working reference project. Maixiang (D:\Maixiang) is derived from it. When investigating storage/memory patterns, use EasyStress as the authoritative source. Do NOT criticize or suggest changes to EasyStress — it is the standard.

**Why:** User explicitly stated EasyStress is the standard working project. I previously made unsolicited changes to Maixiang's storage layer that may have broken things, and then compounded the error by claiming EasyStress had "worse problems" when it was the reference implementation all along.

**How to apply:** When comparing the two projects, treat EasyStress as correct and Maixiang as the copy that may have diverged (for better or worse). Always verify against EasyStress patterns before making changes to either project. Ask before modifying storage code — the user has strong opinions about this layer.
