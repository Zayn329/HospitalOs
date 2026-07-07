# Database Design

## Purpose

This folder defines the logical database design for HospitalOS.

The database acts as the single source of truth for all persistent application data while remaining independent of business logic, AI agents, and frontend implementation.

These documents are intended to guide both human developers and AI coding agents throughout development.

---

# Database Choice

HospitalOS uses **MongoDB** because it provides:

* Flexible document-based storage
* Rapid iteration during hackathons
* Easy schema evolution
* Native JSON compatibility
* Good support for hierarchical healthcare data

---

# Design Principles

The database follows these principles:

* One collection owns one business entity.
* Minimize duplicated information.
* Use references for relationships between entities.
* Keep business logic outside the database.
* Preserve historical information whenever practical.
* Support future expansion without breaking existing data.

---

# Collection Overview

Core collections include:

* Users
* Roles
* Patients
* Doctors
* Appointments
* Consultations
* Clinical Notes
* Lab Reports
* Prescriptions
* Medications
* Bills
* Notifications
* Audit Logs

---

# Relationship Overview

Patient

↓

Appointments

↓

Consultation

↓

Clinical Notes

↓

Prescription

↓

Billing

↓

Follow-up

Laboratory reports are attached to patients and referenced during consultations.

---

# Naming Conventions

Collections use PascalCase names.

Fields use camelCase.

Document IDs use MongoDB ObjectIds.

Status values use lowercase snake_case.

Example:

```text
checked_in

in_progress

completed

cancelled
```

---

# Metadata

Every collection should include:

* _id
* createdAt
* updatedAt
* createdBy
* updatedBy

Business entities should also contain a status field whenever applicable.

---

# Versioning

Database changes should be introduced through migrations whenever the schema changes.

This documentation should remain synchronized with future schema updates.
