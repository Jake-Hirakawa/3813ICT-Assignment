import { Injectable } from '@angular/core';

interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  roles: string[];
  groups: number[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser: User | null = null;

  // Hardcoded users for testing
  private users: User[] = [
    {
      id: 1,
      username: 'super',
      email: 'super@admin.com',
      password: '123',
      roles: ['super-admin'],
      groups: []
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

  constructor() {
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser);
    }
  }

  login(username: string, password: string): boolean {
    // Find user with matching credentials
    const user = this.users.find(u => 
      u.username === username && u.password === password
    );

    if (user) {
      this.currentUser = user;
      // Save to localStorage for persistence
      localStorage.setItem('currentUser', JSON.stringify(user));
      return true;
    }

    return false;
  }

  logout(): void {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isLoggedIn(): boolean {
    return this.currentUser !== null;
  }

  hasRole(role: string): boolean {
    return this.currentUser?.roles.includes(role) || false;
  }

  isSuperAdmin(): boolean {
    return this.hasRole('super-admin');
  }

  isGroupAdmin(): boolean {
    return this.hasRole('group-admin');
  }

  isUser(): boolean {
    return this.hasRole('user');
  }
}