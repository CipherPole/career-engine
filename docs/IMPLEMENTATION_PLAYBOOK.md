# Implementation Playbook

## Purpose
This document captures the implementation patterns that worked in Career Engine, how to structure stronger requests for future agent sessions, and how to rate prompt quality so the project keeps improving instead of repeating the same discovery work.

## Antigravity-First Workflow
Use Antigravity as the primary structured implementation workspace when you want tighter execution and less guessing.

1. Start with a concrete anchor.
State the file, endpoint, page, symbol, or failing behavior first.

2. State the source of truth.
Call out whether browser state, server session, database state, or Google identity is authoritative.

3. State the visible success condition.
Ask for the exact result you expect to see after the fix.

4. Ask for one narrow implementation slice.
Avoid combining data migration, UI redesign, and auth debugging in the same initial request unless they are truly inseparable.

5. Ask for validation.
Name the test, command, or user-visible behavior that proves the change worked.

## What Worked In This Project

### Auth and session hardening
- Persisting owner role on the server using the verified Google email instead of trusting the client.
- Hydrating the client session from `/api/me` so browser state follows the server cookie.
- Refreshing the auth pill and admin navigation immediately after login and session hydration.
- Logging `USER_CREATED`, `USER_SIGNIN`, and `USER_SIGNOUT` on the server instead of relying only on client telemetry.

### Delivery workflow
- Keeping changes small and validating after each auth slice.
- Running `npm test` after every meaningful session/auth change.
- Writing down successful implementation decisions in markdown so future sessions do not re-debug solved problems.

## Better Prompt Structure

### Weaker prompt
Make admin sign-in work better and show the right user.

### Stronger prompt
Fix the auth flow so `jerexson3@gmail.com` is always persisted as `admin` on the server, the secure session is hydrated on app load, and the top-right pill updates immediately after successful sign-in. Validate by confirming the UI shows my Google name, `Admin` role, and the Settings nav without manual refresh.

### Why the stronger version works better
- It names the owner email.
- It identifies server persistence and client hydration separately.
- It defines the exact visible outcome.
- It reduces guesswork about what "better" means.

## Implementation Rating Rubric
Score each category from 1 to 5.

1. Goal clarity
Did the request define the exact outcome?

2. Code anchor
Did the request name the page, file, endpoint, or broken behavior?

3. Constraints
Did the request state security, UX, stack, or deployment constraints?

4. Acceptance criteria
Did the request define what success looks like?

5. Authority model
Did the request say what system is source of truth?

6. Iteration control
Did the request ask for one focused slice instead of a vague multi-system change?

## Prompt Caching Guidance
Prompt caching here means preserving prompts that produced good implementation outcomes, not guessing from memory next time.

Keep a reusable template library for:
- auth fixes
- UI state sync fixes
- data migration requests
- production verification checklists
- admin tooling requests

When a prompt works well, save:
- the original request
- the improved request
- the files touched
- the validation command
- the visible outcome

## Recommended Request Template
Use this when you want stronger implementation success in future sessions.

Implement this in [page/file/endpoint].
Goal: [exact user-visible outcome].
Authority: [server, DB, client cache, Google identity, etc.].
Constraints: [security, UI, deployment, no schema changes, etc.].
Acceptance: [exact validation behavior or command].
If you need to expand scope, explain why before widening beyond the initial slice.
