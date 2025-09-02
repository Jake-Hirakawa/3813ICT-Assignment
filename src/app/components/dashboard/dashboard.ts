import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';
import { User, Group, Channel, GroupJoinRequest, UserRole } from '../../model/model';

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

//  ***User functionality***

// Request to join a group
requestJoinGroup(groupId: number) {
  if (this.currentUser) {
    try {
      const newRequest = this.dataService.createGroupJoinRequest({
        userId: this.currentUser.id,
        groupId: groupId,
        status: 'pending'
      });
      
      console.log('Join request created:', newRequest);
      alert('Join request sent! The group admin will review your request.');
      this.loadData(); // Refresh data
      
    } catch (error: any) {
      console.error('Error creating join request:', error);
      alert(error.message || 'Unable to send join request.');
    }
  }
}

// Leave Groups  
leaveGroup(groupId: number) {
  if (confirm('Are you sure you want to leave this group?') && this.currentUser) {
    const success = this.dataService.removeUserFromGroup(this.currentUser.id, groupId);
    if (success) {
      alert('You have left the group.');
      this.loadData(); // Refresh data
    }
  }
}

// Channel functionality - Join Channels
  joinChannel(channelId: number) {
    if (this.currentUser) {
      const success = this.dataService.joinChannel(this.currentUser.id, channelId);
      if (success) {
        alert('Successfully joined the channel!');
        this.loadData(); // Refresh data
      } else {
        alert('Unable to join channel. You may already be a member.');
      }
    }
  }

  // Channel functionality - Leave Channels  
  leaveChannel(channelId: number) {
    if (confirm('Are you sure you want to leave this channel?') && this.currentUser) {
      const success = this.dataService.leaveChannel(this.currentUser.id, channelId);
      if (success) {
        alert('You have left the channel.');
        this.loadData(); // Refresh data
      }
    }
  }

  // Delete Self
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

  // Helper method to get group name by ID
  getGroupNameById(groupId: number): string {
    const group = this.dataService.getGroupById(groupId);
    return group?.name || 'Unknown Group';
  }

  // Helper method to check if user has pending request for group
  hasPendingRequestForGroup(groupId: number): boolean {
    if (!this.currentUser) return false;
    const pendingRequests = this.dataService.getUserPendingRequests(this.currentUser.id);
    return pendingRequests.some(req => req.groupId === groupId);
  }
  
  // Helper method to check if user has joined a specific channel
  isUserMemberOfChannel(channelId: number): boolean {
    if (!this.currentUser) return false;
    const userChannels = this.dataService.getUserJoinedChannels(this.currentUser.id);
    return userChannels.some(channel => channel.id === channelId);
  }

  // Helper method to get channels user has joined
  getUserJoinedChannels() {
    if (!this.currentUser) return [];
    return this.dataService.getUserJoinedChannels(this.currentUser.id);
  }

  // ***Group Admin Functionality***

  // Create new group
  createNewGroup() {
    const groupName = prompt('Enter group name:');
    if (!groupName?.trim()) return;

    const groupDescription = prompt('Enter group description:');
    if (!groupDescription?.trim()) return;

    if (this.currentUser) {
      try {
        const newGroup = this.dataService.createGroup({
          name: groupName.trim(),
          description: groupDescription.trim(),
          adminId: this.currentUser.id,
          channels: [],
          members: [this.currentUser.id],
          createdBy: this.currentUser.id
        });
        
        alert(`Group "${newGroup.name}" has been created!`);
        this.loadData();
      } catch (error) {
        alert('Failed to create group. Please try again.');
      }
    }
  }

  // Create channel in group
  createChannelInGroup(groupId: number) {
    const channelName = prompt('Enter channel name:');
    if (!channelName?.trim()) return;

    const channelDescription = prompt('Enter channel description:');
    if (!channelDescription?.trim()) return;

    if (this.currentUser) {
      try {
        const newChannel = this.dataService.createChannel({
          name: channelName.trim(),
          description: channelDescription.trim(),
          groupId: groupId,
          createdBy: this.currentUser.id
        });
        
        alert(`Channel "${newChannel.name}" has been created!`);
        this.loadData();
      } catch (error) {
        alert('Failed to create channel. Please try again.');
      }
    }
  }

  // Delete channel (Group Admin can delete channels in their groups)
  deleteChannelAsAdmin(channelId: number) {
    const channel = this.dataService.getChannelById(channelId);
    if (channel && confirm(`Are you sure you want to delete the channel "${channel.name}"?`)) {
      const success = this.dataService.deleteChannel(channelId);
      if (success) {
        alert(`Channel "${channel.name}" has been deleted.`);
        this.loadData();
      }
    }
  }

  // Delete group (Group Admin can delete their own groups)
  deleteOwnGroup(groupId: number) {
    const group = this.dataService.getGroupById(groupId);
    if (group && confirm(`Are you sure you want to delete your group "${group.name}"? This will delete all channels and remove all members.`)) {
      const success = this.dataService.deleteGroup(groupId);
      if (success) {
        alert(`Your group "${group.name}" has been deleted.`);
        this.loadData();
      }
    }
  }

  // Remove user from group (Group Admin can remove users from their groups)
  removeUserFromGroupAsAdmin(userId: number, groupId: number) {
    const user = this.dataService.getUserById(userId);
    const group = this.dataService.getGroupById(groupId);
    
    if (user && group && confirm(`Are you sure you want to remove ${user.username} from "${group.name}"?`)) {
      const success = this.dataService.removeUserFromGroup(userId, groupId);
      if (success) {
        alert(`${user.username} has been removed from the group.`);
        this.loadData();
      }
    }
  }

  // Get groups created by current user (for Group Admin)
  getGroupsCreatedByCurrentUser(): Group[] {
    if (!this.currentUser) return [];
    return this.groups.filter(group => group.createdBy === this.currentUser!.id);
  }

  // Check if current user can manage a specific group
  canManageGroup(groupId: number): boolean {
    if (this.isSuperAdmin) return true;
    if (!this.currentUser) return false;
    
    const group = this.dataService.getGroupById(groupId);
    return group?.createdBy === this.currentUser.id;
  }

  // ***Group Join Request Management***
  // Get pending requests for groups managed by current user
  getPendingRequestsForMyGroups(): GroupJoinRequest[] {
    if (!this.currentUser) return [];
    
    const myGroups = this.getGroupsCreatedByCurrentUser();
    const allRequests = this.dataService.getGroupJoinRequests();
    
    return allRequests.filter(request => 
      request.status === 'pending' && 
      myGroups.some(group => group.id === request.groupId)
    );
  }

  // Approve join request
  approveJoinRequest(requestId: number) {
    if (this.currentUser) {
      const success = this.dataService.approveGroupJoinRequest(requestId, this.currentUser.id);
      if (success) {
        alert('Join request approved! User has been added to the group.');
        this.loadData();
      }
    }
  }

  // Deny join request
  denyJoinRequest(requestId: number) {
    if (this.currentUser) {
      const success = this.dataService.denyGroupJoinRequest(requestId, this.currentUser.id);
      if (success) {
        alert('Join request denied.');
        this.loadData();
      }
    }
  }

  // Get join request details for display
  getJoinRequestDetails(request: GroupJoinRequest) {
    const user = this.dataService.getUserById(request.userId);
    const group = this.dataService.getGroupById(request.groupId);
    return {
      username: user?.username || 'Unknown User',
      groupName: group?.name || 'Unknown Group',
      requestedAt: request.requestedAt
    };
  }

  // ***Super-Admin Functionality***

// Promote user to Group Admin
  promoteToGroupAdmin(userId: number) {
    const user = this.dataService.getUserById(userId);
    if (user && !user.roles.includes('group-admin')) {
      const updatedRoles: UserRole[] = [...user.roles, 'group-admin'];
      const success = this.dataService.updateUser(userId, { roles: updatedRoles });
      if (success) {
        alert(`${user.username} has been promoted to Group Admin!`);
        this.loadData();
      }
    }
  }

  // Promote user to Super Admin
  promoteToSuperAdmin(userId: number) {
    if (confirm('Are you sure you want to promote this user to Super Admin? This gives them full system access.')) {
      const user = this.dataService.getUserById(userId);
      if (user && !user.roles.includes('super-admin')) {
        const updatedRoles: UserRole[] = ['super-admin']; // Super admin role replaces all others
        const success = this.dataService.updateUser(userId, { roles: updatedRoles });
        if (success) {
          alert(`${user.username} has been promoted to Super Admin!`);
          this.loadData();
        }
      }
    }
  }
  // Delete any user (Super Admin only)
  deleteUserAsAdmin(userId: number) {
    const user = this.dataService.getUserById(userId);
    if (user && confirm(`Are you sure you want to delete ${user.username}? This cannot be undone.`)) {
      const success = this.dataService.deleteUser(userId);
      if (success) {
        alert(`${user.username} has been deleted.`);
        this.loadData();
      }
    }
  }

  // Delete any group (Super Admin only)
  deleteGroupAsAdmin(groupId: number) {
    const group = this.dataService.getGroupById(groupId);
    if (group && confirm(`Are you sure you want to delete the group "${group.name}"? This will delete all channels and remove all members.`)) {
      const success = this.dataService.deleteGroup(groupId);
      if (success) {
        alert(`Group "${group.name}" has been deleted.`);
        this.loadData();
      }
    }
  }
}