
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})

export class LoginComponent {
  username = '';
  password = '';
  errorMessage = '';

  constructor(private router: Router, private authService: AuthService) {}

  onLogin() {
    // Clear previous error message
    this.errorMessage = '';

    // Attempt login
    const loginSuccess = this.authService.login(this.username, this.password);
    
    if (loginSuccess) {
      // Navigate to dashboard on successful login
      this.router.navigate(['/dashboard']);
    } else {
      this.errorMessage = 'Invalid username or password';
      // Clear the password field
      this.password = '';
    }
  }
}