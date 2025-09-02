import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { User } from '../data/model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private apiService: ApiService) {}

  // Login: calls server, saves user if successful
  login(username: string, password: string): Observable<boolean> {
    return this.apiService.login(username, password).pipe(
      map(response => {
        if (response.user && !response.error) {
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          return true;
        } else {
          return false;
        }
      })
    );
  }

  // Logout: removes user from localStorage
  logout(): void {
    localStorage.removeItem('currentUser');
  }

  // Get current user from localStorage
  getCurrentUser(): User | null {
    const savedUser = localStorage.getItem('currentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  }

  // Is user logged in?
  isLoggedIn(): boolean {
    return this.getCurrentUser() !== null;
  }
}