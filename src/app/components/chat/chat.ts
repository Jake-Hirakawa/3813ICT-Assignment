import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { SocketService } from '../../services/socket.service';
import { User, Group, Channel, Message } from '../../model/model';

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
    private apiService: ApiService,
    private socketService: SocketService
  ){}

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

  loadGroupUsers(): void {
    this.apiService.getUsers().subscribe({
      next: (response) => {
        this.groupUsers = response.users;
      }
    });
  }

  getUserAvatar(username: string): string | null {
    const user = this.groupUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
    return user?.avatarUrl || null;
  }

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

triggerFileInput(): void {
  const fileInput = document.getElementById('imageInput') as HTMLInputElement;
  if (fileInput) {
    fileInput.click();
  }
}

// Also update the cancel method to be cleaner
cancelImageSelection(): void {
  this.selectedImage = null;
  const fileInput = document.getElementById('imageInput') as HTMLInputElement;
  if (fileInput) {
    fileInput.value = '';
  }
}
  
  goBackToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }  

  ngOnDestroy(): void {
    // Clean up socket connection
    this.socketService.disconnect();
  }

}
