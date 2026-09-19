# UI Programming Standards

## Purpose
Use this guide before making any UI changes. It defines practical UX and implementation standards so interfaces remain clean, consistent, and predictable across sessions and contributors.

## Core Principles
1. One clear action per context.
2. Do not duplicate actions in the same visual area.
3. Preserve established patterns unless there is a strong product reason to change.
4. Prefer progressive enhancement and graceful fallback.
5. Keep interaction states obvious: loading, success, error, disabled.

## Navigation And Action Rules
1. Avoid redundant controls.
   - Example: if profile modal already contains sign-out, avoid extra adjacent auth buttons that conflict with state.
2. Keep primary actions visually distinct from secondary actions.
3. Keep action labels explicit and user-centered.
4. Do not hide critical actions behind unclear icons without tooltips.

## State And Persistence Rules
1. UI must reflect actual auth state and server authority.
2. If server data is unavailable, fallback to local cache without breaking user flow.
3. Persisted state updates should be optimistic only when rollback behavior is defined.
4. Never rely on client role labels alone for protected behavior.

## Accessibility And Responsiveness
1. Maintain readable contrast and minimum tap targets.
2. Ensure keyboard reachability for interactive controls.
3. Validate desktop and mobile layouts after each meaningful UI change.
4. Preserve focus behavior in modals and close actions.

## Visual Consistency
1. Reuse existing design tokens and component styles where possible.
2. Keep spacing and typography consistent with surrounding UI.
3. Use concise helper text and avoid clutter.
4. Avoid introducing competing call-to-actions in tight header space.

## Code Review Checklist For UI Changes
Before commit, verify:
1. No duplicated actions in same region.
2. Auth-related controls map to real auth state.
3. Empty/error/loading states are present.
4. Mobile behavior is verified.
5. Existing flows (sign-in, sign-out, navigation) still work.

## Agent Workflow Requirement
When a task modifies UI, agent should:
1. Read this document first.
2. Mention applied standards in change summary.
3. Include a quick validation note for desktop and mobile behavior.
