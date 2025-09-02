import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { User, Group, Channel } from '../../model/model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  users: any[] = [];
  groups: Group[] = [];
  
  // Form models
  newUser = { username: '', email: '', password: '' };
  newGroup = { name: '' };
  
  // Selection models for dropdowns
  selectedUserForGroup: { [groupId: string]: string } = {};
  selectedUserForChannel: { [key: string]: string } = {};
  newChannelName: { [groupId: string]: string } = {};
  
  // UI state
  message = '';
  messageType: 'success' | 'error' = 'success';

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.loadUsers();
    this.loadGroups();
  }

  // Permission checks
  isSuperAdmin(): boolean {
    return this.currentUser?.roles?.includes('Super Admin') || false;
  }

  isGroupAdmin(): boolean {
    return this.currentUser?.roles?.includes('Group Admin') || false;
  }

  getCurrentUserRole(): string {
    if (this.isSuperAdmin()) return 'Super Admin';
    if (this.isGroupAdmin()) return 'Group Admin';
    return 'User';
  }

  // Data loading
  loadUsers() {
    this.apiService.getUsers().subscribe({
      next: (response) => {
        this.users = response.users;
      },
      error: (error) => {
        this.showMessage('Failed to load users', 'error');
      }
    });
  }

  loadGroups() {
    this.apiService.getGroups().subscribe({
      next: (response) => {
        this.groups = response.groups;
      },
      error: (error) => {
        this.showMessage('Failed to load groups', 'error');
      }
    });
  }

  // User management
  createUser() {
    if (!this.newUser.username.trim() || !this.newUser.email.trim()) {
      this.showMessage('Username and email are required', 'error');
      return;
    }

    this.apiService.addUser(this.newUser).subscribe({
      next: (response) => {
        this.showMessage('User created successfully', 'success');
        this.loadUsers();
        this.newUser = { username: '', email: '', password: '' };
      },
      error: (error) => {
        this.showMessage(error.error?.error || 'Failed to create user', 'error');
      }
    });
  }

  deleteUser(user: any) {
    if (confirm(`Are you sure you want to delete user ${user.username}?`)) {
      this.apiService.deleteUser(user.id).subscribe({
        next: () => {
          this.showMessage('User deleted successfully', 'success');
          this.loadUsers();
          this.loadGroups(); // Refresh groups as user might have been removed from them
        },
        error: (error) => {
          this.showMessage(error.error?.error || 'Failed to delete user', 'error');
        }
      });
    }
  }

  // Group management
  createGroup() {
    if (!this.newGroup.name.trim()) {
      this.showMessage('Group name is required', 'error');
      return;
    }

    const payload = {
      name: this.newGroup.name,
      ownerUsername: this.currentUser!.username
    };

    this.apiService.createGroup(payload).subscribe({
      next: (response) => {
        this.showMessage('Group created successfully', 'success');
        this.loadGroups();
        this.newGroup = { name: '' };
      },
      error: (error) => {
        this.showMessage(error.error?.error || 'Failed to create group', 'error');
      }
    });
  }

  deleteGroup(group: Group) {
    if (confirm(`Are you sure you want to delete group ${group.name}?`)) {
      this.apiService.deleteGroup(group.id).subscribe({
        next: () => {
          this.showMessage('Group deleted successfully', 'success');
          this.loadGroups();
        },
        error: (error) => {
          this.showMessage(error.error?.error || 'Failed to delete group', 'error');
        }
      });
    }
  }

  addUserToGroup(group: Group, username: string) {
    if (!username) return;

    this.apiService.addUserToGroup(group.id, username).subscribe({
      next: () => {
        this.showMessage('User added to group successfully', 'success');
        this.loadGroups();
        this.selectedUserForGroup[group.id] = '';
      },
      error: (error) => {
        this.showMessage(error.error?.error || 'Failed to add user to group', 'error');
      }
    });
  }

  removeUserFromGroup(group: Group, username: string) {
    if (confirm(`Remove ${username} from ${group.name}?`)) {
      this.apiService.removeUserFromGroup(group.id, username).subscribe({
        next: () => {
          this.showMessage('User removed from group successfully', 'success');
          this.loadGroups();
        },
        error: (error) => {
          this.showMessage(error.error?.error || 'Failed to remove user from group', 'error');
        }
      });
    }
  }

  // Channel management
  addChannelToGroup(group: Group, channelName: string) {
    if (!channelName?.trim()) return;

    this.apiService.addChannelToGroup(group.id, channelName).subscribe({
      next: () => {
        this.showMessage('Channel added successfully', 'success');
        this.loadGroups();
        this.newChannelName[group.id] = '';
      },
      error: (error) => {
        this.showMessage(error.error?.error || 'Failed to add channel', 'error');
      }
    });
  }

  removeChannelFromGroup(group: Group, channel: Channel) {
    if (confirm(`Delete channel #${channel.name}?`)) {
      this.apiService.removeChannelFromGroup(group.id, channel.id).subscribe({
        next: () => {
          this.showMessage('Channel deleted successfully', 'success');
          this.loadGroups();
        },
        error: (error) => {
          this.showMessage(error.error?.error || 'Failed to delete channel', 'error');
        }
      });
    }
  }

  addUserToChannel(group: Group, channel: Channel, username: string) {
    if (!username) return;

    this.apiService.addUserToChannel(group.id, channel.id, username).subscribe({
      next: () => {
        this.showMessage('User added to channel successfully', 'success');
        this.loadGroups();
        this.selectedUserForChannel[group.id + '_' + channel.id] = '';
      },
      error: (error) => {
        this.showMessage(error.error?.error || 'Failed to add user to channel', 'error');
      }
    });
  }

  removeUserFromChannel(group: Group, channel: Channel, username: string) {
    if (confirm(`Remove ${username} from #${channel.name}?`)) {
      this.apiService.removeUserFromChannel(group.id, channel.id, username).subscribe({
        next: () => {
          this.showMessage('User removed from channel successfully', 'success');
          this.loadGroups();
        },
        error: (error) => {
          this.showMessage(error.error?.error || 'Failed to remove user from channel', 'error');
        }
      });
    }
  }

  // Helper methods for dropdowns
  getAvailableUsersForGroup(group: Group): any[] {
    return this.users.filter(user => 
      !group.members?.some(member => 
        member.toLowerCase() === user.username.toLowerCase()
      )
    );
  }

  getAvailableUsersForChannel(group: Group, channel: Channel): string[] {
    return group.members?.filter(member => 
      !channel.members?.some(channelMember => 
        channelMember.toLowerCase() === member.toLowerCase()
      )
    ) || [];
  }

  // Regular user functionality
  getUserGroups(): Group[] {
    if (!this.currentUser) return [];
    return this.groups.filter(group => 
      group.members?.some(member => 
        member.toLowerCase() === this.currentUser!.username.toLowerCase()
      )
    );
  }

  getUserChannelsInGroup(group: Group): Channel[] {
    if (!this.currentUser) return [];
    return group.channels?.filter(channel =>
      channel.members?.some(member =>
        member.toLowerCase() === this.currentUser!.username.toLowerCase()
      )
    ) || [];
  }

  // Utility methods
  showMessage(text: string, type: 'success' | 'error') {
    this.message = text;
    this.messageType = type;
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}