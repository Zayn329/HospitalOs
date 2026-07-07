# architecture/permissions.md

# Authorization and Permissions

## Purpose

Authorization determines **what an authenticated user is allowed to do**.

Authentication answers **who** the user is.

Authorization answers **what** the user can access.

HospitalOS follows a Role-Based Access Control (RBAC) model.

---

# Core Principles

* Least privilege by default.
* Every action requires explicit permission.
* Permissions are enforced on the server.
* Client-side restrictions improve usability but never replace backend authorization.
* Access decisions must be auditable.

---

# System Roles

## Patient

Typical capabilities:

* View personal medical records
* Book appointments
* View prescriptions
* Download reports
* Manage personal profile

Patients must never access another patient's information.

---

## Receptionist

Typical capabilities:

* Register patients
* Manage appointments
* Check patients in
* View scheduling information

Receptionists should not access sensitive clinical information beyond what is necessary.

---

## Doctor

Typical capabilities:

* View assigned patients
* Create consultations
* View laboratory reports
* Create prescriptions
* Request diagnostic investigations
* Discharge patients

Doctors should only access patients under their care unless organizational policy permits otherwise.

---

## Laboratory Staff

Typical capabilities:

* View diagnostic requests
* Upload laboratory results
* Update laboratory workflow

They should not modify consultations or prescriptions.

---

## Pharmacist

Typical capabilities:

* View prescriptions
* Dispense medications
* Update dispensing status

Pharmacists should not alter clinical diagnoses.

---

## Billing Staff

Typical capabilities:

* Generate invoices
* Process payments
* Manage insurance claims

Billing personnel should not modify clinical records.

---

## Administrator

Typical capabilities:

* Manage users
* Configure departments
* Access operational dashboards
* Review audit logs

Administrative access should not automatically grant unrestricted access to clinical information.

---

## System Administrator

Responsible for:

* Platform configuration
* Infrastructure management
* Security settings
* System maintenance

Operational privileges should remain separate from clinical responsibilities whenever possible.

---

# Permission Categories

Permissions generally fall into four groups:

* View
* Create
* Update
* Delete

Every protected resource should define which roles are permitted for each operation.

---

# Permission Evaluation

Every protected request should verify:

1. Is the user authenticated?
2. Does the requested resource exist?
3. Does the user's role allow the requested action?
4. Are there additional business constraints?
5. Should this action be recorded in the audit log?

Only after all checks pass should the operation proceed.

---

# Sensitive Operations

Certain operations require additional safeguards, including:

* Deleting records
* Viewing highly sensitive patient information
* Modifying user roles
* Exporting large datasets
* Administrative configuration changes

These operations may require additional approval or stronger authentication.

---

# Future Scalability

The authorization model should support:

* Multi-hospital deployments
* Department-level permissions
* Temporary delegated access
* Emergency ("break-glass") access with mandatory auditing
* Custom organizational roles

The permission system should evolve without requiring changes to business workflows.
