Feature: MediKiosk AI Clinical Intake & History Engine

  As a patient visiting the hospital or health kiosk
  I want to provide my symptoms via voice or touch and upload past medical records
  So that a structured clinical history summary is pre-generated for my treating doctor.

  Scenario: Patient completes adaptive intake history using SOCRATES framework
    Given a patient initiates a MediKiosk session in "hi" language and "allopathy" mode
    When the patient gives explicit audio consent under DPDP Act 2023 guidelines
    And enters a chief complaint of "Severe chest pain radiating to left arm"
    Then the intake engine should return adaptive SOCRATES questions for site, onset, character, radiation, and severity
    And auto-flag a "CRITICAL: Potential Acute Coronary Syndrome" red alert to the triage queue.

  Scenario: Patient completes Ayurvedic intake using AYUSH Dashavidha Pariksha
    Given a patient initiates a MediKiosk session in "ayush" mode
    When the patient enters symptoms of "digestion issues and fatigue"
    Then the intake engine should present questions for Prakriti, Agni, Koshtha, and Ahara-Vihara
    And store the structured Ayurvedic intake details.

  Scenario: Patient uploads handwritten prescription for OCR digitization
    Given an active MediKiosk intake session
    When the patient uploads a scanned document "Old_Prescription.jpg" with handwritten Rx text
    Then the OCR engine extracts diagnosis "Type 2 Diabetes Mellitus" and medications "Metformin, Amlodipine"
    And flags elevated lab values such as "HbA1c 8.2%" as abnormal.

  Scenario: Doctor receives structured bilingual draft summary
    Given a completed MediKiosk intake session with chief complaint and scanned documents
    When the session summary is generated
    Then the doctor workspace receives a structured SOAP format draft (Chief Complaint, HPI, Past History, Prior Labs)
    And the patient receives a localized audio confirmation text.

  Scenario: In-memory session data is securely wiped after submission
    Given a completed MediKiosk intake session
    When the session completion signal is triggered
    Then the session data is deleted from ephemeral memory to prevent patient data exposure.
