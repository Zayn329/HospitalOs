Feature: Patient Triage

  As a hospital
  I want patients prioritized according to urgency
  So that critical patients receive immediate attention.

  Scenario: Emergency symptoms detected
    Given a patient reports severe emergency symptoms
    When the symptoms are evaluated
    Then the patient should be assigned the highest priority
    And the appropriate medical staff should be alerted immediately

  Scenario: Routine symptoms
    Given a patient reports non-urgent symptoms
    When the symptoms are evaluated
    Then the patient should enter the standard consultation queue

  Scenario: Insufficient information
    Given symptom information is incomplete
    When triage begins
    Then additional information should be requested
    Before assigning a priority level
