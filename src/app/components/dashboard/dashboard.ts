import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  groups: any[] = [];

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.apiService.getGroups().subscribe({
      next: (result) => {
        this.groups = result.groups;
      },
      error: (err) => {
        console.error('Failed to load groups:', err);
      }
    });
  }

  logout(){
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}