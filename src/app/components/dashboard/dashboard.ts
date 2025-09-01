import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';
import { User, Group, Channel } from '../../data/model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  users: User[] = [];
  groups: Group[] = [];
  channels: Channel[] = [];
  userGroups: Group[] = [];

  constructor(
    private authService: AuthService, 
    private router: Router,
    private dataService: DataService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    // Load all data from DataService
    this.users = this.dataService.getUsers();
    this.groups = this.dataService.getGroups();
    this.channels = this.dataService.getChannels();
    
    // Load current user's groups
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.userGroups = this.dataService.getUserGroups(currentUser.id);
    }
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get isSuperAdmin() {
    return this.authService.isSuperAdmin();
  }

  get isGroupAdmin() {
    return this.authService.isGroupAdmin();
  }

  get isRegularUser() {
    return this.authService.isUser() && !this.authService.isGroupAdmin() && !this.authService.isSuperAdmin();
  }

  // Helper methods for displaying data
  getUsernameById(userId: number): string {
    const user = this.dataService.getUserById(userId);
    return user?.username || 'Unknown User';
  }

  getChannelsForGroup(groupId: number): Channel[] {
    return this.dataService.getChannelsByGroupId(groupId);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}