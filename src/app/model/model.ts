// src/app/data/model.ts
export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  groups: string[];
  avatarUrl?: string;
}

export interface Group {
  id: string;
  name: string;
  ownerUsername: string;
  admins: string[];
  members: string[];
  channels: Channel[];
}

export interface Channel {
  id: string;
  name: string;
  members: string[];
}

export interface Message {
  id: string;
  channelId: string;
  username: string;
  content: string;
  timestamp: number;
  type?: 'message' | 'system' | 'image';
  imageUrl?: string;
}

export interface JoinRequest {
  id: string;
  gid: string;
  username: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}