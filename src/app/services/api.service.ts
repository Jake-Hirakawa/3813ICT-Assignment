import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  base = 'http://localhost:3000/api';
  constructor(private http: HttpClient) {}

  // Auth
  login(payload: { username: string; password: string }) {
    return this.http.post<{ user: any }>(`${this.base}/auth/login`, payload);
  }

  // Users
  getUsers() {
    return this.http.get<{ users: any[] }>(`${this.base}/users`);
  }

  addUser(payload: { username: string; email: string; password?: string }) {
    return this.http.post<{ user: any }>(`${this.base}/users`, payload);
  }

  deleteUser(userId: string) {
    return this.http.delete<{ message: string }>(`${this.base}/users/${userId}`);
  }

  // Groups
  getGroups() {
    return this.http.get<{ groups: any[] }>(`${this.base}/groups`);
  }

  createGroup(payload: { name: string; ownerUsername: string }) {
    return this.http.post<{ group: any }>(`${this.base}/groups`, payload);
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

  // Channels
  addChannelToGroup(groupId: string, channelName: string) {
    return this.http.post<{ channel: any }>(`${this.base}/groups/${groupId}/channels`, { name: channelName });
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
}