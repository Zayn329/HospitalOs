Feature: Medical Documentation

  As a doctor
  I want consultation notes to be documented accurately
  So that patient records remain complete and consistent.

  Scenario: Create consultation notes
    Given an active patient consultation
    When the doctor completes the consultation
    Then consultation notes should be saved
    And the patient's medical record should be updated

  Scenario: Update consultation notes
    Given existing consultation notes
    When the doctor edits the notes
    Then the latest version should be saved
    And the previous version should be retained in the audit history

  Scenario: Incomplete documentation
    Given mandatory clinical fields are missing
    When the doctor attempts to complete the consultation
    Then the system should identify the missing information
    And prevent completion until required fields are provided
