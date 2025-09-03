import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { User, Group, Channel, JoinRequest } from '../../model/model';

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
  joinRequests: JoinRequest[] = [];
  
  // Form models
  newUser = { username: '', email: '', password: '', role: 'User' };
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
    this.loadJoinRequests();
  }

  // Permission checks
  isSuperAdmin(): boolean {
    return this.currentUser?.roles?.includes('Super Admin') || false;
  }

  isGroupAdmin(): boolean {
    return this.currentUser?.roles?.includes('Group Admin') || false;
  }

  canAdminGroup(group: Group): boolean {
    if (this.isSuperAdmin()) return true;
    if (this.isGroupAdmin()) {
      return group.ownerUsername?.toLowerCase() === this.currentUser?.username.toLowerCase() ||
             group.admins?.some(admin => admin.toLowerCase() === this.currentUser?.username.toLowerCase());
    }
    return false;
  }

  getCurrentUserRole(): string {
    if (this.isSuperAdmin()) return 'Super Admin';
    if (this.isGroupAdmin()) return 'Group Admin';
    return 'User';
  }

  // User membership checks
  isUserInGroup(group: Group): boolean {
    return group.members?.some(member => 
      member.toLowerCase() === this.currentUser?.username.toLowerCase()
    ) || false;
  }

  isUserInChannel(group: Group, channel: Channel): boolean {
    return channel.members?.some(member =>
      member.toLowerCase() === this.currentUser?.username.toLowerCase()
    ) || false;
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

  loadJoinRequests() {
    this.apiService.getJoinRequests().subscribe({
      next: (response) => {
        this.joinRequests = response.joinRequests || [];
      },
      error: (error) => {
        console.log('Failed to load join requests - endpoint might not exist yet');
        this.joinRequests = [];
      }
    });
  }

  // Base User Actions - Group Management
  requestJoinGroup(group: Group) {
    if (!this.currentUser) return;
    
    this.apiService.requestJoinGroup(group.id, this.currentUser.username).subscribe({
      next: () => {
        this.showMessage(`Join request sent for ${group.name}`, 'success');
        this.loadJoinRequests();
      },
      error: (error) => {
        this.showMessage(error.error?.error || 'Failed to send join request', 'error');
      }
    });
  }

  joinGroupDirectly(group: Group) {
    if (!this.currentUser) return;
    
    this.apiService.addUserToGroup(group.id, this.currentUser.username).subscribe({
      next: () => {
        this.showMessage(`Joined ${group.name} successfully`, 'success');
        this.loadGroups();
      },
      error: (error) => {
        this.showMessage(error.error?.error || 'Failed to join group', 'error');
      }
    });
  }

  leaveGroup(group: Group) {
    if (!this.currentUser) return;
    
    if (confirm(`Are you sure you want to leave ${group.name}?`)) {
      this.apiService.removeUserFromGroup(group.id, this.currentUser.username).subscribe({
        next: () => {
          this.showMessage(`Left ${group.name} successfully`, 'success');
          this.loadGroups();
        },
        error: (error) => {
          this.showMessage(error.error?.error || 'Failed to leave group', 'error');
        }
      });
    }
  }

  // Base User Actions - Channel Management
  joinChannel(group: Group, channel: Channel) {
    if (!this.currentUser) return;
    
    this.apiService.addUserToChannel(group.id, channel.id, this.currentUser.username).subscribe({
      next: () => {
        this.showMessage(`Joined #${channel.name} successfully`, 'success');
        this.loadGroups();
      },
      error: (error) => {
        this.showMessage(error.error?.error || 'Failed to join channel', 'error');
      }
    });
  }

  leaveChannel(group: Group, channel: Channel) {
    if (!this.currentUser) return;
    
    if (confirm(`Leave channel #${channel.name}?`)) {
      this.apiService.removeUserFromChannel(group.id, channel.id, this.currentUser.username).subscribe({
        next: () => {
          this.showMessage(`Left #${channel.name} successfully`, 'success');
          this.loadGroups();
        },
        error: (error) => {
          this.showMessage(error.error?.error || 'Failed to leave channel', 'error');
        }
      });
    }
  }

  // User management
  createUser() {
    if (!this.newUser.username.trim() || !this.newUser.email.trim()) {
      this.showMessage('Username and email are required', 'error');
      return;
    }

    const userPayload = {
      username: this.newUser.username,
      email: this.newUser.email,
      password: this.newUser.password,
      role: this.newUser.role
    };

    this.apiService.addUser(userPayload).subscribe({
      next: (response) => {
        this.showMessage('User created successfully', 'success');
        this.loadUsers();
        this.newUser = { username: '', email: '', password: '', role: 'User' };
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
          this.loadGroups();
        },
        error: (error) => {
          this.showMessage(error.error?.error || 'Failed to delete user', 'error');
        }
      });
    }
  }

  deleteOwnAccount() {
    if (!this.currentUser) return;
    
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      this.apiService.deleteUser(this.currentUser.id).subscribe({
        next: () => {
          this.showMessage('Account deleted successfully', 'success');
          this.authService.logout();
          this.router.navigate(['/login']);
        },
        error: (error) => {
          this.showMessage(error.error?.error || 'Failed to delete account', 'error');
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

  // Promote user to group admin for this specific group
  promoteToGroupAdmin(group: Group, username: string) {
    if (!this.canAdminGroup(group)) {
      this.showMessage('You can only promote users in groups you created', 'error');
      return;
    }

    if (confirm(`Promote ${username} to admin of ${group.name}?`)) {
      this.apiService.promoteToGroupAdmin(group.id, username).subscribe({
        next: () => {
          this.showMessage(`${username} promoted to group admin successfully`, 'success');
          this.loadGroups();
        },
        error: (error) => {
          this.showMessage(error.error?.error || 'Failed to promote user', 'error');
        }
      });
    }
  }

  // Demote user from group admin for this specific group  
  demoteFromGroupAdmin(group: Group, username: string) {
    if (!this.canAdminGroup(group)) {
      this.showMessage('You can only demote users in groups you created', 'error');
      return;
    }

    if (confirm(`Remove ${username} as admin of ${group.name}?`)) {
      this.apiService.demoteFromGroupAdmin(group.id, username).subscribe({
        next: () => {
          this.showMessage(`${username} removed as group admin successfully`, 'success');
          this.loadGroups();
        },
        error: (error) => {
          this.showMessage(error.error?.error || 'Failed to demote user', 'error');
        }
      });
    }
  }

  // Check if user is admin of this specific group
  isUserAdminOfGroup(group: Group, username: string): boolean {
    return group.admins?.some(admin => 
      admin.toLowerCase() === username.toLowerCase()
    ) || false;
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

  // Join Request Management
  getPendingRequestsForGroup(group: Group): JoinRequest[] {
    return this.joinRequests.filter(req => 
      req.gid === group.id && req.status === 'pending'
    );
  }

  approveJoinRequest(request: JoinRequest) {
    this.apiService.approveJoinRequest(request.id).subscribe({
      next: () => {
        this.showMessage('Join request approved', 'success');
        this.loadJoinRequests();
        this.loadGroups();
      },
      error: (error) => {
        this.showMessage(error.error?.error || 'Failed to approve request', 'error');
      }
    });
  }

  rejectJoinRequest(request: JoinRequest) {
    this.apiService.rejectJoinRequest(request.id).subscribe({
      next: () => {
        this.showMessage('Join request rejected', 'success');
        this.loadJoinRequests();
      },
      error: (error) => {
        this.showMessage(error.error?.error || 'Failed to reject request', 'error');
      }
    });
  }

    // Promote user to Super Admin (only functionality needed)
  promoteToSuperAdmin(user: any) {
    if (!this.isSuperAdmin()) {
      this.showMessage('Only Super Admins can promote users', 'error');
      return;
    }

    if (user.roles?.includes('Super Admin')) {
      this.showMessage('User is already a Super Admin', 'error');
      return;
    }

    if (confirm(`Promote ${user.username} to Super Admin? This will give them full system access.`)) {
      this.apiService.promoteToSuperAdmin(user.id).subscribe({
        next: () => {
          this.showMessage(`${user.username} promoted to Super Admin successfully`, 'success');
          this.loadUsers();
        },
        error: (error) => {
          this.showMessage(error.error?.error || 'Failed to promote user to Super Admin', 'error');
        }
      });
    }
  }

  // Helper method to check if promotion is available
  canPromoteToSuperAdmin(user: any): boolean {
    return this.isSuperAdmin() && !user.roles?.includes('Super Admin');
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