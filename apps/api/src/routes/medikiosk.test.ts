import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../app.js';

test('MediKiosk AI Clinical Intake Engine API Suite', async (t) => {
  let sessionId = '';

  await t.test('POST /api/v1/medikiosk/session/start - Module D: ABDM ABHA Sandbox Linkage & Verification', async () => {
    const res = await request(app)
      .post('/api/v1/medikiosk/session/start')
      .send({
        language: 'hi',
        mode: 'allopathy',
        aadhaarNumber: '987654321098',
        aadhaarOtp: '123456'
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.sessionId.startsWith('Kiosk-'));
    assert.ok(res.body.data.abhaId.length > 0);
    assert.strictEqual(res.body.data.abhaDetails.verificationStatus, 'VERIFIED');
    sessionId = res.body.data.sessionId;
  });

  await t.test('POST /api/v1/medikiosk/session/:id/consent - Module D: Granular Consent under DPDP Act 2023', async () => {
    const res = await request(app)
      .post(`/api/v1/medikiosk/session/${sessionId}/consent`)
      .send({
        shareHistory: true,
        shareScannedDocs: true,
        shareAnalytics: false,
        accessDurationHours: 24
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.consentGiven, true);
    assert.strictEqual(res.body.data.dpdpConsent.shareHistory, true);
    assert.strictEqual(res.body.data.dpdpConsent.complianceVersion, 'DPDP-2023-V1');
  });

  await t.test('POST /api/v1/medikiosk/session/:id/questions - should return adaptive SOCRATES questions & detect red flags', async () => {
    const res = await request(app)
      .post(`/api/v1/medikiosk/session/${sessionId}/questions`)
      .send({
        chiefComplaint: 'Severe left sided chest pain radiating to left arm'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.adaptiveQuestions.length >= 3);
    assert.ok(res.body.data.redFlagsDetected.length > 0);
    assert.ok(res.body.data.redFlagsDetected[0].includes('Cardiac Distress'));
  });

  await t.test('POST /api/v1/medikiosk/session/:id/answers - should store structured intake history', async () => {
    const res = await request(app)
      .post(`/api/v1/medikiosk/session/${sessionId}/answers`)
      .send({
        chiefComplaint: 'Severe left sided chest pain radiating to left arm',
        socrates: {
          site: 'Chest',
          onset: 'Sudden',
          character: 'Crushing',
          radiation: 'Left Arm',
          severity: '9'
        },
        allergies: ['Penicillin']
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.historyRecorded.socrates.character, 'Crushing');
  });

  await t.test('POST /api/v1/medikiosk/session/:id/ocr - Module B: Multi-Page OCR & Abnormal Lab Flagging', async () => {
    const res = await request(app)
      .post(`/api/v1/medikiosk/session/${sessionId}/ocr`)
      .send({
        fileName: 'MultiPage_Lab_Report.pdf',
        docType: 'Lab Report',
        rawText: 'Page 1: Prescription Metformin 500mg BD. Diagnosis: Type 2 Diabetes Mellitus\n--- NEXT PAGE ---\nPage 2: Labs HbA1c 8.4% High, Serum Creatinine 1.5 mg/dL High'
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.document.extractedDiagnosis, 'Type 2 Diabetes Mellitus');
    assert.ok(res.body.data.document.pageCount >= 2);
    assert.strictEqual(res.body.data.document.extractedLabValues[0].isAbnormal, true);
    assert.ok(res.body.data.document.abnormalLabFlags.length > 0);
  });

  await t.test('POST /api/v1/medikiosk/session/:id/summary - Module C: Bilingual Summary Generator (SOAP & Dual-View)', async () => {
    const res = await request(app)
      .post(`/api/v1/medikiosk/session/${sessionId}/summary`)
      .send({});

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.structuredSOAP.chiefComplaint.includes('chest pain'));
    assert.ok(res.body.data.structuredSOAP.historyOfPresentIllness.length > 0);
    assert.ok(res.body.data.structuredSOAP.pastMedicalHistory.length > 0);
    assert.ok(res.body.data.structuredSOAP.reviewOfSystems.length > 0);
    assert.ok(
      (res.body.data.structuredSOAP.priorInvestigationsTimeline || res.body.data.structuredSOAP.priorInvestigations).length > 0
    );
    assert.ok(res.body.data.bilingualAudioConfirmation.patientAudioText.length > 0);
    assert.ok(res.body.data.bilingualAudioConfirmation.doctorEnglishSummary.length > 0);
  });

  await t.test('DELETE /api/v1/medikiosk/session/:id - Module D: Ephemeral Session Memory Wipe', async () => {
    const res = await request(app)
      .delete(`/api/v1/medikiosk/session/${sessionId}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.message.includes('ephemeral session memory securely wiped'));

    // Confirm session is completely purged from memory (returns 404)
    const checkRes = await request(app)
      .post(`/api/v1/medikiosk/session/${sessionId}/consent`)
      .send({});
    assert.strictEqual(checkRes.status, 404);
  });
});
