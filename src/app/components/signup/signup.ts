import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { CreateUser } from '../../data/model';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './signup.html',
  styleUrls: ['./signup.css']
})
export class SignUpComponent {
  username = '';
  email = '';
  password = '';
  errorMessage = '';
  successMessage = '';

  constructor(private router: Router, private dataService: DataService) {}

  onSignUp() {
    // Clear previous messages
    this.errorMessage = '';
    this.successMessage = '';

    // Validate username is unique
    if (this.dataService.getUserByUsername(this.username)) {
      this.errorMessage = 'Username already exists. Please choose a different username.';
      return;
    }

    // Create new user
    const newUserData: CreateUser = {
      username: this.username,
      email: this.email,
      password: this.password,
      roles: ['user'],  // New users start as regular users
      groups: []        // No groups initially
    };

    try {
      const newUser = this.dataService.createUser(newUserData);
      this.successMessage = `Account created successfully! You can now login with username: ${newUser.username}`;
      
      // Clear form
      this.username = '';
      this.email = '';
      this.password = '';
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
      
    } catch (error) {
      this.errorMessage = 'Failed to create account. Please try again.';
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}