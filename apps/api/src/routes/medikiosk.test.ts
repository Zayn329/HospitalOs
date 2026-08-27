import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../app.js';

test('MediKiosk AI Clinical Intake Engine API Suite', async (t) => {
  let sessionId = '';

  await t.test('POST /api/v1/medikiosk/session/start - should initialize kiosk session with ABDM ABHA ID & Audio Prompt', async () => {
    const res = await request(app)
      .post('/api/v1/medikiosk/session/start')
      .send({
        language: 'hi',
        mode: 'allopathy'
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.sessionId.startsWith('Kiosk-'));
    assert.ok(res.body.data.audioConsentPrompt.length > 0);
    sessionId = res.body.data.sessionId;
  });

  await t.test('POST /api/v1/medikiosk/session/:id/consent - should record consent under DPDP Act 2023', async () => {
    const res = await request(app)
      .post(`/api/v1/medikiosk/session/${sessionId}/consent`)
      .send({});

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.consentGiven, true);
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

  await t.test('POST /api/v1/medikiosk/session/:id/ocr - should digitize scanned prescriptions/lab reports with OCR extraction', async () => {
    const res = await request(app)
      .post(`/api/v1/medikiosk/session/${sessionId}/ocr`)
      .send({
        fileName: 'Old_Prescription_2023.jpg',
        docType: 'Prescription',
        mockOcrText: 'Handwritten Rx: Type 2 Diabetes Mellitus, HbA1c 8.2% High'
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.document.extractedDiagnosis, 'Type 2 Diabetes Mellitus');
    assert.strictEqual(res.body.data.document.extractedLabValues[0].isAbnormal, true);
  });

  await t.test('POST /api/v1/medikiosk/session/:id/summary - should generate bilingual SOAP summary for doctor screen', async () => {
    const res = await request(app)
      .post(`/api/v1/medikiosk/session/${sessionId}/summary`)
      .send({});

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.structuredSOAP.chiefComplaint.includes('chest pain'));
    assert.ok(res.body.data.bilingualAudioConfirmation.patientAudioText.length > 0);
  });

  await t.test('DELETE /api/v1/medikiosk/session/:id - should wipe kiosk session memory securely', async () => {
    const res = await request(app)
      .delete(`/api/v1/medikiosk/session/${sessionId}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });
});
