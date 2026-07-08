Feature: Patient Triage

  As a hospital receptionist or nurse
  I want patients prioritized according to symptom urgency
  So that critical patients receive immediate attention and jump the queue.

  Scenario: Emergency symptoms evaluated by AI
    Given a patient reports symptoms "severe crushing chest pain and shortness of breath"
    When the nurse evaluates the symptoms using the Triage Agent
    Then the AI should recommend priority "emergency"
    And explain the reasons
    And suggest additional questions

  Scenario: Triage confirmation and queue prioritization
    Given a patient has been assigned "emergency" priority
    When the nurse confirms the priority level
    Then the patient should be placed at the top of the waiting queue
    And a critical alert notification should be sent to the on-duty doctor

  Scenario: Non-urgent symptoms
    Given a patient reports symptoms "mild scratchy throat for two days"
    When the symptoms are evaluated
    Then the AI should recommend priority "routine"
    And the patient should enter the waiting queue behind higher priority patients

  Scenario: Insufficient symptom details
    Given symptom description is "patient feels sick"
    When the symptoms are evaluated
    Then the system should report insufficient details
    And list specific questions to ask (e.g., body temperature, duration)

  Scenario: Override suggested priority
    Given the Triage Agent recommends "urgent" priority
    When the nurse overrides the priority to "emergency"
    Then the patient should be queued with "emergency" priority
    And the override details and reason should be recorded in the audit log
