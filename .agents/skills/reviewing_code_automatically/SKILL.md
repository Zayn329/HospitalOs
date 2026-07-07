---
name: reviewing-code-automatically
description: Use this skill when the user asks to review code diffs, check pull requests for bugs, inspect code quality, or scan for hardcoded secrets. It finds logical issues, security flaws, and syntax smells. Do NOT use for writing original features, implementing tests, or writing user documentation.
version: 1.0.0
license: MIT
---

# Reviewing Code Automatically

## When to Use
Use this skill to perform automated reviews of code changes, commits, or pull requests. It identifies logical bugs, hardcoded secrets, performance overheads, and maintainability concerns.

## Core Workflow
1. **Analyze Diff Scope:** Review the list of modified files and changed line ranges.
2. **Scan for Credentials:** Check for accidental inclusion of hardcoded API keys, JWT secrets, or cleartext passwords.
3. **Inspect Code Logic:** Find race conditions, unhandled exceptions, or loop memory issues.
4. **Validate Style & Imports:** Ensure changes respect clean code conventions and architectural rules.
5. **Output Feedback:** Provide clear, categorized feedback with specific code improvement suggestions.

## Guidelines & Rationale
* **Prioritize Security First:** Catch security issues (like hardcoded keys) before any functional or style critique is made.
* **Cite Rationale:** Explain why a code segment is problematic (e.g., "avoiding memory leaks") rather than just requesting a rewrite.
* **Be Specific:** Direct your feedback to exact line ranges for faster refactoring.

## Few-Shot Example
*Input:* "Review: const apiKey = '12345-secret';"
*Output:*
* Code Review Findings:
  1. Security: Hardcoded API key detected. Move this value to environmental variables (`process.env.API_KEY`).

## Constraints & Anti-Patterns
* Do NOT rewrite the entire codebase. Only critique the diff content.
* Do NOT flag minor styling choices that comply with standard ESLint configurations.
