---
name: checking-code
description: Use this skill when the user asks to perform an automated code check or review on a GitHub pull request or code diff for critical vulnerabilities, logic efficiency, edge cases, and readability. Do NOT use this skill for manual UI testing, writing original features, or reviewing non-code documents.
version: 1.0.0
license: MIT
---

# Checking Code

## When to Use
Use this skill when performing automated code check workflows on GitHub diffs, PR commits, or local file updates. It analyzes codebase patches to verify security, performance complexity, logic limits, and clean formatting.

## Core Workflow
1. **Fetch Diff/Changes:** Retrieve the list of file modifications, additions, and deletions.
2. **Scan for Vulnerabilities:** Verify variables and methods to prevent key issues such as injection, memory exhaustion, or security bypass.
3. **Analyze Logical Efficiency:** Identify redundant structures, deep loop nests, and suggest O(1) or O(N) patterns over quadratic O(N^2) paths.
4. **Identify Edge Cases:** Ensure proper validation for empty arrays, null parameters, zero boundaries, and timeout failures.
5. **Inspect Readability:** Review logic structures, variable labels, indentation, and docstring formatting to match clear codebase specifications.
6. **Generate Summary Report:** Detail findings by file, file range, and severity level.

## Guidelines & Rationale
* **Explain the Vulnerability:** Always state the threat vector when pointing out security vulnerabilities so engineers understand the context and urgency.
* **Suggest Exact Code Fixes:** Supply localized before/after snippets to speed up PR merge cycles.
* **Respect Existing Styles:** Match the project's styling directives (e.g. ESLint rules) to avoid suggesting conflicting modifications.

## Few-Shot Example
*Input:* "Verify this diff:
```diff
@@ -10,3 +10,4 @@
+function search(list, key) {
+  for (let i = 0; i < list.length; i++) {
+    if (list[i].name == key) return list[i];
+  }
+}
```
"
*Output:*
* Code Review Findings:
  1. Performance: The loop performs a linear search `O(N)`. If this is invoked frequently, recommend converting the list to a Map `O(1)` for faster key lookups.
  2. Edge Cases: Handles empty list correctly, but will throw an error if `list` is null or undefined. Suggest parameter validation: `if (!list) return null;`.

## Constraints & Anti-Patterns
* Do NOT run automated review on binary files or non-code documentation.
* Do NOT recommend changing framework choices (e.g. replacing React with Vue) during a minor PR code review.
