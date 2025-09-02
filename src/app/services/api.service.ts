import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ApiService {
  base = 'http://localhost:3000/api';
  constructor(private http: HttpClient) {}

  // Login → takes a payload object instead of separate params
  login(payload: { username: string; password: string }) {
    return this.http.post<{ user: any }>(`${this.base}/auth/login`, payload);
  }

  // Get all users → returns loosely typed { users: any[] }
  getUsers() {
    return this.http.get<{ users: any[] }>(`${this.base}/users`);
  }

  // Get all groups
  getGroups() {
    return this.http.get<{ groups: any[] }>(`${this.base}/groups`);
  }

  // Create user → takes payload object
  addUser(payload: { username: string; email: string }) {
    return this.http.post<{ user: any }>(`${this.base}/users`, payload);
  }
}
