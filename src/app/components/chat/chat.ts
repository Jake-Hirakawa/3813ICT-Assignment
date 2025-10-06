import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { SocketService } from '../../services/socket.service';
import { User, Group, Channel, Message } from '../../model/model';
import { Inject } from '@angular/core';

@Component({
  selector: 'app-chat',
  imports: [FormsModule, CommonModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css'
})

export class Chat implements OnInit, OnDestroy {
  currentUser: User | null = null;
  groupId: string | null = null;
  channelId: string | null = null;
  group: Group | null = null;
  groupUsers: User[] = [];
  channel: Channel | null = null;

  //Messaging
  messages: Message[] = [];
  newMessageContent = '';
  selectedImage: File | null = null;


  constructor (
    private router: Router, 
    private route: ActivatedRoute, 
    private authService: AuthService, 
    @Inject(ApiService) private apiService: ApiService,
    private socketService: SocketService
  ){}

  // Component initialization
  // Validates user is authenticated, redirects to login if not
  // Extracts groupId and channelId from route parameters
  // Loads group details, recent messages, and establishes socket connection
  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    this.groupId = this.route.snapshot.paramMap.get('groupId');
    this.channelId = this.route.snapshot.paramMap.get('channelId');
    this.currentUser = this.authService.getCurrentUser();

    if (this.groupId){
      this.loadGroupDetails();
      this.loadRecentMessages();
      this.setupSocket();
    }
  }

  // Load group and channel details
  // Fetches group data via API
  // Finds specific channel within group by channelId
  // Triggers loading of all users for avatar display
  loadGroupDetails(){
    this.apiService.getGroup(this.groupId!).subscribe({
      next: (response) => {
        this.group = response.group;
        this.channel = this.group?.channels.find(c => c.id === this.channelId) || null;
        
        // Load all users to get avatars
        this.loadGroupUsers();
      },
      error: (error) => {
        console.error('failed to load group details: ', error);
      }
    });
  }

  // Load all users for avatar mapping
  // Fetches complete user list from API
  // Stores in groupUsers for getUserAvatar lookups
  loadGroupUsers(): void {
    this.apiService.getUsers().subscribe({
      next: (response) => {
        this.groupUsers = response.users;
      }
    });
  }

  // Get avatar URL for a username
  // Case-insensitive lookup in groupUsers array
  // Returns avatarUrl or null if user not found or no avatar
  getUserAvatar(username: string): string | null {
    const user = this.groupUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
    return user?.avatarUrl || null;
  }

  // Load recent channel messages
  // Fetches last 20 messages for current channel via HTTP
  // Populates messages array with chat history
  // Error handling initializes empty array on failure
  loadRecentMessages(): void {
    if (this.groupId && this.channelId) {
      this.apiService.getChannelMessages(this.groupId, this.channelId, 20).subscribe({
        next: (response) => {
          this.messages = response.messages;
          console.log(`Loaded ${this.messages.length} previous messages`);
        },
        error: (error) => {
          console.error('Failed to load messages:', error);
          this.messages = []; // Start with empty if load fails
        }
      });
    }
  }

  // Establish Socket.IO connection
  // Connects to WebSocket server
  // Joins channel room with username
  // Sets up listeners for:
  //   - new-message: adds incoming messages (deduplicates by ID)
  //   - user-joined: adds system message when user joins
  //   - user-left: adds system message when user leaves
  //   - connect: logs successful connection
  setupSocket(): void {
    this.socketService.connect();
    if (this.channelId && this.currentUser) {
      // Join with username
      this.socketService.joinChannel(this.channelId, this.currentUser.username);
    }
    // Listen for messages
    this.socketService.onNewMessage().subscribe(message => {
      // Check if message already exists (to avoid duplicates)
      if (!this.messages.find(m => m.id === message.id)) {
        this.messages.push(message);
      }
    });

    // Listen for user joined
    this.socketService.onUserJoined().subscribe(data => {
      this.messages.push({
        id: `system-${Date.now()}`,
        channelId: this.channelId!,
        username: 'System',
        content: `${data.username} joined the channel`,
        timestamp: data.timestamp,
        type: 'system'
      });
    });

    // Listen for user left
    this.socketService.onUserLeft().subscribe(data => {
      this.messages.push({
        id: `system-${Date.now()}`,
        channelId: this.channelId!,
        username: 'System',
        content: `${data.username} left the channel`,
        timestamp: data.timestamp,
        type: 'system'
      });
    });

    this.socketService.onConnect().subscribe(() => {
      console.log('Connected to chat server');
    });
  }

  // Send text message
  // Validates content exists, user authenticated, and channelId present
  // Creates message object with temporary ID
  // Emits message via Socket.IO (server handles DB save and broadcast)
  // Clears input field after sending
  sendMessage(): void {
    if (!this.newMessageContent.trim() || !this.currentUser || !this.channelId) {
      return;
    }
    const message: Message = {
      id: `temp-${Date.now()}`, // Temporary ID
      channelId: this.channelId,
      username: this.currentUser.username,
      content: this.newMessageContent.trim(),
      timestamp: Date.now()
    };
    // Send via socket
    this.socketService.sendMessage(message);
    // Clear input
    this.newMessageContent = '';
  }

  // Handle image file selection
  // Event handler for file input change
  // Validates file is an image type
  // Stores file in selectedImage for upload
  // Shows alert if invalid file type
  onImageSelected(event: any): void {
    const file = event.target.files[0];
    console.log('File selected:', file);
    if (file && file.type.startsWith('image/')) {
      this.selectedImage = file;
      console.log('selectedImage set to:', this.selectedImage);
    } else {
      alert('Please select a valid image file');
    }
  }

  // Upload and send image message
  // Validates image, user, and channel are present
  // Uploads image to server via API
  // Creates image message with returned imageUrl
  // Sends message via Socket.IO with type: 'image'
  // Clears file input after successful upload
  // Shows error alert on upload failure
  sendImageMessage(): void {
    if (!this.selectedImage || !this.currentUser || !this.channelId) {
      console.log('Missing data:', { selectedImage: !!this.selectedImage, currentUser: !!this.currentUser, channelId: !!this.channelId });
      return;
    }

    console.log('Uploading image:', this.selectedImage.name);
    
    this.apiService.uploadMessageImage(this.selectedImage).subscribe({
      next: (response) => {
        console.log('Upload response:', response);
        
        const message: Message = {
          id: `temp-${Date.now()}`,
          channelId: this.channelId!,
          username: this.currentUser!.username,
          content: `Shared an image`,
          timestamp: Date.now(),
          type: 'image',
          imageUrl: response.imageUrl
        };

        console.log('Sending message via socket:', message);
        this.socketService.sendMessage(message);
        
        this.selectedImage = null;
        const fileInput = document.getElementById('imageInput') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      },
      error: (error) => {
        console.error('Failed to upload image:', error);
        alert('Failed to upload image. Please try again.');
      }
    });
  }

  // Trigger hidden file input
  // Programmatically clicks hidden file input element
  // Used by visible "Send Image" button
  triggerFileInput(): void {
    const fileInput = document.getElementById('imageInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  // Cancel image selection
  // Clears selectedImage state
  // Resets file input value to allow re-selecting same file
  cancelImageSelection(): void {
    this.selectedImage = null;
    const fileInput = document.getElementById('imageInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }
  
  // Navigate back to dashboard
  // Returns user to main dashboard view
  goBackToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }  

  // Component cleanup
  // Disconnects Socket.IO connection on component destroy
  // Prevents memory leaks and duplicate connections
  ngOnDestroy(): void {
    // Clean up socket connection
    this.socketService.disconnect();
  }
}
