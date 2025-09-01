import { Injectable } from '@angular/core';
import { User, Group, Channel, CreateUser, CreateGroup, CreateChannel } from '../data/model';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private readonly STORAGE_KEYS = {
    users: 'chat_users',
    groups: 'chat_groups', 
    channels: 'chat_channels',
    nextUserId: 'next_user_id',
    nextGroupId: 'next_group_id',
    nextChannelId: 'next_channel_id'
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
      this.saveToStorage(this.STORAGE_KEYS.nextUserId, 4);
      this.saveToStorage(this.STORAGE_KEYS.nextGroupId, 2);
      this.saveToStorage(this.STORAGE_KEYS.nextChannelId, 3);
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

  // Channel methods
  getChannels(): Channel[] {
    return this.getFromStorage<Channel[]>(this.STORAGE_KEYS.channels, []);
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

  // Utility methods
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
}