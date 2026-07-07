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
