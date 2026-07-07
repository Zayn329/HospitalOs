import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../app.js';
import User from '../models/User.js';
import { hashPassword } from '../utils/auth.js';

describe('Auth & Role-Based Access API', () => {
  const originalFindOne = User.findOne;
  const originalSave = User.prototype.save;

  after(() => {
    User.findOne = originalFindOne;
    User.prototype.save = originalSave;
  });

  test('POST /api/v1/auth/login - should authenticate successfully and return role dashboard', async () => {
    const hashedPassword = hashPassword('receptionPassword');
    User.findOne = (async () => ({
      _id: 'receptionistUserId123',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@hospital.com',
      passwordHash: hashedPassword,
      role: 'receptionist'
    })) as any;

    const payload = {
      email: 'alice@hospital.com',
      password: 'receptionPassword'
    };

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send(payload)
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.ok(response.body.data.token);
    assert.strictEqual(response.body.data.dashboard, '/dashboard/receptionist');
    assert.strictEqual(response.body.data.user.role, 'receptionist');
  });

  test('POST /api/v1/auth/login - should fail with invalid credentials', async () => {
    User.findOne = (async () => null) as any;

    const payload = {
      email: 'wrong@hospital.com',
      password: 'somePassword'
    };

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send(payload)
      .expect(401);

    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, 'INVALID_CREDENTIALS');
  });

  test('GET /api/v1/admin/debug-restricted - should deny access to receptionist', async () => {
    const hashedPassword = hashPassword('receptionPassword');
    const receptionistUser = {
      _id: 'receptionistUserId123',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@hospital.com',
      passwordHash: hashedPassword,
      role: 'receptionist'
    };

    User.findOne = (async () => receptionistUser) as any;
    
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'alice@hospital.com', password: 'receptionPassword' })
      .expect(200);
      
    const receptionistToken = loginRes.body.data.token;

    const response = await request(app)
      .get('/api/v1/admin/debug-restricted')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .expect(403);

    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, 'UNAUTHORIZED_ACCESS');
  });

  test('GET /api/v1/admin/debug-restricted - should grant access to administrator', async () => {
    const hashedPassword = hashPassword('adminPassword');
    const adminUser = {
      _id: 'adminUserId123',
      firstName: 'Admin',
      lastName: 'Boss',
      email: 'admin@hospital.com',
      passwordHash: hashedPassword,
      role: 'administrator'
    };

    User.findOne = (async () => adminUser) as any;
    
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@hospital.com', password: 'adminPassword' })
      .expect(200);
      
    const adminToken = loginRes.body.data.token;

    const response = await request(app)
      .get('/api/v1/admin/debug-restricted')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.message, 'Admin restricted data accessed successfully.');
  });
});
