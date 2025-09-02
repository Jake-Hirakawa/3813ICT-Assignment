import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import { User, UserRole } from '../model/model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser: User | null = null;

  constructor(private dataService: DataService) {
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      // Verify user still exists in data service
      const user = this.dataService.getUserById(userData.id);
      if (user) {
        this.currentUser = user;
      } else {
        localStorage.removeItem('currentUser');
      }
    }
  }

  login(username: string, password: string): boolean {
    // Find user with matching credentials
    const user = this.dataService.getUserByUsername(username);

    if (user && user.password === password) {
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

  hasRole(role: UserRole): boolean {
    return this.currentUser?.roles.includes(role) || false;
  }

  isSuperAdmin(): boolean {
    return this.hasRole('super-admin');
  }

  isGroupAdmin(): boolean {
    return this.hasRole('group-admin') || this.hasRole('super-admin');
  }

  isUser(): boolean {
    return this.hasRole('user') || this.hasRole('group-admin') || this.hasRole('super-admin');
  }

  canManageUser(userId: number): boolean {
    if (this.isSuperAdmin()) return true;
    if (this.currentUser?.id === userId) return true;
    return false;
  }

  canManageGroup(groupId: number): boolean {
    if (this.isSuperAdmin()) return true;
    const group = this.dataService.getGroupById(groupId);
    return group?.createdBy === this.currentUser?.id;
  }
}