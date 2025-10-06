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

  // Component initialization
  // Validates user authentication, redirects to login if not authenticated
  // Loads all users, groups, and join requests
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

  // Load all users from API
  // Updates users array with response
  // Shows error message on failure
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

  // Load all groups from API
  // Updates groups array with response
  // Shows error message on failure
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

  // Load all join requests from API
  // Updates joinRequests array with response
  // Handles missing endpoint gracefully (logs but doesn't show error)
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

  // Check if current user is Super Admin
  // Returns true if user has 'Super Admin' role
  isSuperAdmin(): boolean {
    return this.currentUser?.roles?.includes('Super Admin') || false;
  }

  // Check if current user is Group Admin
  // Returns true if user has 'Group Admin' role
  isGroupAdmin(): boolean {
    return this.currentUser?.roles?.includes('Group Admin') || false;
  }

  // Check if user can administer specific group
  // Super Admins can administer all groups
  // Group Admins can only administer groups they own or are admins of
  canAdminGroup(group: Group): boolean {
    if (this.isSuperAdmin()) return true;
    if (this.isGroupAdmin()) {
      return group.ownerUsername?.toLowerCase() === this.currentUser?.username.toLowerCase() ||
             group.admins?.some(admin => admin.toLowerCase() === this.currentUser?.username.toLowerCase());
    }
    return false;
  }

  // Get display name for current user's role
  // Returns highest privilege role: Super Admin > Group Admin > User
  getCurrentUserRole(): string {
    if (this.isSuperAdmin()) return 'Super Admin';
    if (this.isGroupAdmin()) return 'Group Admin';
    return 'User';
  }

  // Trigger hidden file input for avatar upload
  // Programmatically clicks file input element
  triggerMyAvatarInput(): void {
    const input = document.getElementById('myAvatarInput') as HTMLInputElement;
    if (input) input.click();
  }

  // Handle avatar file selection and upload
  // Validates file is an image
  // Uploads avatar via API for current user
  // Updates user's avatarUrl in localStorage
  // Shows success/error message
  onMyAvatarSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      if (!this.currentUser?.id) return;
      
      this.apiService.uploadAvatar(this.currentUser.id, file).subscribe({
        next: (response) => {
          this.showMessage('Avatar updated successfully', 'success');
          
          // Update current user in localStorage
          if (this.currentUser) {
            this.currentUser.avatarUrl = response.avatarUrl;
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
          }
        },
        error: (error) => {
          this.showMessage('Failed to upload avatar', 'error');
        }
      });
    } else {
      this.showMessage('Please select a valid image file', 'error');
    }
  }

  // Check if current user is member of a group
  // Case-insensitive username comparison
  isUserInGroup(group: Group): boolean {
    return group.members?.some(member => 
      member.toLowerCase() === this.currentUser?.username.toLowerCase()
    ) || false;
  }

  // Check if current user is member of a channel
  // Case-insensitive username comparison
  isUserInChannel(group: Group, channel: Channel): boolean {
    return channel.members?.some(member =>
      member.toLowerCase() === this.currentUser?.username.toLowerCase()
    ) || false;
  }

  // Request to join a group (creates pending join request)
  // Regular users use this to request group membership
  // Creates join request for group admin approval
  // Reloads join requests after submission
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

  // Join group directly (bypasses join request)
  // Used by admins or in special circumstances
  // Adds user to group immediately
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

  // Leave a group
  // Removes current user from group membership
  // Shows confirmation dialog before leaving
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

  // Join a channel
  // Adds current user to channel membership
  // User must be group member first (validated server-side)
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

  // Leave a channel
  // Removes current user from channel membership
  // Shows confirmation dialog before leaving
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


  // Navigate to chat interface
  // Routes to chat component with groupId and channelId parameters
  navigateToChat(group: Group, channel: Channel) {
    this.router.navigate(['/chat', group.id, channel.id]);
  }

  // Create new user (Super Admin only)
  // Validates username and email are provided
  // Includes role selection (User, Group Admin)
  // Clears form after successful creation
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

  // Delete user (Super Admin only)
  // Shows confirmation dialog
  // Removes user from all groups and channels
  // Reloads users and groups after deletion
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

  // Delete own account (any user)
  // Shows confirmation with warning about permanence
  // Logs out and redirects to login after deletion
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

  // Create new group (Group Admin or Super Admin)
  // Validates group name is provided
  // Sets current user as owner
  // Clears form after creation
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

  // Delete group (group owner or Super Admin)
  // Shows confirmation dialog
  // Removes group and all related data
  // Reloads groups after deletion
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

  // Add user to group (group admin function)
  // Adds selected user to group membership
  // Clears dropdown selection after addition
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

  // Remove user from group (group admin function)
  // Shows confirmation dialog
  // Removes user from group membership and admin list
  // Reloads groups after removal
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

  // Promote user to group admin for specific group
  // Validates current user can administer the group
  // Adds 'Group Admin' role to user if not present
  // Adds user to group's admins array
  // Shows confirmation dialog
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

  // Demote user from group admin for specific group
  // Validates current user can administer the group
  // Removes user from group's admins array
  // Does not remove global 'Group Admin' role
  // Shows confirmation dialog
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

  // Check if user is admin of specific group
  // Case-insensitive check against group's admins array
  isUserAdminOfGroup(group: Group, username: string): boolean {
    return group.admins?.some(admin => 
      admin.toLowerCase() === username.toLowerCase()
    ) || false;
  }


  // Add channel to group (group admin function)
  // Validates channel name is provided
  // Creates channel with empty members array
  // Clears input after creation
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

  // Remove channel from group (group admin function)
  // Shows confirmation dialog
  // Deletes channel and all associated messages
  // Reloads groups after deletion
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

  // Check if user has pending join request for group
  // Returns true if pending request exists for current user
  isUserPendingForGroup(group: Group): boolean {
    return this.joinRequests.some(
      req =>
        req.gid === group.id &&
        req.username.toLowerCase() === this.currentUser?.username.toLowerCase() &&
        req.status === 'pending'
    );
  }

  // Get all pending join requests for a group
  // Filters requests by groupId and 'pending' status
  // Used to display pending requests to group admins
  getPendingRequestsForGroup(group: Group): JoinRequest[] {
    return this.joinRequests.filter(req => 
      req.gid === group.id && req.status === 'pending'
    );
  }

  // Approve join request
  // Adds user to group membership
  // Updates request status to 'approved'
  // Reloads join requests and groups
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

  // Reject join request
  // Updates request status to 'rejected'
  // Does not add user to group
  // Reloads join requests
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

  // Promote user to Super Admin (Super Admin only)
  // Validates current user is Super Admin
  // Checks user doesn't already have Super Admin role
  // Shows confirmation with warning about full system access
  // Adds 'Super Admin' to user's roles
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

  // Get users not in group
  // Filters users array to exclude current group members
  // Used for "Add User" dropdown
  canPromoteToSuperAdmin(user: any): boolean {
    return this.isSuperAdmin() && !user.roles?.includes('Super Admin');
  }

  // Get users not in group
  // Filters users array to exclude current group members
  // Used for "Add User" dropdown
  getAvailableUsersForGroup(group: Group): any[] {
    return this.users.filter(user => 
      !group.members?.some(member => 
        member.toLowerCase() === user.username.toLowerCase()
      )
    );
  }

  // Get group members not in channel
  // Filters group members to exclude current channel members
  // Used for "Add to Channel" dropdown
  getAvailableUsersForChannel(group: Group, channel: Channel): string[] {
    return group.members?.filter(member => 
      !channel.members?.some(channelMember => 
        channelMember.toLowerCase() === member.toLowerCase()
      )
    ) || [];
  }

  // Show temporary notification message
  // Displays message with success/error styling
  // Auto-hides after 5 seconds
  showMessage(text: string, type: 'success' | 'error') {
    this.message = text;
    this.messageType = type;
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }

  // Logout current user
  // Clears authentication and redirects to login
  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}