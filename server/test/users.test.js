import assert from 'assert';
import request from 'supertest';
import { app } from '../server.js';

describe('User Routes Tests', () => {
  
  const createdUserIds = [];

  // Cleanup after all tests
  after(async () => {
    for (const userId of createdUserIds) {
      await request(app).delete(`/api/users/${userId}`);
    }
  });

  describe('GET /api/users', () => {
    
    it('should return all users without passwords', async () => {
      const response = await request(app)
        .get('/api/users');
      
      assert.equal(response.status, 200);
      assert(Array.isArray(response.body.users), 'Users should be an array');
      
      // Check passwords not included
      response.body.users.forEach(user => {
        assert(!user.password, `User should not have password field`);
      });
    });

  });

  describe('POST /api/users', () => {
    
    it('should create a new user successfully', async () => {
      const newUser = {
        username: `testuser_${Date.now()}`,
        email: 'test@example.com',
        password: 'testpass'
      };

      const response = await request(app)
        .post('/api/users')
        .send(newUser);
      
      assert.equal(response.status, 201);
      assert.equal(response.body.user.username, newUser.username);
      assert(!response.body.user.password, 'Password should not be in response');
      assert(response.body.user.roles.includes('User'), 'Should have default User role');
      
      createdUserIds.push(response.body.user.id);
    });

    it('should reject duplicate username', async () => {
      const username = `duplicate_${Date.now()}`;
      
      // Create first user
      const firstRes = await request(app)
        .post('/api/users')
        .send({
          username: username,
          email: 'first@example.com',
          password: 'pass'
        });
      createdUserIds.push(firstRes.body.user.id);
      
      // Try duplicate
      const response = await request(app)
        .post('/api/users')
        .send({
          username: username,
          email: 'second@example.com',
          password: 'pass'
        });
      
      assert.equal(response.status, 409);
    });

    it('should reject missing username', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          email: 'noname@example.com',
          password: 'pass'
        });
      
      assert.equal(response.status, 400);
    });

  });

  describe('DELETE /api/users/:id', () => {
    
    it('should delete an existing user', async () => {
      // Create test user
      const createRes = await request(app)
        .post('/api/users')
        .send({
          username: `deletetest_${Date.now()}`,
          email: 'delete@example.com',
          password: 'pass'
        });
      
      const userId = createRes.body.user.id;
      
      // Delete user
      const deleteRes = await request(app)
        .delete(`/api/users/${userId}`);
      
      assert.equal(deleteRes.status, 200);
      
      // Verify deleted
      const usersRes = await request(app).get('/api/users');
      const deletedUser = usersRes.body.users.find(u => u.id === userId);
      assert(!deletedUser, 'User should be deleted from database');
      
      // No need to add to cleanup array since it's already deleted
    });

  });

  describe('POST /api/users/:id/promote-super-admin', () => {
    
    it('should promote user to Super Admin', async () => {
      // Create regular user
      const createRes = await request(app)
        .post('/api/users')
        .send({
          username: `promote_${Date.now()}`,
          email: 'promote@example.com',
          password: 'pass'
        });
      
      const userId = createRes.body.user.id;
      createdUserIds.push(userId);
      
      // Promote
      const promoteRes = await request(app)
        .post(`/api/users/${userId}/promote-super-admin`);
      
      assert.equal(promoteRes.status, 200);
      
      // Verify promotion
      const usersRes = await request(app).get('/api/users');
      const promotedUser = usersRes.body.users.find(u => u.id === userId);
      assert(promotedUser.roles.includes('Super Admin'), 'Should have Super Admin role');
    });

  });
});