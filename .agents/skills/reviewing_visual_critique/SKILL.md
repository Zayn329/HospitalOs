---
name: reviewing-visual-critique
description: Use this skill when the user asks to review UI/UX designs, critique layout visuals, or inspect frontend aesthetics before finalizing code. This skill supports style analysis, consistency, accessibility, and visual polish checks. Do NOT use for backend code review, database schema validation, or compiling/building code.
version: 1.0.0
license: MIT
---

# Reviewing Visual Critique

## When to Use
Use this skill when checking frontend files or visual designs for layout, typography, sizing, accessibility, and contrast issues. This ensures the output matches professional, premium visual design principles.

## Core Workflow
1. **Load Code File:** Use view tools to read the targeted frontend file.
2. **Check Spacing and Alignment:** Look for inconsistent margins, padding, and alignment offsets.
3. **Verify Color Contrast & Themes:** Scan the markup for hardcoded light/dark colors that might violate high-contrast accessibility standards.
4. **Evaluate Mobile Responsiveness:** Verify that horizontal grid widths or flex bases adapt correctly to small screen bounds.
5. **Generate Critique Report:** Document visual design issues and supply actionable code suggestions.

## Guidelines & Rationale
* **Promote System Tokens:** Advise replacing hardcoded spacing values (e.g., `h-[23px]`) with design system tokens (e.g., `h-6`) to make elements layout-consistent.
* **Accessibility is Non-Negotiable:** Check interactive components for focus styles (`focus-visible:ring-2`) so keyboard users can navigate the application.
* **Keep Critiques Actionable:** Provide before/after code snippets to reduce visual ambiguity.

## Few-Shot Example
*Input:* "Critique this navbar element: <div class='flex bg-blue-500 h-[65px]'>Home</div>"
*Output:*
* Visual Review Findings:
  1. Spacing: The custom height `h-[65px]` is non-standard. Recommend using `h-16` (64px) to align with standard grid units.
  2. Color Contrast: `bg-blue-500` is hardcoded. Consider using `bg-primary` for theme compatibility.
  3. Interactive: Missing links or role accessibility tags.

## Constraints & Anti-Patterns
* Do NOT provide generic feedback like "make it look modern." Give specific structural and Tailwind property updates.
* Do NOT suggest functional state modifications unless they impact the layout.
