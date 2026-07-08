Feature: Patient Check-In

  As a receptionist
  I want to check patients in upon arrival
  So that the consultation workflow can begin.

  Scenario: Successful check-in
    Given the patient has a valid appointment
    When the patient checks in on the correct date
    Then the appointment status should become "checked_in"
    And a consultation record with status "open" should be created
    And the doctor should be notified

  Scenario: Walk-in patient
    Given the patient does not have an appointment
    And the patient is registered in the system
    When the receptionist creates a walk-in consultation for a doctor
    Then a consultation record with status "open" should be created
    And the patient should join the waiting queue

  Scenario: Patient arrives late
    Given the appointment start time has passed
    When the patient checks in late
    Then the system should inform the receptionist
    And query the AI Reception Agent for late arrival options
    And display the recommended rescheduling or queueing options

  Scenario: Prevent double check-in
    Given the appointment status is already "checked_in"
    When the patient attempts to check in again
    Then the check-in should be rejected
    And the system should indicate the patient is already checked in

  Scenario: Prevent check-in on incorrect date
    Given the appointment is scheduled for a future date
    When the receptionist attempts to check in the patient
    Then the check-in should be rejected
    And the system should indicate the date is invalid for check-in
