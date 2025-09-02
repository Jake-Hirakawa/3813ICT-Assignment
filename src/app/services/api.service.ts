import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../data/model';

export interface LoginResponse {
  user?: User;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // Login method
  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, {
      username,
      password
    });
  }

  // Get all users
  getUsers(): Observable<{users: User[]}> {
    return this.http.get<{users: User[]}>(`${this.baseUrl}/users`);
  }
  
  // Get all groups
  getGroups(): Observable<{groups: any[]}> {
    return this.http.get<{groups: any[]}>(`${this.baseUrl}/groups`);
  }

  // Create user
  createUser(username: string, email: string): Observable<{user: User}> {
    return this.http.post<{user: User}>(`${this.baseUrl}/createuser`, {
      username,
      email
    });
  }
}