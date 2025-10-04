import assert from 'assert';
import request from 'supertest';
import { app } from '../server.js';

describe('Group Routes Tests', () => {
  
  let groupAdminUser;
  let regularUser;

  // Create test users before all tests
  before(async () => {
    // Create a Group Admin
    const adminRes = await request(app)
      .post('/api/users')
      .send({
        username: `groupadmin_${Date.now()}`,
        email: 'groupadmin@test.com',
        password: 'pass',
        role: 'Group Admin'
      });
    groupAdminUser = adminRes.body.user;

    // Create a regular user
    const userRes = await request(app)
      .post('/api/users')
      .send({
        username: `regularuser_${Date.now()}`,
        email: 'regular@test.com',
        password: 'pass'
      });
    regularUser = userRes.body.user;
  });

  describe('GET /api/groups', () => {
    
    it('should return all groups', async () => {
      const response = await request(app)
        .get('/api/groups');
      
      assert.equal(response.status, 200);
      assert(response.body.groups, 'Should have groups property');
      assert(Array.isArray(response.body.groups), 'Groups should be an array');
    });

  });

  describe('POST /api/groups', () => {
    
    it('should create group when user is Group Admin', async () => {
      const response = await request(app)
        .post('/api/groups')
        .send({
          name: `TestGroup_${Date.now()}`,
          ownerUsername: groupAdminUser.username
        });
      
      assert.equal(response.status, 201);
      assert(response.body.group, 'Should return group object');
      assert.equal(response.body.group.ownerUsername, groupAdminUser.username);
      assert(response.body.group.admins.includes(groupAdminUser.username), 'Owner should be admin');
      assert(response.body.group.members.includes(groupAdminUser.username), 'Owner should be member');
    });

    it('should reject group creation by regular user', async () => {
      const response = await request(app)
        .post('/api/groups')
        .send({
          name: `FailGroup_${Date.now()}`,
          ownerUsername: regularUser.username
        });
      
      assert.equal(response.status, 403);
      assert(response.body.error, 'Should return error message');
    });

    it('should reject group creation without name', async () => {
      const response = await request(app)
        .post('/api/groups')
        .send({
          ownerUsername: groupAdminUser.username
        });
      
      assert.equal(response.status, 400);
      assert(response.body.error.includes('name'), 'Error should mention name');
    });

  });

  describe('POST /api/groups/:id/members', () => {
    
    let testGroup;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/groups')
        .send({
          name: `MemberTestGroup_${Date.now()}`,
          ownerUsername: groupAdminUser.username
        });
      testGroup = response.body.group;
    });

    it('should add user to group', async () => {
      const response = await request(app)
        .post(`/api/groups/${testGroup.id}/members`)
        .send({ username: regularUser.username });
      
      assert.equal(response.status, 200);
      assert(response.body.message, 'Should return success message');
      
      // Verify user is in group
      const groupsRes = await request(app).get('/api/groups');
      const updatedGroup = groupsRes.body.groups.find(g => g.id === testGroup.id);
      assert(updatedGroup.members.some(m => m.toLowerCase() === regularUser.username.toLowerCase()), 
        'User should be in group members');
    });

    it('should reject adding non-existent user', async () => {
      const response = await request(app)
        .post(`/api/groups/${testGroup.id}/members`)
        .send({ username: 'nonexistent' });
      
      assert.equal(response.status, 404);
    });

    it('should reject adding duplicate member', async () => {
      // Add user first time
      await request(app)
        .post(`/api/groups/${testGroup.id}/members`)
        .send({ username: regularUser.username });
      
      // Try adding again
      const response = await request(app)
        .post(`/api/groups/${testGroup.id}/members`)
        .send({ username: regularUser.username });
      
      assert.equal(response.status, 400);
      assert(response.body.error.includes('already'), 'Error should mention already a member');
    });

  });

  describe('DELETE /api/groups/:id/members/:username', () => {
    
    let testGroup;

    beforeEach(async () => {
      const groupRes = await request(app)
        .post('/api/groups')
        .send({
          name: `RemoveTestGroup_${Date.now()}`,
          ownerUsername: groupAdminUser.username
        });
      testGroup = groupRes.body.group;

      // Add regular user to group
      await request(app)
        .post(`/api/groups/${testGroup.id}/members`)
        .send({ username: regularUser.username });
    });

    it('should remove user from group', async () => {
      const response = await request(app)
        .delete(`/api/groups/${testGroup.id}/members/${regularUser.username}`);
      
      assert.equal(response.status, 200);
      
      // Verify user removed
      const groupsRes = await request(app).get('/api/groups');
      const updatedGroup = groupsRes.body.groups.find(g => g.id === testGroup.id);
      assert(!updatedGroup.members.some(m => m.toLowerCase() === regularUser.username.toLowerCase()), 
        'User should be removed from group');
    });

  });

  describe('DELETE /api/groups/:id', () => {
    
    it('should delete a group', async () => {
      const groupRes = await request(app)
        .post('/api/groups')
        .send({
          name: `DeleteTestGroup_${Date.now()}`,
          ownerUsername: groupAdminUser.username
        });
      
      const groupId = groupRes.body.group.id;
      
      const deleteRes = await request(app)
        .delete(`/api/groups/${groupId}`);
      
      assert.equal(deleteRes.status, 200);
      
      // Verify group deleted
      const groupsRes = await request(app).get('/api/groups');
      const deletedGroup = groupsRes.body.groups.find(g => g.id === groupId);
      assert(!deletedGroup, 'Group should be deleted');
    });

  });

});