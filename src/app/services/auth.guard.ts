import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(private authService: AuthService, private router: Router) {}

  // Route activation guard
  // Called before activating a protected route
  // Returns true if user is authenticated (allows navigation)
  // Returns false if user is not authenticated (blocks navigation)
  // Redirects unauthenticated users to login page
  // Used in route configuration to protect dashboard and other secure routes
  canActivate(): boolean {
    if (this.authService.isLoggedIn()) {
      return true;
    } else {
      this.router.navigate(['/login']);
      return false;
    }
  }
}