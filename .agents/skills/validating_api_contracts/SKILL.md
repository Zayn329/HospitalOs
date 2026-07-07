---
name: validating-api-contracts
description: Use this skill when the user asks to check API endpoints, validate requests/responses between React and Node/FastAPI, or check API contract alignments. It prevents integration failures by verifying payload type safety. Do NOT use for standard frontend component design or writing database schemas.
version: 1.0.0
license: MIT
---

# Validating API Contracts

## When to Use
Use this skill when checking integration points between the React frontend client and the Express or FastAPI backend servers. This prevents runtime crashes caused by mismatched route shapes or parameters.

## Core Workflow
1. **Locate Server Endpoint:** Find the routing file on the backend and note the required headers, query parameters, and JSON payload fields.
2. **Locate Client Call:** Find the Axios or Fetch call in the frontend codebase.
3. **Compare Payload Specs:** Align the client's payload structure with the backend schema (like Pydantic models or Joi validation schemas).
4. **Analyze Response Data:** Verify that the keys returned by the backend match what the frontend UI expects to render.
5. **Report Mismatches:** Highlight differences in typing, optional vs. required flags, and casing.

## Guidelines & Rationale
* **Ensure Type Alignment:** Use shared typescript interfaces or ensure strict manual mapping to prevent runtime exceptions.
* **Document Optional Fields:** Ensure keys that might be null or undefined are wrapped with optional chaining (`?.`) on the frontend to avoid UI crashes.
* **Track Endpoint Paths:** Double-check dynamic route parameters (e.g., `/user/:id` vs `/user/{id}`) to ensure routing formats match.

## Few-Shot Example
*Input:* "Check why patient creation crashes on the frontend."
*Output:*
* Contract Verification Analysis:
  - Frontend payload: sends `{ patient_name: string }`
  - Backend schema: expects `{ patientName: string }`
  - Cause: Mismatched parameter casing.
  - Recommended Fix: Align keys in the frontend Axios payload.

## Constraints & Anti-Patterns
* Do NOT assume a payload is correct without reviewing the backend controller schemas directly.
* Do NOT make live API calls inside the verification environment.
