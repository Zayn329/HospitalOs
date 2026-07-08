# BDD Review Agent Harness

Review the supplied BDD specification before any implementation begins.

The objective is to improve the specification, not implement it.

Treat this review as a requirements review performed by a senior software architect and AI engineer.

Evaluate the specification across the following dimensions.

--------------------------------------------------

1. Completeness

Determine whether the feature completely describes the expected business behaviour.

Identify:
- missing scenarios
- missing user journeys
- missing business rules
- missing acceptance criteria

Suggest additional BDD scenarios whenever required.

--------------------------------------------------

2. Edge Cases

Identify situations that could break the feature.

Examples include:
- duplicate records
- concurrent operations
- invalid transitions
- missing permissions
- conflicting updates
- unavailable resources

Every important edge case should become a new BDD scenario.

--------------------------------------------------

3. AI Opportunity Review

Determine whether this feature genuinely benefits from AI.

Do NOT recommend AI unless reasoning creates measurable value.

Good AI tasks include:
- semantic matching
- summarisation
- recommendations
- prioritisation
- retrieval
- intelligent explanations
- anomaly detection

Poor AI tasks include:
- CRUD
- validation
- authentication
- authorization
- calculations
- deterministic business rules

If AI is recommended, explain:
- why AI is valuable
- which runtime agent should own the task
- whether LangGraph is required
- whether MCP would improve the workflow

--------------------------------------------------

4. Business Logic Review

Identify business rules that are currently implied but not written.

Example:
Current BDD: Doctor has an available slot.
Missing rule: Doctor cannot be double booked.

Convert every missing rule into a BDD scenario.

--------------------------------------------------

5. Failure Scenarios

Ensure the specification describes failure behaviour.

Examples:
- invalid data
- duplicate requests
- scheduling conflicts
- unavailable resources
- authorization failures
- AI service unavailable
- MCP unavailable

Every important failure should have a corresponding Given / When / Then scenario.

--------------------------------------------------

6. Human-in-the-Loop Review

Determine whether the feature requires human approval.

Examples:
- Patient merge
- Prescription approval
- Diagnosis
- Billing override

If human approval is required, propose a corresponding BDD scenario.

--------------------------------------------------

7. Implementation Review

Review IMPLEMENTATION_MAP.md.

Verify that the proposed implementation category is appropriate:
- Standard CRUD
- AI Assisted
- Intelligent Workflow

If a different category would produce a better implementation, explain why.

--------------------------------------------------

8. Complexity Review

Determine whether the feature is attempting to solve multiple unrelated problems.

If so:
Recommend splitting it into multiple BDD files.
Every BDD should describe one business capability.

--------------------------------------------------

9. Output

Return the review using this structure.

```markdown
## Missing Business Rules

...

## Missing BDD Scenarios

...

## AI Opportunities

...

## Suggested Runtime Agent

...

## LangGraph Required?

Yes / No

Reason

...

## MCP Opportunities

...

## Updated BDD

...

## Implementation Category

...

## Confidence

High / Medium / Low
```

Do not implement the feature.
Only review and improve the specification.
