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
  channel: Channel | null = null;

  //Messaging
  messages: Message[] = [];
  newMessageContent = '';

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
      this.setupSocket();
    }
  }

  loadGroupDetails(){
    this.apiService.getGroup(this.groupId!).subscribe({
      next: (response) => {
        this.group = response.group;
        this.channel = this.group?.channels.find(c => c.id === this.channelId) || null;
      },
      error: (error) => {
        console.error('failed to load group details: ', error);
      }
    });
  }

  setupSocket(): void {
    // Connect to socket
    this.socketService.connect();

    // Join the channel room
    if (this.channelId) {
      this.socketService.joinChannel(this.channelId);
    }

    // Listen for new messages
    this.socketService.onNewMessage().subscribe(message => {
      this.messages.push(message);
    });

    // Optional: Listen for connection events
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
  
  goBackToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }  

  ngOnDestroy(): void {
    // Clean up socket connection
    this.socketService.disconnect();
  }

}
