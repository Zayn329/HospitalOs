Feature: Appointment Management

  As a patient or receptionist
  I want to manage appointments
  So that consultations are scheduled efficiently.

  Scenario: Book an appointment
    Given a doctor has an available time slot
    When an appointment is requested
    Then the appointment should be confirmed
    And the doctor's schedule should be updated

  Scenario: Reschedule an appointment
    Given an existing appointment
    When another available slot is selected
    Then the appointment should be moved
    And both schedules should reflect the change

  Scenario: Cancel an appointment
    Given a confirmed appointment
    When the appointment is cancelled
    Then the time slot should become available
    And all affected parties should be notified
