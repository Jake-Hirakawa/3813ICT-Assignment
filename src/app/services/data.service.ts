import { Injectable } from '@angular/core';
import { User, Group, Channel, CreateUser, CreateGroup, CreateChannel, GroupJoinRequest, UserChannelMembership } from '../model/model';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private readonly STORAGE_KEYS = {
    users: 'chat_users',
    groups: 'chat_groups', 
    channels: 'chat_channels',
    groupJoinRequests: 'chat_group_join_requests',
    channelMemberships: 'chat_channel_memberships',
    nextUserId: 'next_user_id',
    nextGroupId: 'next_group_id',
    nextChannelId: 'next_channel_id',
    nextRequestId: 'next_request_id'
  };

  constructor() {
    this.initializeData();
  }

  // Initialize with default data if storage is empty
  private initializeData(): void {
    if (!this.getUsers().length) {
      // Create default users
      const defaultUsers: User[] = [
        {
          id: 1,
          username: 'super',
          email: 'super@admin.com',
          password: '123',
          roles: ['super-admin'],
          groups: [1]
        },
        {
          id: 2,
          username: 'groupadmin1',
          email: 'admin1@test.com',
          password: 'admin123',
          roles: ['group-admin'],
          groups: [1]
        },
        {
          id: 3,
          username: 'user1',
          email: 'user1@test.com',
          password: 'user123',
          roles: ['user'],
          groups: [1]
        }
      ];

      // Create default groups
      const defaultGroups: Group[] = [
        {
          id: 1,
          name: 'General',
          description: 'Main discussion group',
          adminId: 2,
          channels: [1, 2],
          members: [1, 2, 3],
          createdBy: 2
        },
        {
          id: 2,
          name: 'Project Team',
          description: 'Group for project discussions',
          adminId: 1,
          channels: [],
          members: [1],
          createdBy: 1
        }
      ];

      // Create default channels
      const defaultChannels: Channel[] = [
        {
          id: 1,
          name: 'general',
          description: 'General discussions',
          groupId: 1,
          createdBy: 2
        },
        {
          id: 2,
          name: 'announcements', 
          description: 'Important announcements',
          groupId: 1,
          createdBy: 2
        }
      ];

      // Save to storage
      this.saveToStorage(this.STORAGE_KEYS.users, defaultUsers);
      this.saveToStorage(this.STORAGE_KEYS.groups, defaultGroups);
      this.saveToStorage(this.STORAGE_KEYS.channels, defaultChannels);
      this.saveToStorage(this.STORAGE_KEYS.groupJoinRequests, []);
      this.saveToStorage(this.STORAGE_KEYS.channelMemberships, []);
      this.saveToStorage(this.STORAGE_KEYS.nextUserId, 4);
      this.saveToStorage(this.STORAGE_KEYS.nextGroupId, 3);
      this.saveToStorage(this.STORAGE_KEYS.nextChannelId, 3);
      this.saveToStorage(this.STORAGE_KEYS.nextRequestId, 1);
    }
  }

  // Generic storage methods
  private saveToStorage(key: string, data: any): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  private getFromStorage<T>(key: string, defaultValue: T): T {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  }

  // User methods
  getUsers(): User[] {
    return this.getFromStorage<User[]>(this.STORAGE_KEYS.users, []);
  }

  getUserById(id: number): User | undefined {
    return this.getUsers().find(user => user.id === id);
  }

  getUserByUsername(username: string): User | undefined {
    return this.getUsers().find(user => user.username === username);
  }

  createUser(userData: CreateUser): User {
    const users = this.getUsers();
    const nextId = this.getFromStorage<number>(this.STORAGE_KEYS.nextUserId, 1);
    
    const newUser: User = {
      ...userData,
      id: nextId,
      createdAt: new Date()
    };

    users.push(newUser);
    this.saveToStorage(this.STORAGE_KEYS.users, users);
    this.saveToStorage(this.STORAGE_KEYS.nextUserId, nextId + 1);
    
    return newUser;
  }

  updateUser(id: number, updates: Partial<User>): boolean {
    const users = this.getUsers();
    const userIndex = users.findIndex(user => user.id === id);
    
    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], ...updates };
      this.saveToStorage(this.STORAGE_KEYS.users, users);
      return true;
    }
    return false;
  }

  deleteUser(id: number): boolean {
    const users = this.getUsers();
    const userIndex = users.findIndex(user => user.id === id);
    
    if (userIndex !== -1) {
      // Remove user from all groups
      const groups = this.getGroups();
      groups.forEach(group => {
        group.members = group.members.filter((memberId: number) => memberId !== id);
      });
      this.saveToStorage(this.STORAGE_KEYS.groups, groups);

      // Remove the user
      users.splice(userIndex, 1);
      this.saveToStorage(this.STORAGE_KEYS.users, users);
      return true;
    }
    return false;
  }

  // Group methods
  getGroups(): Group[] {
    return this.getFromStorage<Group[]>(this.STORAGE_KEYS.groups, []);
  }

  getGroupById(id: number): Group | undefined {
    return this.getGroups().find(group => group.id === id);
  }

  getUserGroups(userId: number): Group[] {
    return this.getGroups().filter(group => group.members.includes(userId));
  }

  createGroup(groupData: CreateGroup): Group {
    const groups = this.getGroups();
    const nextId = this.getFromStorage<number>(this.STORAGE_KEYS.nextGroupId, 1);
    
    const newGroup: Group = {
      ...groupData,
      id: nextId,
      createdAt: new Date()
    };

    groups.push(newGroup);
    this.saveToStorage(this.STORAGE_KEYS.groups, groups);
    this.saveToStorage(this.STORAGE_KEYS.nextGroupId, nextId + 1);
    
    return newGroup;
  }

  updateGroup(id: number, groupData: Partial<Group>): boolean {
    const groups = this.getGroups();
    const groupIndex = groups.findIndex(group => group.id === id);
    
    if (groupIndex !== -1) {
      groups[groupIndex] = { ...groups[groupIndex], ...groupData };
      this.saveToStorage(this.STORAGE_KEYS.groups, groups);
      return true;
    }
    return false;
  }

  deleteGroup(id: number): boolean {
    const groups = this.getGroups();
    const groupIndex = groups.findIndex(group => group.id === id);
    
    if (groupIndex !== -1) {
      // Delete all channels in this group
      const channels = this.getChannels();
      const filteredChannels = channels.filter(channel => channel.groupId !== id);
      this.saveToStorage(this.STORAGE_KEYS.channels, filteredChannels);
      
      // Remove group from all users
      const users = this.getUsers();
      users.forEach(user => {
        user.groups = user.groups.filter(groupId => groupId !== id);
      });
      this.saveToStorage(this.STORAGE_KEYS.users, users);

      groups.splice(groupIndex, 1);
      this.saveToStorage(this.STORAGE_KEYS.groups, groups);
      return true;
    }
    return false;
  }

  addUserToGroup(userId: number, groupId: number): boolean {
    const user = this.getUserById(userId);
    const group = this.getGroupById(groupId);
    
    if (user && group && !group.members.includes(userId)) {
      group.members.push(userId);
      user.groups.push(groupId);
      
      this.updateUser(userId, user);
      
      const groups = this.getGroups();
      const groupIndex = groups.findIndex(g => g.id === groupId);
      groups[groupIndex] = group;
      this.saveToStorage(this.STORAGE_KEYS.groups, groups);
      
      return true;
    }
    return false;
  }

  removeUserFromGroup(userId: number, groupId: number): boolean {
    const user = this.getUserById(userId);
    const group = this.getGroupById(groupId);
    
    if (user && group && group.members.includes(userId)) {
      group.members = group.members.filter(id => id !== userId);
      user.groups = user.groups.filter(id => id !== groupId);

      this.updateUser(userId, user);

      const groups = this.getGroups();
      const groupIndex = groups.findIndex(g => g.id === groupId);
      groups[groupIndex] = group;
      this.saveToStorage(this.STORAGE_KEYS.groups, groups);
      
      return true;
    }
    return false;   
  }

  // Group Join Request methods
  getGroupJoinRequests(): GroupJoinRequest[] {
    return this.getFromStorage<GroupJoinRequest[]>(this.STORAGE_KEYS.groupJoinRequests, []);
  }

  getUserPendingRequests(userId: number): GroupJoinRequest[] {
    return this.getGroupJoinRequests().filter(req => 
      req.userId === userId && req.status === 'pending'
    );
  }

  getPendingRequestsForGroup(groupId: number): GroupJoinRequest[] {
    return this.getGroupJoinRequests().filter(req => 
      req.groupId === groupId && req.status === 'pending'
    );
  }

  createGroupJoinRequest(requestData: {
    userId: number;
    groupId: number; 
    status: 'pending';
  }): GroupJoinRequest {
    const requests = this.getGroupJoinRequests();
    const nextId = this.getFromStorage<number>(this.STORAGE_KEYS.nextRequestId, 1);
    
    // Check if user already has a pending request for this group
    const existingRequest = requests.find(req => 
      req.userId === requestData.userId && 
      req.groupId === requestData.groupId && 
      req.status === 'pending'
    );
    
    if (existingRequest) {
      throw new Error('You already have a pending request for this group');
    }
    
    const newRequest: GroupJoinRequest = {
      id: nextId,
      userId: requestData.userId,
      groupId: requestData.groupId,
      status: 'pending',
      requestedAt: new Date()
    };

    requests.push(newRequest);
    this.saveToStorage(this.STORAGE_KEYS.groupJoinRequests, requests);
    this.saveToStorage(this.STORAGE_KEYS.nextRequestId, nextId + 1);
    
    return newRequest;
  }

  approveGroupJoinRequest(requestId: number, adminId: number): boolean {
    const requests = this.getGroupJoinRequests();
    const requestIndex = requests.findIndex(req => req.id === requestId);
    
    if (requestIndex !== -1) {
      const request = requests[requestIndex];
      request.status = 'approved';
      request.respondedAt = new Date();
      request.respondedBy = adminId;
      
      // Add user to group
      this.addUserToGroup(request.userId, request.groupId);
      
      this.saveToStorage(this.STORAGE_KEYS.groupJoinRequests, requests);
      return true;
    }
    return false;
  }

  denyGroupJoinRequest(requestId: number, adminId: number): boolean {
    const requests = this.getGroupJoinRequests();
    const requestIndex = requests.findIndex(req => req.id === requestId);
    
    if (requestIndex !== -1) {
      const request = requests[requestIndex];
      request.status = 'denied';
      request.respondedAt = new Date();
      request.respondedBy = adminId;
      
      this.saveToStorage(this.STORAGE_KEYS.groupJoinRequests, requests);
      return true;
    }
    return false;
  }

  // Channel methods
  getChannels(): Channel[] {
    return this.getFromStorage<Channel[]>(this.STORAGE_KEYS.channels, []);
  }

  getChannelById(id: number): Channel | undefined {
    return this.getChannels().find(channel => channel.id === id);
  }

  getChannelsByGroupId(groupId: number): Channel[] {
    return this.getChannels().filter(channel => channel.groupId === groupId);
  }

  createChannel(channelData: CreateChannel): Channel {
    const channels = this.getChannels();
    const nextId = this.getFromStorage<number>(this.STORAGE_KEYS.nextChannelId, 1);
    
    const newChannel: Channel = {
      ...channelData,
      id: nextId,
      createdAt: new Date()
    };

    channels.push(newChannel);
    
    // Add channel to group
    const groups = this.getGroups();
    const group = groups.find(g => g.id === channelData.groupId);
    if (group) {
      group.channels.push(newChannel.id);
      this.saveToStorage(this.STORAGE_KEYS.groups, groups);
    }

    this.saveToStorage(this.STORAGE_KEYS.channels, channels);
    this.saveToStorage(this.STORAGE_KEYS.nextChannelId, nextId + 1);
    
    return newChannel;
  }

  updateChannel(id: number, channelData: Partial<Channel>): boolean {
    const channels = this.getChannels();
    const channelIndex = channels.findIndex(channel => channel.id === id);
    
    if (channelIndex !== -1) {
      channels[channelIndex] = { ...channels[channelIndex], ...channelData };
      this.saveToStorage(this.STORAGE_KEYS.channels, channels);
      return true;
    }
    return false;
  }

  deleteChannel(id: number): boolean {
    const channels = this.getChannels();
    const channelIndex = channels.findIndex(channel => channel.id === id);
    
    if (channelIndex !== -1) {
      const channel = channels[channelIndex];
      
      // Remove channel from group
      const groups = this.getGroups();
      const group = groups.find(g => g.id === channel.groupId);
      if (group) {
        group.channels = group.channels.filter(channelId => channelId !== id);
        this.saveToStorage(this.STORAGE_KEYS.groups, groups);
      }

      channels.splice(channelIndex, 1);
      this.saveToStorage(this.STORAGE_KEYS.channels, channels);
      return true;
    }
    return false;
  }

  // Channel Membership methods
  getChannelMemberships(): UserChannelMembership[] {
    return this.getFromStorage<UserChannelMembership[]>(this.STORAGE_KEYS.channelMemberships, []);
  }

  getUserChannelMemberships(userId: number): UserChannelMembership[] {
    return this.getChannelMemberships().filter(membership => membership.userId === userId);
  }

  joinChannel(userId: number, channelId: number): boolean {
    const memberships = this.getChannelMemberships();
    
    // Check if already a member
    const existingMembership = memberships.find(m => 
      m.userId === userId && m.channelId === channelId
    );
    
    if (!existingMembership) {
      const newMembership: UserChannelMembership = {
        userId,
        channelId,
        joinedAt: new Date()
      };
      
      memberships.push(newMembership);
      this.saveToStorage(this.STORAGE_KEYS.channelMemberships, memberships);
      return true;
    }
    return false;
  }

  leaveChannel(userId: number, channelId: number): boolean {
    const memberships = this.getChannelMemberships();
    const filteredMemberships = memberships.filter(m => 
      !(m.userId === userId && m.channelId === channelId)
    );
    
    if (filteredMemberships.length < memberships.length) {
      this.saveToStorage(this.STORAGE_KEYS.channelMemberships, filteredMemberships);
      return true;
    }
    return false;
  }

  getUserJoinedChannels(userId: number): Channel[] {
    const memberships = this.getUserChannelMemberships(userId);
    const channels = this.getChannels();
    
    return channels.filter(channel => 
      memberships.some(m => m.channelId === channel.id)
    );
  }
}