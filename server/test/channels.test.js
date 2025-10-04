import assert from 'assert';
import request from 'supertest';
import { app } from '../server.js';

describe('Channel Routes Tests', () => {
  
  let testGroup;
  let groupAdmin;
  let groupMember;
  const createdUserIds = [];

  before(async () => {
    // Create group admin
    const adminRes = await request(app)
      .post('/api/users')
      .send({
        username: `channeladmin_${Date.now()}`,
        email: 'channeladmin@test.com',
        password: 'pass',
        role: 'Group Admin'
      });
    groupAdmin = adminRes.body.user;
    createdUserIds.push(groupAdmin.id);

    // Create test group
    const groupRes = await request(app)
      .post('/api/groups')
      .send({
        name: `ChannelTestGroup_${Date.now()}`,
        ownerUsername: groupAdmin.username
      });
    testGroup = groupRes.body.group;

    // Create and add a member to the group
    const memberRes = await request(app)
      .post('/api/users')
      .send({
        username: `channelmember_${Date.now()}`,
        email: 'channelmember@test.com',
        password: 'pass'
      });
    groupMember = memberRes.body.user;
    createdUserIds.push(groupMember.id);

    await request(app)
      .post(`/api/groups/${testGroup.id}/members`)
      .send({ username: groupMember.username });
  });

  // Cleanup after all tests
  after(async () => {
    // Delete test group (this also deletes all channels)
    await request(app).delete(`/api/groups/${testGroup.id}`);
    
    // Delete all created users
    for (const userId of createdUserIds) {
      await request(app).delete(`/api/users/${userId}`);
    }
  });

  describe('POST /api/groups/:id/channels', () => {
    
    it('should create a channel in a group', async () => {
      const response = await request(app)
        .post(`/api/groups/${testGroup.id}/channels`)
        .send({ name: `channel_${Date.now()}` });
      
      assert.equal(response.status, 201);
      assert(response.body.channel, 'Should return channel object');
      assert(response.body.channel.name, 'Channel should have name');
      assert(response.body.channel.id, 'Channel should have id');
      assert(Array.isArray(response.body.channel.members), 'Channel should have members array');
    });

    it('should reject channel creation without name', async () => {
      const response = await request(app)
        .post(`/api/groups/${testGroup.id}/channels`)
        .send({});
      
      assert.equal(response.status, 400);
      assert(response.body.error, 'Should return error message');
    });

    it('should reject duplicate channel names', async () => {
      const channelName = `duplicate_${Date.now()}`;
      
      // Create first channel
      await request(app)
        .post(`/api/groups/${testGroup.id}/channels`)
        .send({ name: channelName });
      
      // Try duplicate
      const response = await request(app)
        .post(`/api/groups/${testGroup.id}/channels`)
        .send({ name: channelName });
      
      assert.equal(response.status, 400);
      assert(response.body.error.includes('exists'), 'Error should mention already exists');
    });

  });

  describe('POST /api/groups/:groupId/channels/:channelId/members', () => {
    
    let testChannel;

    beforeEach(async () => {
      const channelRes = await request(app)
        .post(`/api/groups/${testGroup.id}/channels`)
        .send({ name: `memberchannel_${Date.now()}` });
      testChannel = channelRes.body.channel;
    });

    it('should add group member to channel', async () => {
      const response = await request(app)
        .post(`/api/groups/${testGroup.id}/channels/${testChannel.id}/members`)
        .send({ username: groupMember.username });
      
      assert.equal(response.status, 200);
      assert(response.body.message, 'Should return success message');
      
      // Verify user in channel
      const groupsRes = await request(app).get('/api/groups');
      const updatedGroup = groupsRes.body.groups.find(g => g.id === testGroup.id);
      const updatedChannel = updatedGroup.channels.find(c => c.id === testChannel.id);
      assert(updatedChannel.members.some(m => m.toLowerCase() === groupMember.username.toLowerCase()),
        'User should be in channel members');
    });

    it('should reject adding non-group-member to channel', async () => {
      // Create user not in group
      const outsiderRes = await request(app)
        .post('/api/users')
        .send({
          username: `outsider_${Date.now()}`,
          email: 'outsider@test.com',
          password: 'pass'
        });
      createdUserIds.push(outsiderRes.body.user.id);
      
      const response = await request(app)
        .post(`/api/groups/${testGroup.id}/channels/${testChannel.id}/members`)
        .send({ username: outsiderRes.body.user.username });
      
      assert.equal(response.status, 400);
      assert(response.body.error.includes('group'), 'Error should mention group membership');
    });

  });

  describe('DELETE /api/groups/:groupId/channels/:channelId/members/:username', () => {
    
    let testChannel;

    beforeEach(async () => {
      const channelRes = await request(app)
        .post(`/api/groups/${testGroup.id}/channels`)
        .send({ name: `removechannel_${Date.now()}` });
      testChannel = channelRes.body.channel;

      await request(app)
        .post(`/api/groups/${testGroup.id}/channels/${testChannel.id}/members`)
        .send({ username: groupMember.username });
    });

    it('should remove user from channel', async () => {
      const response = await request(app)
        .delete(`/api/groups/${testGroup.id}/channels/${testChannel.id}/members/${groupMember.username}`);
      
      assert.equal(response.status, 200);
      
      // Verify user removed
      const groupsRes = await request(app).get('/api/groups');
      const updatedGroup = groupsRes.body.groups.find(g => g.id === testGroup.id);
      const updatedChannel = updatedGroup.channels.find(c => c.id === testChannel.id);
      assert(!updatedChannel.members.some(m => m.toLowerCase() === groupMember.username.toLowerCase()),
        'User should be removed from channel');
    });

  });

  describe('DELETE /api/groups/:groupId/channels/:channelId', () => {
    
    it('should delete a channel', async () => {
      const channelRes = await request(app)
        .post(`/api/groups/${testGroup.id}/channels`)
        .send({ name: `deletechannel_${Date.now()}` });
      
      const channelId = channelRes.body.channel.id;
      
      const deleteRes = await request(app)
        .delete(`/api/groups/${testGroup.id}/channels/${channelId}`);
      
      assert.equal(deleteRes.status, 200);
      
      // Verify channel deleted
      const groupsRes = await request(app).get('/api/groups');
      const updatedGroup = groupsRes.body.groups.find(g => g.id === testGroup.id);
      const deletedChannel = updatedGroup.channels.find(c => c.id === channelId);
      assert(!deletedChannel, 'Channel should be deleted');
    });

  });

});