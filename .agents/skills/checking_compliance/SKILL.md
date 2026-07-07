---
name: checking-compliance
description: Use this skill when the user asks to verify compliance, scan log statements for unmasked PII (such as phone numbers, emails, addresses), or configure automated compliance checks for a GitHub Action environment. Do NOT use for general code readability reviews, unit test design, or functional frontend styling.
version: 1.0.0
license: MIT
---

# Checking Compliance

## When to Use
Use this skill to scan source files, logger configs, or commit logs to catch compliance drift and leakage of Personally Identifiable Information (PII) like cleartext emails, passwords, phones, SSNs, or tokens. This is especially useful when integrating checks with GitHub Actions.

## Core Workflow
1. **Analyze Logging Patterns:** Scan for standard log invocations (e.g., `logger.info`, `console.log`).
2. **Run Pattern Matchers:** Use regex checks to detect typical PII structures (emails, credit cards, credentials) inside the log parameter scopes.
3. **Inspect Middleware Configs:** Check if logging middlewares contain filtering or masking mechanisms (e.g. removing 'password' keys before logging).
4. **Define Masking Targets:** Map fields that must always be masked or hashed before storage/logging.
5. **Output Compliance Verdict:** Alert developers to any violations and provide instructions for secure masking.

## Guidelines & Rationale
* **Mask PII at Source:** Always recommend masking variables before they reach log statements rather than relying solely on post-hoc logger filtering to ensure absolute data privacy.
* **Isolate Sensitive Fields:** Identify keys like `ssn`, `creditCard`, `password`, `token` as high-risk compliance parameters.
* **Integrate with CI:** Structure compliance rules so they can easily be run as script checks in GitHub workflows.

## Few-Shot Example
*Input:* "Scan this block: console.log('Saving patient details: ' + patient.email);"
*Output:*
* Compliance Check Alert:
  - **Violation:** PII Leakage (`patient.email`) detected in log statement.
  - **Severity:** HIGH
  - **Recommended Fix:** Mask the email before logging, or remove it entirely.
  ```javascript
  console.log('Saving patient details: ' + maskEmail(patient.email));
  ```

## Constraints & Anti-Patterns
* Do NOT log cleartext PII under any debug level (including verbose or silly modes).
* Do NOT ignore mock variables in test files if they replicate real production PII formats.
