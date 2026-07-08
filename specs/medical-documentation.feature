Feature: Medical Documentation

  As a doctor
  I want consultation notes to be documented accurately and version-controlled
  So that patient records remain complete, consistent, and audit-compliant.

  Scenario: Create consultation notes successfully
    Given an active patient consultation
    When the doctor completes the consultation with all required fields
    Then the consultation notes should be saved in SOAP format
    And the patient's medical record should be updated

  Scenario: Version-control notes edits
    Given an existing completed consultation with notes
    When the doctor edits the findings to "Updated findings: patient shows improvement"
    Then the latest version should be saved in the consultation record
    And the previous version should be archived in the audit log history
    And the change should be visible in the edit history

  Scenario: Prevent completion on missing mandatory fields
    Given the doctor is completing a consultation
    And the mandatory clinical field "diagnosis" is missing
    When the doctor attempts to complete the consultation
    Then the completion should be rejected
    And the system should identify "diagnosis" as missing
    And block saving until the field is provided

  Scenario: AI Scribe notes enhancement
    Given existing consultation notes
    When the doctor requests an AI enhancement of the updated notes
    Then the AI Scribe should suggest refined clinical wording
    And output the enhanced SOAP structure
