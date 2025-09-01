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

    // User functionality - Join Groups
  requestJoinGroup(groupId: number) {
    if (this.currentUser) {
      const success = this.dataService.addUserToGroup(this.currentUser.id, groupId);
      if (success) {
        alert('Successfully joined the group!');
        this.loadData(); // Refresh data
      } else {
        alert('Unable to join group. You may already be a member.');
      }
    }
  }

  // User functionality - Leave Groups  
  leaveGroup(groupId: number) {
    if (confirm('Are you sure you want to leave this group?') && this.currentUser) {
      const success = this.dataService.removeUserFromGroup(this.currentUser.id, groupId);
      if (success) {
        alert('You have left the group.');
        this.loadData(); // Refresh data
      }
    }
  }

  // User functionality - Delete Self
  deleteSelf() {
    if (confirm('Are you sure you want to delete your account? This cannot be undone.') && this.currentUser) {
      const success = this.dataService.deleteUser(this.currentUser.id);
      if (success) {
        alert('Your account has been deleted.');
        this.authService.logout();
        this.router.navigate(['/login']);
      }
    }
  }

  // Helper method to check if user is member of a group
  isUserMemberOfGroup(groupId: number): boolean {
    return this.userGroups.some(group => group.id === groupId);
  }
}