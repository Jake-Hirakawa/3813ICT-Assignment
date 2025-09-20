import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { Message } from '../model/model';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  // Declare variables
  private socket: Socket | undefined;
  private readonly serverUrl = 'http://localhost:3000';  // Your server URL

  constructor() {}

  // Connect to the server
  connect(): void {
    this.socket = io(this.serverUrl, {
      transports: ['websocket'],  // Use websocket transport
      reconnection: true,         // Auto-reconnect if disconnected
    });
  }

  // Disconnect from server
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  // Join a channel room
  joinChannel(channelId: string, username: string): void {
    if (this.socket) {
      this.socket.emit('join-channel', { channelId, username });
    }
  }

  // Send a message to the server
  sendMessage(message: Message): void {
    if (this.socket) {
      // Emit 'message' event to server with the message data
      this.socket.emit('send-message', message);
    }
  }

  // Listen for new messages
  onNewMessage(): Observable<Message> {
    return new Observable(observer => {
      if (this.socket) {
        this.socket.on('new-message', (message: Message) => {
          observer.next(message);
        });
      }
    });
  }

  // Listen for connection event
  onConnect(): Observable<void> {
    return new Observable(observer => {
      if (this.socket) {
        this.socket.on('connect', () => {
          observer.next();
        });
      }
    });
  }

  // Listen for disconnection event
  onDisconnect(): Observable<void> {
    return new Observable(observer => {
      if (this.socket) {
        this.socket.on('disconnect', () => {
          observer.next();
        });
      }
    });
  }

  // Listen for user joined events
onUserJoined(): Observable<any> {
  return new Observable(observer => {
    if (this.socket) {
      this.socket.on('user-joined', (data) => {
        observer.next(data);
      });
    }
  });
}

  // Listen for user left events
  onUserLeft(): Observable<any> {
    return new Observable(observer => {
      if (this.socket) {
        this.socket.on('user-left', (data) => {
          observer.next(data);
        });
      }
    });
  }
}