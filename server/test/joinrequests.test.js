import assert from 'assert';
import request from 'supertest';
import { app } from '../server.js';

describe('Join Request Routes Tests', () => {
  
  let testGroup;
  let groupAdmin;
  let requestUser;

  before(async () => {
    // Create group admin
    const adminRes = await request(app)
      .post('/api/users')
      .send({
        username: `joinadmin_${Date.now()}`,
        email: 'joinadmin@test.com',
        password: 'pass',
        role: 'Group Admin'
      });
    groupAdmin = adminRes.body.user;

    // Create test group
    const groupRes = await request(app)
      .post('/api/groups')
      .send({
        name: `JoinRequestGroup_${Date.now()}`,
        ownerUsername: groupAdmin.username
      });
    testGroup = groupRes.body.group;

    // Create user who will request to join
    const userRes = await request(app)
      .post('/api/users')
      .send({
        username: `joinuser_${Date.now()}`,
        email: 'joinuser@test.com',
        password: 'pass'
      });
    requestUser = userRes.body.user;
  });

  describe('GET /api/join-requests', () => {
    
    it('should return all join requests', async () => {
      const response = await request(app)
        .get('/api/join-requests');
      
      assert.equal(response.status, 200);
      assert(response.body.joinRequests, 'Should have joinRequests property');
      assert(Array.isArray(response.body.joinRequests), 'Join requests should be an array');
    });

  });

  describe('POST /api/groups/:gid/requests', () => {
    
    it('should create a join request for a group', async () => {
      const response = await request(app)
        .post(`/api/groups/${testGroup.id}/requests`)
        .send({ username: requestUser.username });
      
      assert.equal(response.status, 201);
      assert(response.body.request, 'Should return request object');
      assert.equal(response.body.request.gid, testGroup.id);
      assert.equal(response.body.request.username, requestUser.username);
      assert.equal(response.body.request.status, 'pending');
      assert(response.body.request.id, 'Request should have an ID');
    });

    it('should reject join request for non-existent user', async () => {
      const response = await request(app)
        .post(`/api/groups/${testGroup.id}/requests`)
        .send({ username: 'nonexistentuser' });
      
      assert.equal(response.status, 404);
    });

    it('should reject join request for non-existent group', async () => {
      const response = await request(app)
        .post('/api/groups/nonexistentgroup/requests')
        .send({ username: requestUser.username });
      
      assert.equal(response.status, 404);
    });

    it('should reject duplicate pending join request', async () => {
      // Create new user for this test
      const newUserRes = await request(app)
        .post('/api/users')
        .send({
          username: `duprequest_${Date.now()}`,
          email: 'dup@test.com',
          password: 'pass'
        });
      
      // Create first request
      await request(app)
        .post(`/api/groups/${testGroup.id}/requests`)
        .send({ username: newUserRes.body.user.username });
      
      // Try duplicate
      const response = await request(app)
        .post(`/api/groups/${testGroup.id}/requests`)
        .send({ username: newUserRes.body.user.username });
      
      assert.equal(response.status, 409);
    });

  });

  describe('POST /api/join-requests/:id/approve', () => {
    
    let joinRequest;
    let approveUser;

    beforeEach(async () => {
      // Create new user
      const userRes = await request(app)
        .post('/api/users')
        .send({
          username: `approveuser_${Date.now()}`,
          email: 'approve@test.com',
          password: 'pass'
        });
      approveUser = userRes.body.user;

      // Create join request
      const requestRes = await request(app)
        .post(`/api/groups/${testGroup.id}/requests`)
        .send({ username: approveUser.username });
      joinRequest = requestRes.body.request;
    });

    it('should approve a pending join request', async () => {
      const response = await request(app)
        .post(`/api/join-requests/${joinRequest.id}/approve`);
      
      assert.equal(response.status, 200);
      assert(response.body.message.includes('approved'), 'Should confirm approval');
    });

    it('should add user to group when request is approved', async () => {
      await request(app)
        .post(`/api/join-requests/${joinRequest.id}/approve`);
      
      // Verify user is now in the group
      const groupsRes = await request(app).get('/api/groups');
      const updatedGroup = groupsRes.body.groups.find(g => g.id === testGroup.id);
      
      assert(updatedGroup.members.some(m => m.toLowerCase() === approveUser.username.toLowerCase()),
        'User should be added to group members');
    });

    it('should reject approval of non-existent request', async () => {
      const response = await request(app)
        .post('/api/join-requests/507f1f77bcf86cd799439011/approve');
      
      assert.equal(response.status, 404);
    });

  });

  describe('POST /api/join-requests/:id/reject', () => {
    
    let joinRequest;
    let rejectUser;

    beforeEach(async () => {
      // Create new user
      const userRes = await request(app)
        .post('/api/users')
        .send({
          username: `rejectuser_${Date.now()}`,
          email: 'reject@test.com',
          password: 'pass'
        });
      rejectUser = userRes.body.user;

      // Create join request
      const requestRes = await request(app)
        .post(`/api/groups/${testGroup.id}/requests`)
        .send({ username: rejectUser.username });
      joinRequest = requestRes.body.request;
    });

    it('should reject a pending join request', async () => {
      const response = await request(app)
        .post(`/api/join-requests/${joinRequest.id}/reject`);
      
      assert.equal(response.status, 200);
      assert(response.body.message.includes('rejected'), 'Should confirm rejection');
    });

    it('should not add user to group when request is rejected', async () => {
      await request(app)
        .post(`/api/join-requests/${joinRequest.id}/reject`);
      
      // Verify user is NOT in the group
      const groupsRes = await request(app).get('/api/groups');
      const updatedGroup = groupsRes.body.groups.find(g => g.id === testGroup.id);
      
      assert(!updatedGroup.members.some(m => m.toLowerCase() === rejectUser.username.toLowerCase()),
        'User should NOT be added to group members');
    });

    it('should reject rejection of non-existent request', async () => {
      const response = await request(app)
        .post('/api/join-requests/507f1f77bcf86cd799439011/reject');
      
      assert.equal(response.status, 404);
    });

  });

});