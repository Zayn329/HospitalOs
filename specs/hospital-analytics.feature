Feature: Hospital Analytics

  As a hospital administrator
  I want operational insights
  So that I can make informed management decisions.

  Scenario: View operational dashboard
    Given hospital data is available
    When the administrator opens the analytics dashboard
    Then key operational metrics should be displayed

  Scenario: Monitor patient flow
    Given patients are moving through hospital workflows
    When the administrator reviews patient flow
    Then bottlenecks should be identified

  Scenario: Generate performance report
    Given operational data exists
    When a report is requested
    Then a summary report should be generated
    Including appointments, consultations, billing, and patient statistics
