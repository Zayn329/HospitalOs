# architecture/database.md

# Database Architecture

## Purpose

The database stores the operational state of HospitalOS.

It acts as the single source of truth for business data while remaining independent of AI models and external integrations.

---

# Database Principles

The database should:

* Avoid duplicate information.
* Preserve historical records.
* Support auditing.
* Scale as patient data grows.
* Separate operational and analytical data where appropriate.

---

# Core Collections

## Patient Management

* Patients
* Emergency Contacts
* Medical History

---

## Clinical

* Consultations
* Clinical Notes
* Diagnoses
* Allergies
* Medications
* Prescriptions

---

## Operations

* Appointments
* Departments
* Rooms
* Queue

---

## Diagnostics

* Laboratory Reports
* Imaging Reports
* Diagnostic Orders

---

## Billing

* Bills
* Payments
* Insurance Claims

---

## Administration

* Users
* Roles
* Permissions
* Audit Logs
* Notifications

---

## Knowledge

* Hospital Policies
* Clinical Guidelines
* Internal Documents

---

# Data Ownership

Every collection has one owning service.

For example:

Patients → Patient Service

Appointments → Scheduling Service

Bills → Billing Service

Knowledge → Knowledge Service

Other services should interact through APIs rather than directly modifying another service's data.

---

# Common Metadata

Every document should include:

* Unique identifier
* Creation timestamp
* Last updated timestamp
* Created by
* Last modified by
* Status
* Soft delete flag (where applicable)

---

# Relationships

Relationships should favour references instead of embedding when:

* Records grow independently.
* Records are frequently updated.
* Multiple services consume the same data.

Embedding should only be used for small immutable data.

---

# Audit Strategy

Critical records must preserve history.

Examples include:

* Prescriptions
* Consultations
* Bills
* Insurance claims
* Patient demographics

Historical data should never be silently overwritten.

---

# Validation Rules

All data entering the database must be validated.

Validation occurs before persistence.

The database should never become responsible for business logic.

---

# Security

Sensitive medical information must be protected.

The architecture should support:

* Encryption at rest
* Encrypted communication
* Role-based access
* Fine-grained permissions
* Audit logging

No sensitive credentials should ever be stored in application code.

---

# Future Scalability

The schema should accommodate:

* Multi-hospital deployments
* Department isolation
* High patient volumes
* AI-generated metadata
* Analytics pipelines
* Data archival

Future schema changes should be introduced through versioned migrations rather than manual database modifications.
