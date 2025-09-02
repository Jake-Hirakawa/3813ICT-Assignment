// User Model
export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  roles: UserRole[];
  groups: number[];
  avatar?: string;
  createdAt?: Date;
  lastLogin?: Date;
}

// User Role Types
export type UserRole = 'super-admin' | 'group-admin' | 'user';

// Group Model
export interface Group {
    id: number;
    name: string;
    description: string;
    adminId: number; // User ID of the group admin
    channels: number[]; // Array of Channel IDs
    members: number[]; // Array of User IDs
    createdBy: number; // User ID of the creator
    createdAt?: Date;
    updatedAt?: Date;
}

// Channel Model
export interface Channel {
  id: number;
  name: string;
  description: string;
  groupId: number;               // Parent group ID
  createdBy: number;             // ID of user who created the channel
  createdAt?: Date;
  messageCount?: number;         // Number of messages
}

// Message Model
export interface Message {
  id: number;
  content: string;
  senderId: number;              // ID of user who sent the message
  channelId: number;             // ID of channel message belongs to
  timestamp: Date;
  messageType: 'text' | 'image' | 'file';  
  edited?: boolean;
  editedAt?: Date;
}

// Group Join Request Model
export interface GroupJoinRequest {
  id: number;
  userId: number;                // User requesting to join
  groupId: number;               // Group they want to join
  status: 'pending' | 'approved' | 'denied';
  requestedAt: Date;
  respondedAt?: Date;
  respondedBy?: number;          // ID of admin who approved/denied
}

// User Channel Membership (for tracking which channels user has joined)
export interface UserChannelMembership {
  userId: number;
  channelId: number;
  joinedAt: Date;
  lastViewed?: Date;
}

// For creating new entities (without ID)
export type CreateUser = Omit<User, 'id' | 'createdAt' | 'lastLogin'>;
export type CreateGroup = Omit<Group, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateChannel = Omit<Channel, 'id' | 'createdAt' | 'messageCount'>;
export type CreateMessage = Omit<Message, 'id' | 'timestamp' | 'edited' | 'editedAt'>;
export type CreateGroupJoinRequest = Omit<GroupJoinRequest, 'id' | 'requestedAt' | 'respondedAt' | 'respondedBy'>;


// For updating entities (all fields optional except ID)
export type UpdateUser = Partial<User> & { id: number };
export type UpdateGroup = Partial<Group> & { id: number };
export type UpdateChannel = Partial<Channel> & { id: number };
export type UpdateGroupJoinRequest = Partial<GroupJoinRequest> & { id: number };
