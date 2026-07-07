Feature: Patient Check-In

  As a receptionist
  I want to check patients in upon arrival
  So that the consultation workflow can begin.

  Scenario: Successful check-in
    Given the patient has a valid appointment
    When the patient arrives
    Then the appointment status should become "Checked In"
    And the doctor should be notified

  Scenario: Walk-in patient
    Given the patient does not have an appointment
    When the receptionist creates a walk-in consultation
    Then the patient should join the waiting queue

  Scenario: Patient arrives late
    Given the appointment has already started
    When the patient checks in
    Then the system should inform the receptionist
    And display the available options
