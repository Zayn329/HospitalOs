# architecture/api-contracts.md

# API Contract Standards

## Purpose

This document defines the standards that every API in HospitalOS must follow.

The objective is to ensure that every service exposes predictable, consistent, and versionable interfaces regardless of which developer or AI agent implements them.

API contracts define communication between systems. They do **not** define business logic.

---

# Architectural Principles

Every API should be:

* Consistent
* Predictable
* Versioned
* Secure
* Documented
* Backward compatible whenever possible

Breaking changes should be avoided.

---

# API Style

HospitalOS uses REST APIs as the primary communication mechanism.

Future GraphQL or gRPC services should still follow the same business rules and response conventions.

---

# URL Structure

```text
/api/v1/resource
```

Examples

```text
/api/v1/patients
/api/v1/appointments
/api/v1/consultations
/api/v1/prescriptions
```

Every endpoint belongs to exactly one business domain.

---

# HTTP Methods

GET

Retrieve resources.

Must never modify data.

---

POST

Create new resources.

Should return the newly created resource whenever appropriate.

---

PUT

Replace an existing resource.

Should replace the entire representation.

---

PATCH

Modify part of a resource.

Should only update supplied fields.

---

DELETE

Remove a resource.

Soft deletion is preferred for critical healthcare records.

---

# Standard Success Response

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully."
}
```

---

# Standard Error Response

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource could not be found."
  }
}
```

---

# Validation Rules

Every endpoint must validate:

* Authentication
* Authorization
* Required fields
* Input types
* Business rules
* Output structure

Invalid requests must never reach business logic.

---

# API Versioning

Every endpoint must include a version.

Current format:

```text
/api/v1/
```

Future versions should coexist rather than replacing existing APIs immediately.

---

# Error Handling

Errors should be meaningful.

Never expose:

* Stack traces
* Database internals
* Sensitive information
* Internal implementation details

Clients should always receive structured, actionable error messages.

---

# Pagination

Endpoints returning collections should support pagination.

Recommended parameters:

* page
* limit
* sort
* filter
* search

Large datasets should never be returned without pagination.

---

# Filtering

Filtering should be supported where appropriate.

Examples:

* Appointment status
* Doctor
* Department
* Date range

Filtering syntax should remain consistent across the platform.

---

# Idempotency

Operations that may be retried should be idempotent whenever practical.

Repeated identical requests should not unintentionally create duplicate records.

---

# Documentation

Every endpoint should include:

* Purpose
* Required permissions
* Request schema
* Response schema
* Possible error responses
* Example requests
* Example responses

The API documentation must always match the implementation.
