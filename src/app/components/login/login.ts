import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  constructor(private router: Router, private authService: AuthService) {}

  // Component initialization
  // Checks if user is already authenticated
  // Redirects to dashboard if already logged in
  // Prevents re-login when session exists
  ngOnInit() {
    // If user is already logged in, redirect to dashboard
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  // Handle login form submission
  // Clears previous error messages
  // Sets loading state to disable form during request
  // Validates both username and password are provided
  // Calls AuthService.login() with credentials
  // On success: logs success message and navigates to dashboard
  // On failure: displays appropriate error message based on status code
  // Clears password field on any error for security
  // Resets loading state after completion
  // Logs attempt and errors to console for debugging
  onLogin() {
    // Clear previous errors and set loading state
    this.errorMessage = '';
    this.isLoading = true;

    // Validate input
    if (!this.username.trim() || !this.password.trim()) {
      this.errorMessage = 'Please enter both username and password';
      this.isLoading = false;
      return;
    }

    console.log('Attempting login for:', this.username);

    // Call the server login
    this.authService.login(this.username, this.password).subscribe({
      next: (success) => {
        this.isLoading = false;
        
        if (success) {
          console.log('Login successful, redirecting...');
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = 'Invalid username or password';
          this.password = ''; // Clear password field
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Login error:', error);
        
        if (error.status === 401) {
          this.errorMessage = 'Invalid username or password';
        } else if (error.status === 0) {
          this.errorMessage = 'Cannot connect to server. Please make sure the server is running on http://localhost:3000';
        } else {
          this.errorMessage = 'Login failed. Please try again.';
        }
        
        this.password = ''; // Clear password field
      }
    });
  }
}