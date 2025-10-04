import assert from 'assert';
import request from 'supertest';
import { app } from '../server.js';

describe('Message Routes Tests', () => {
  
  let testGroup;
  let testChannel;
  let groupAdmin;

  before(async () => {
    // Create group admin
    const adminRes = await request(app)
      .post('/api/users')
      .send({
        username: `msgadmin_${Date.now()}`,
        email: 'msgadmin@test.com',
        password: 'pass',
        role: 'Group Admin'
      });
    groupAdmin = adminRes.body.user;

    // Create test group
    const groupRes = await request(app)
      .post('/api/groups')
      .send({
        name: `MessageTestGroup_${Date.now()}`,
        ownerUsername: groupAdmin.username
      });
    testGroup = groupRes.body.group;

    // Create test channel
    const channelRes = await request(app)
      .post(`/api/groups/${testGroup.id}/channels`)
      .send({ name: 'test-messages' });
    testChannel = channelRes.body.channel;
  });

  // Cleanup after all tests
  after(async () => {
    // Delete test group (this also deletes channels and messages)
    await request(app).delete(`/api/groups/${testGroup.id}`);
    
    // Delete admin user
    await request(app).delete(`/api/users/${groupAdmin.id}`);
  });

  describe('GET /api/groups/:groupId/channels/:channelId/messages', () => {
    
    it('should return messages for a channel', async () => {
      const response = await request(app)
        .get(`/api/groups/${testGroup.id}/channels/${testChannel.id}/messages`);
      
      assert.equal(response.status, 200);
      assert(response.body.messages, 'Should have messages property');
      assert(Array.isArray(response.body.messages), 'Messages should be an array');
    });

    it('should return empty array for channel with no messages', async () => {
      const response = await request(app)
        .get(`/api/groups/${testGroup.id}/channels/${testChannel.id}/messages`);
      
      assert.equal(response.status, 200);
      assert(Array.isArray(response.body.messages), 'Messages should be an array');
      assert.equal(response.body.messages.length, 0, 'New channel should have no messages');
    });

    it('should handle limit query parameter', async () => {
      const response = await request(app)
        .get(`/api/groups/${testGroup.id}/channels/${testChannel.id}/messages?limit=5`);
      
      assert.equal(response.status, 200);
      assert(Array.isArray(response.body.messages), 'Should return messages array');
    });

  });

});