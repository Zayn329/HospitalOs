---
name: managing-databases
description: Use this skill when the user asks to modify MongoDB schemas, write aggregation pipelines, design indexes, or perform database migrations. It ensures secure, optimized data layouts and operations. Do NOT use this skill for simple CRUD operations, writing React frontend queries, or setting up SQL databases.
version: 1.0.0
license: MIT
---

# Managing Databases

## When to Use
Use this skill when planning or implementing changes to MongoDB schemas, writing aggregation pipelines, setting up indexes, or generating data migration scripts. This helps keep database transactions efficient and schemas clean.

## Core Workflow
1. **Analyze Schema Needs:** Review the fields, types, indexes, and validation rules required.
2. **Optimize Aggregations:** Construct stages (e.g., `$match`, `$group`, `$project`) to minimize memory usage on the database.
3. **Plan Indexes:** Create compound or single-field indexes to optimize search queries.
4. **Write Migration Plan:** Include both update and rollback logic in migration scripts.
5. **Verify Security:** Ensure schema fields containing sensitive data have appropriate validators or security guards.

## Guidelines & Rationale
* **Avoid Collection Scans:** Always ensure that queries filtering on multiple fields are backed by compound indexes to prevent high CPU loads on the database.
* **Always Project Data:** Use `$project` or projection fields in MongoDB queries to retrieve only the fields required, reducing network transfer overhead.
* **Isolate Migration Logic:** Write migrations in standalone scripts to avoid cluttering core server routing code.

## Few-Shot Example
*Input:* "Index patient records by department and admission date."
*Output:*
```javascript
// Index creation script
db.patients.createIndex(
  { department: 1, admissionDate: -1 },
  { name: "idx_department_admissionDate" }
);
```

## Constraints & Anti-Patterns
* Do NOT use wildcard indexes unless explicitly requested, as they can cause significant performance degradation.
* Do NOT store unencrypted passwords or sensitive API keys in the schema definition.
