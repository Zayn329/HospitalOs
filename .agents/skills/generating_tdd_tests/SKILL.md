---
name: generating-tdd-tests
description: Use this skill when the user asks to write tests first, generate unit tests (Pytest or Jest) before coding, or setup TDD test specifications. It establishes test constraints to guide code implementation. Do NOT use for manual QA testing, writing backend implementation code, or writing system documentation.
version: 1.0.0
license: MIT
---

# Generating TDD Tests

## When to Use
Use this skill when writing tests under Test-Driven Development guidelines. Generating tests before writing core logic establishes functional boundaries and guarantees code correctness.

## Core Workflow
1. **Identify Unit Target:** Define the function parameters, expected return values, and mock components.
2. **Draft Happy Path Cases:** Write tests for typical valid inputs.
3. **Draft Boundary Cases:** Write tests for empty inputs, negative numbers, or overflow limits.
4. **Draft Error Handling Cases:** Verify that the function throws correct exceptions under unexpected states.
5. **Export Tests:** Write Jest or Pytest configurations.

## Guidelines & Rationale
* **Keep Tests Isolated:** Mock external database queries or remote network calls to keep test suite execution fast.
* **Assert Exact Behaviors:** Use precise assertions (e.g., `.toThrowError`) rather than general try/catch blocks.
* **Avoid Implementing Logic:** Write only the tests to define success criteria, leaving function details to be implemented later.

## Few-Shot Example
*Input:* "Write a TDD test for standard interest rate calculator."
*Output:*
```typescript
import { calculateInterest } from "./calculator";

describe("calculateInterest", () => {
  it("calculates 10% interest for standard user", () => {
    expect(calculateInterest(100, 0.1)).toBe(10);
  });
  it("throws error for negative principal values", () => {
    expect(() => calculateInterest(-100, 0.1)).toThrow();
  });
});
```

## Constraints & Anti-Patterns
* Do NOT write implementation code in the test file.
* Do NOT run tests that depend on a live database or active network socket connection.
