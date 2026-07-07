import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../app.js';
import Patient from '../models/Patient.js';

describe('Patient Registration API', () => {
  const originalFindOne = Patient.findOne;
  const originalSave = Patient.prototype.save;
  
  after(() => {
    Patient.findOne = originalFindOne;
    Patient.prototype.save = originalSave;
  });

  test('POST /api/v1/patients - should register a new patient successfully', async () => {
    Patient.findOne = (async () => null) as any;
    Patient.prototype.save = (async function(this: any) {
      this.hospitalId = 'HOSP-999999';
      return this;
    }) as any;

    const payload = {
      firstName: 'John',
      lastName: 'Doe',
      gender: 'male',
      dateOfBirth: '1990-01-01',
      phone: '9876543210',
      email: 'john.doe@example.com'
    };

    const response = await request(app)
      .post('/api/v1/patients')
      .send(payload)
      .expect(201);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.firstName, 'John');
    assert.strictEqual(response.body.data.lastName, 'Doe');
    assert.match(response.body.data.hospitalId, /^HOSP-\d{6}$/);
  });

  test('POST /api/v1/patients - should prevent duplicate registration', async () => {
    Patient.findOne = (async () => ({
      hospitalId: 'HOSP-123456',
      firstName: 'John',
      lastName: 'Doe',
      phone: '9876543210'
    })) as any;

    const payload = {
      firstName: 'John',
      lastName: 'Doe',
      gender: 'male',
      dateOfBirth: '1990-01-01',
      phone: '9876543210'
    };

    const response = await request(app)
      .post('/api/v1/patients')
      .send(payload)
      .expect(409);

    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, 'DUPLICATE_PATIENT');
    assert.strictEqual(response.body.error.existingPatient.hospitalId, 'HOSP-123456');
  });

  test('POST /api/v1/patients - should highlight missing required fields', async () => {
    const payload = {
      firstName: '',
      lastName: 'Doe',
      gender: '',
      dateOfBirth: 'invalid-date',
      phone: ''
    };

    const response = await request(app)
      .post('/api/v1/patients')
      .send(payload)
      .expect(400);

    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, 'VALIDATION_ERROR');
    
    const details = response.body.error.details;
    assert.ok(details.length > 0);
    assert.ok(details.some((d: any) => d.field === 'firstName'));
    assert.ok(details.some((d: any) => d.field === 'gender'));
    assert.ok(details.some((d: any) => d.field === 'dateOfBirth'));
    assert.ok(details.some((d: any) => d.field === 'phone'));
  });
});
