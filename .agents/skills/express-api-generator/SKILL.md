---
name: express-api-generator
description: |
  Use this skill when the user asks to create, modify, secure, or extend Node.js Express.js API endpoints, middleware, routers, or request/response handling structures.
  Do NOT use for FastAPI services, frontend components, or python-based agents.
version: 1.0.0
---

# Express API Generator

## When to Use
Use this skill when adding or updating REST API endpoints in the Express.js backend. This includes configuring routers, writing authentication middlewares, defining request validation rules, and structuring JSON responses.

## Core Workflow
1. **Define Schema Validation:** Declare a schema (e.g. using Zod or Joi) representing the expected format of `req.body`, `req.query`, and `req.params`.
2. **Implement Route Handler / Controller:** Write the controller function containing the business logic and returning a standard JSON response.
3. **Register Route with Middleware:** Bind the route path to the controller, applying auth checks and validation middlewares in the request pipeline.
4. **Implement Global Error Handling:** Ensure the router delegates caught errors to Express's global error handler using `next(err)`.
5. **Verify with Tests:** Write API integration tests (using Supertest) to assert valid/invalid payload handling.

## Guidelines & Rationale
* **Always Validate Request Payloads Early:** Fail-fast before processing downstream business logic. This protects database query safety and stops unhandled exceptions.
* **Delegate Errors to centralized Middleware:** Call `next(error)` in catch blocks instead of custom local error response objects. Standardizing errors ensures clients receive uniform error schemas (e.g., RFC-7807).
* **Return Predictable HTTP Status Codes:** Use specific codes (e.g., `201 Created`, `400 Bad Request`, `409 Conflict`) rather than generic `200 OK` or `500 Internal Server Error`.

## Few-Shot Example
*Input:* "Create a POST endpoint /patients to register a patient, checking their name and age using Express."
*Output:*
```javascript
const express = require('express');
const router = express.Router();
const { z } = require('zod');

// Schema Definition
const patientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.number().int().min(0, "Age must be a positive integer")
});

// Validation Middleware
const validatePatient = (req, res, next) => {
  const result = patientSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors });
  }
  next();
};

// Route Controller
router.post('/patients', validatePatient, async (req, res, next) => {
  try {
    const { name, age } = req.body;
    // Assume Patient is a database model
    const newPatient = await Patient.create({ name, age });
    return res.status(201).json(newPatient);
  } catch (error) {
    next(error); // Forward to global error handler
  }
});

module.exports = router;
```

## Constraints & Anti-Patterns
* Do NOT read raw inputs (`req.body`) without running schema validation.
* Do NOT use inline database queries; keep DB access inside modular models/services.
* Do NOT write catch blocks that swallow errors or fail to call `next(error)`.

## Evaluation Cases
```json
[
  {
    "id": "express-route-definition",
    "input": "Add a new DELETE /appointments/:id route with validation.",
    "expected_tools": ["write_to_file"],
    "expected_output": "An Express router file mounting the DELETE route, calling next(err) in catch block, and validating the uuid param."
  },
  {
    "id": "express-auth-middleware",
    "input": "Write an admin authentication middleware checking user roles.",
    "expected_tools": ["write_to_file"],
    "expected_output": "A middleware function returning 403 if req.user is not admin, or calling next() otherwise."
  },
  {
    "id": "express-invalid-catch-block",
    "input": "Fix code where controller catch-block returns res.send('error') directly.",
    "expected_tools": ["replace_file_content"],
    "expected_output": "Refactored catch block forwarding error to next(error) for uniform error processing."
  }
]
```
