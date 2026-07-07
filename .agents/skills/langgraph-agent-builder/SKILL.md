---
name: langgraph-agent-builder
description: |
  Use this skill when the user asks to build, modify, structure, or configure LangGraph-based AI agents, state graphs, nodes, edges, or multi-agent systems.
  Do NOT use for general Express.js/FastAPI routes or simple frontend UI styling.
version: 1.0.0
---

# LangGraph Agent Builder

## When to Use
Use this skill when defining state machines, agent routers, memory layers, and multi-agent coordination flows using LangGraph. This handles setting up states, custom node handlers, edge conditions, and compiling execution paths.

## Core Workflow
1. **Define the State Class:** Formulate a typed state structure (e.g., using Python TypedDict or Pydantic) to store context across agent steps.
2. **Build State Nodes:** Write pure functions representing individual actions, API calls, or LLM evaluation steps that modify the state.
3. **Establish Edges:** Add standard transitions (node A to node B) or conditional routers (deciding the next node based on state values).
4. **Compile the Graph:** Call the graph builder compile method to initialize the state machine with optional memory checkpointers.
5. **Implement Integration Tests:** Validate state transitions, infinite loop protections, and final outputs.

## Guidelines & Rationale
* **Typed States Prevent Runtime Access Violations:** Always define explicit type annotations for state dictionaries. Knowing exactly what keys are available prevents agent steps from modifying non-existent properties.
* **Nodes Must Return State Diffs:** Ensure nodes return a new dictionary subset containing only the changes. LangGraph automatically merges these updates, ensuring state predictability.
* **Explain Router Logic Clearly:** Always add comments explaining the conditions inside router functions. This prevents models from guessing branching logic when generating conditional paths.

## Few-Shot Example
*Input:* "Create a LangGraph agent that does validation, executes a tool, and returns results."
*Output:*
```python
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, END
import operator

# Define State
class AgentState(TypedDict):
    input: str
    output: str
    valid: bool
    steps: Annotated[list, operator.add]

# Define Nodes
def validate_input(state: AgentState):
    is_valid = len(state["input"]) > 0
    return {"valid": is_valid, "steps": ["validate_input"]}

def run_agent(state: AgentState):
    if not state["valid"]:
        return {"output": "Invalid Input", "steps": ["run_agent"]}
    return {"output": f"Processed: {state['input']}", "steps": ["run_agent"]}

# Build Graph
workflow = StateGraph(AgentState)
workflow.add_node("validate", validate_input)
workflow.add_node("agent", run_agent)

workflow.set_entry_point("validate")

# Define Conditional Routing
def route_after_validation(state: AgentState):
    if state["valid"]:
        return "agent"
    return END

workflow.add_conditional_edges(
    "validate",
    route_after_validation,
    {
        "agent": "agent",
        END: END
    }
)
workflow.add_edge("agent", END)
app = workflow.compile()
```

## Constraints & Anti-Patterns
* Do NOT mutate the state directly within a node function (always return a state update dictionary).
* Do NOT leave conditional router paths without a default fallback target.
* Avoid nesting graphs too deeply without explicit state mapping functions.

## Evaluation Cases
```json
[
  {
    "id": "langgraph-state-creation",
    "input": "Define a LangGraph state graph with custom state properties mapping messages and user status.",
    "expected_tools": ["write_to_file"],
    "expected_output": "A script declaring a State class, nodes, edges, and a compiled graph object."
  },
  {
    "id": "langgraph-conditional-edges",
    "input": "Implement conditional routing from a triage node to either supervisor or responder.",
    "expected_tools": ["write_to_file"],
    "expected_output": "A routing function checking conditions and returning the next node name, registered via add_conditional_edges."
  },
  {
    "id": "langgraph-state-mutator-check",
    "input": "Check if this node function mutating state is correct: `def node(state): state['counter'] += 1`",
    "expected_tools": ["checking_code"],
    "expected_output": "Corrected node function returning `{'counter': state['counter'] + 1}` to match LangGraph functional update patterns."
  }
]
```
