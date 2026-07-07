Feature: AI Clinical Assistance

  As a healthcare professional
  I want intelligent assistance during clinical workflows
  So that I can work more efficiently without replacing my medical judgement.

  Scenario: Request clinical assistance
    Given patient information is available
    When the healthcare professional requests assistance
    Then relevant insights should be presented
    And supporting patient information should be referenced

  Scenario: Summarize patient history
    Given multiple previous consultations exist
    When a summary is requested
    Then the patient's history should be summarized clearly

  Scenario: Insufficient clinical information
    Given required patient information is unavailable
    When assistance is requested
    Then the system should indicate that additional information is required
    And avoid generating unsupported conclusions
