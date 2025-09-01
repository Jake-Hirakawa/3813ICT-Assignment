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

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit() {
    // If user is already logged in, redirect to dashboard
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

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

  goToSignUp() {
    this.router.navigate(['/signup']);
  }
}
