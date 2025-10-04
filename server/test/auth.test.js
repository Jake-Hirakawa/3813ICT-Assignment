import assert from 'assert';
import request from 'supertest';
import { app } from '../server.js';

describe('Authentication Tests', () => {
  
  before(function() {
    console.log('Starting authentication tests...');
  });

  after(function() {
    console.log('Authentication tests complete');
  });

  describe('POST /api/auth/login', () => {
    
    it('should login with valid super admin credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'super',
          password: '123'
        });
      
      assert.equal(response.status, 200);
      assert(response.body.user, 'Should have user in response');
      assert.equal(response.body.user.username, 'super');
      assert(response.body.user.roles.includes('Super Admin'), 'Should have Super Admin role');
      assert(!response.body.user.password, 'Password should not be in response');
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'super',
          password: 'wrongpassword'
        });
      
      assert.equal(response.status, 401);
      assert(response.body.error, 'Should have error message');
    });

    it('should reject non-existent username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: '',
          password: '123'
        });
      
      assert.equal(response.status, 401);
    });
  });
});