import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User, Group, Channel, Message, JoinRequest } from '../model/model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  base = 'http://localhost:3000/api';
  constructor(private http: HttpClient) {}

  // Auth
  login(payload: { username: string; password: string }) {
    return this.http.post<{ user: User }>(`${this.base}/auth/login`, payload);
  }

  // Users
  getUsers() {
    return this.http.get<{ users: User[] }>(`${this.base}/users`);
  }

  addUser(payload: { username: string; email: string; password: string; role: string }) {
    return this.http.post<{ user: User }>(`${this.base}/users`, payload);
  }

  deleteUser(userId: string) {
    return this.http.delete<{ message: string }>(`${this.base}/users/${userId}`);
  }

  // Groups
  getGroup(groupId: string) {
    return this.http.get<{ group: Group }>(`${this.base}/groups/${groupId}`);
  }

  getGroups() {
    return this.http.get<{ groups: Group[] }>(`${this.base}/groups`);
  }

  createGroup(payload: { name: string; ownerUsername: string }) {
    return this.http.post<{ group: Group }>(`${this.base}/groups`, payload);
  }

  deleteGroup(groupId: string) {
    return this.http.delete<{ message: string }>(`${this.base}/groups/${groupId}`);
  }

  addUserToGroup(groupId: string, username: string) {
    return this.http.post<{ message: string }>(`${this.base}/groups/${groupId}/members`, { username });
  }

  removeUserFromGroup(groupId: string, username: string) {
    return this.http.delete<{ message: string }>(`${this.base}/groups/${groupId}/members/${username}`);
  }

  promoteToGroupAdmin(groupId: string, username: string) {
    return this.http.post<{ message: string }>(`${this.base}/groups/${groupId}/admins`, { username });
  }

  demoteFromGroupAdmin(groupId: string, username: string) {
    return this.http.delete<{ message: string }>(`${this.base}/groups/${groupId}/admins/${username}`);
  }

  // Channels
  addChannelToGroup(groupId: string, channelName: string) {
    return this.http.post<{ channel: Channel }>(`${this.base}/groups/${groupId}/channels`, { name: channelName });
  }

  removeChannelFromGroup(groupId: string, channelId: string) {
    return this.http.delete<{ message: string }>(`${this.base}/groups/${groupId}/channels/${channelId}`);
  }

  addUserToChannel(groupId: string, channelId: string, username: string) {
    return this.http.post<{ message: string }>(`${this.base}/groups/${groupId}/channels/${channelId}/members`, { username });
  }

  removeUserFromChannel(groupId: string, channelId: string, username: string) {
    return this.http.delete<{ message: string }>(`${this.base}/groups/${groupId}/channels/${channelId}/members/${username}`);
  }

  getChannelMessages(groupId: string, channelId: string, limit: number = 20) {
    return this.http.get<{ messages: Message[] }>(`${this.base}/groups/${groupId}/channels/${channelId}/messages?limit=${limit}`);
  }

  // Join Requests
  getJoinRequests() {
    return this.http.get<{ joinRequests: JoinRequest[] }>(`${this.base}/join-requests`);
  }

  requestJoinGroup(groupId: string, username: string) {
    return this.http.post<{ request: JoinRequest }>(`${this.base}/groups/${groupId}/requests`, { username });
  }

  approveJoinRequest(requestId: string) {
    return this.http.post<{ message: string }>(`${this.base}/join-requests/${requestId}/approve`, {});
  }

  rejectJoinRequest(requestId: string) {
    return this.http.post<{ message: string }>(`${this.base}/join-requests/${requestId}/reject`, {});
  }

  // Promote user to Super Admin
  promoteToSuperAdmin(userId: string) {
    return this.http.post<{ message: string }>(`${this.base}/users/${userId}/promote-super-admin`, {});
  }

  // Upload an image for message
  uploadMessageImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<{ imageUrl: string }>(`${this.base}/upload/message-image`, formData);
  }

  // Upload an avatar image
  uploadAvatar(userId: string, file: File) {
  const formData = new FormData();
  formData.append('avatar', file);
  return this.http.post<{ avatarUrl: string }>(`${this.base}/users/${userId}/avatar`, formData);
}
}

