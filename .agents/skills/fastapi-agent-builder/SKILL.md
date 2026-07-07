---
name: fastapi-agent-builder
description: |
  Use this skill when the user asks to build, modify, debug, or optimize FastAPI backend services, routers, Pydantic models, or agent services in Python.
  Do NOT use for Node.js Express.js APIs or React frontend components.
version: 1.0.0
---

# FastAPI Agent Builder

## When to Use
Use this skill when developing FastAPI services, Pydantic data schemas, dependency injectors, or Python-based agent microservices. This includes writing FastAPI routes, setting up dependency overrides, and defining input/output models.

## Core Workflow
1. **Define Pydantic Schemas:** Set up Pydantic schemas inheriting from `BaseModel` for both request payloads and response bodies.
2. **Configure Router endpoints:** Declare an instance of `APIRouter` and bind HTTP method routes.
3. **Declare Dependencies:** Use FastAPI `Depends` to inject database connections, authentication details, or agent instances.
4. **Implement Service Logic:** Add the route execution handler with strict python type hints.
5. **Write Pytest Tests:** Use FastAPI `TestClient` to mock dependencies and verify routing behaviors.

## Guidelines & Rationale
* **Always Annotate Router Parameters:** FastAPI uses standard Python type hints to generate OpenAPI documentation and run runtime type verification. Incorrect/missing annotations cause compilation errors or payload interpretation bugs.
* **Leverage Dependency Injection (`Depends`):** Declaring dependencies inside endpoints allows writing tests with mocks by overriding `app.dependency_overrides`. Avoid connecting to real databases globally.
* **Return Typed Models with `response_model`:** Restrict the response fields returned to clients, preventing accidental leaks of private internal database keys (e.g., password hashes).

## Few-Shot Example
*Input:* "Create a FastAPI router to fetch diagnostic results with authorization and Pydantic validation."
*Output:*
```python
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/diagnostics", tags=["diagnostics"])

# Schemas
class DiagnosticResponse(BaseModel):
    id: int
    test_name: str
    result: str
    is_abnormal: bool

    class Config:
        orm_mode = True

# Dependency logic
def get_db_session():
    # Database generator yielding sessions
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/{patient_id}", response_model=List[DiagnosticResponse])
def get_diagnostics(patient_id: int, db=Depends(get_db_session)):
    results = db.query(DiagnosticRecord).filter(DiagnosticRecord.patient_id == patient_id).all()
    if not results:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No diagnostic reports found for this patient"
        )
    return results
```

## Constraints & Anti-Patterns
* Do NOT import database connections globally; always use FastAPI `Depends`.
* Do NOT return unmapped SQL models directly to the client without defining a matching `response_model` schema.
* Do NOT catch errors silently without throwing `HTTPException` where appropriate.

## Evaluation Cases
```json
[
  {
    "id": "fastapi-endpoint-definition",
    "input": "Add a new endpoint to FastAPI router to submit triage priority.",
    "expected_tools": ["write_to_file"],
    "expected_output": "A route with proper Pydantic payload type hints, validation annotations, and response models."
  },
  {
    "id": "fastapi-pydantic-validation",
    "input": "Define Pydantic schema for patient checkin status matching checked-in details.",
    "expected_tools": ["write_to_file"],
    "expected_output": "A clean Pydantic model with fields like name, appointment_time, and status constraints."
  },
  {
    "id": "fastapi-global-connection-fix",
    "input": "Refactor router that calls database connection directly without Depends.",
    "expected_tools": ["replace_file_content"],
    "expected_output": "Refactored route using `db = Depends(get_db)` to support unit test mock injections."
  }
]
```
