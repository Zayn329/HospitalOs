Feature: Patient Registration

  As a hospital receptionist
  I want to register new and returning patients
  So that they can receive medical care without duplicate records.

  Scenario: Register a new patient successfully
    Given a patient is not already registered
    When the receptionist enters the patient's required information
    Then a unique patient record should be created
    And the patient should receive a hospital ID

  Scenario: Prevent duplicate registration
    Given a patient already exists in the system
    When the receptionist attempts to register the same patient
    Then the system should suggest the existing record
    And prevent creating a duplicate patient profile

  Scenario: Required information is missing
    Given the registration form is incomplete
    When the receptionist submits the form
    Then the system should highlight the missing required fields
    And the registration should not be completed
Scenario: Detect a likely duplicate patient
  Given a patient with similar identifying information already exists
  When the receptionist registers another patient
  Then the system should identify potential duplicate records
  And display the matching reasons
  And require confirmation before creating a new patient record

Scenario: Detect duplicates despite formatting differences
  Given a patient named "Zain Pawle" already exists
  When the receptionist registers "zain pawle"
  Then the system should recognize the records as potential duplicates
  And suggest the existing patient profile

Scenario: Override duplicate warning
  Given a potential duplicate has been detected
  When the receptionist confirms the patient is different
  Then a new patient record should be created
  And the override should be recorded in the audit log