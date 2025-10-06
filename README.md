# Chat System Phase 2 Documentation

## Installation and Setup Instructions

**Prerequisites**

- Node.js (v14 or higher)
- npm (Node Package Manager)
- MongoDB installed and running
- Git

**Server Setup**

1. Navigate to server directory:

```bash
cd server
```

2. Install server dependencies:

```bash
npm install
```

3. Configure environment variables: Create a .env file in the server directory with the following:

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/chat_system
```

4. Start the server:

```bash
node server.js
```

5. Verify server is running:
   - Console should display: Server running at http://localhost:3000
   - MongoDB connection message should appear

**Client (Angular) Setup**

1. Navigate to project root directory:

```bash
cd chat-system
```

2. Install Angular CLI globally (if not already installed):

```bash
npm install -g @angular/cli
```

3. Install client dependencies:

```bash
npm install
```

4. Start the Angular development server:

```bash
ng serve
```

5. Verify client is running:
   - Console should display: Angular Live Development Server is listening on localhost:4200
   - Application accessible at: http://localhost:4200

**Running the Complete Application**

You need TWO terminal windows:

1. Terminal 1 - Start the server:

```bash
cd server
npm install
node server.js
```

2. Terminal 2 - Start the Angular client:

```bash
cd chat-system
npm install
ng serve
```

3. Access the application:
   - Open browser and navigate to: http://localhost:4200
   - The Angular app will communicate with the server at http://localhost:3000

4. Default Super Admin login credentials:
   - Username: super
   - Password: 123

**Testing**

Run server tests:

```bash
cd server
npm test
```

Run Angular tests:

```bash
ng test
```

## Git Repository Organization

**Repository Structure**

```
chat-system/
├── server/
│   ├── images/                    # User uploaded images
│   ├── routes/                    # Server routes grouped into categories
│   │   ├── channelRoutes.js
│   │   ├── groupRoutes.js
│   │   ├── imageRoutes.js
│   │   ├── joinRequestRoutes.js
│   │   ├── messageRoutes.js
│   │   └── userRoutes.js
│   ├── test/                      # Route tests grouped into categories
│   │   ├── auth.test.js
│   │   ├── channels.test.js
│   │   ├── groups.test.js
│   │   ├── joinrequests.test.js
│   │   ├── messages.test.js
│   │   └── users.test.js
│   ├── utils/
│   │   └── dbHelpers.js          # Helper functions for database operations
│   ├── db.js                     # Database configuration
│   ├── multer.js                 # File upload configuration
│   ├── server.js                 # Main Express server
│   └── socket.js                 # Socket.io config
├── src/
│   └── app/
│       ├── components/
│       │   ├── chat/             # Chat component
│       │   ├── dashboard/        # Dashboard component
│       │   └── login/            # Login component
│       ├── model/
│       │   └── model.ts          # Data model interfaces
│       ├── services/
│       │   ├── api.service.ts    # Api service
│       │   ├── auth.guard.ts     # Route auth guard service
│       │   ├── auth.service.ts   # Authorization service
│       │   └── socket.service.ts # Socket service
│       ├── app.config.ts
│       ├── app.css
│       ├── app.html
│       ├── app.routes.ts         # Angular routing configuration
│       └── app.ts
└── main.ts
```

**Git Usage Strategy**

- **Branching**: Branches are made for major features and components. Eg, mongodb implementation, testing implementation, image functionality
- **Commits**: Regular commits after each functional completion with descriptive messages
- **Workflow**: Develop on feature branches → test locally → merge to main

## Data Structures

**Client-Side Data Models (TypeScript Interfaces)**

On the Client-side data structures are defined as interfaces in the model/model.ts file. Each interface is defined below.

**User Interface**

```typescript
interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];      // ['Super Admin', 'Group Admin', 'User']
  groups: string[];     // Array of group IDs
}
```

**Group Interface**

```typescript
interface Group {
  id: string;
  name: string;
  ownerUsername: string;
  admins: string[];
  members: string[];
  channels: Channel[];
}
```

**Channel Interface**

```typescript
interface Channel {
  id: string;
  name: string;
  members: string[];
}
```

**Join Request Interface**

```typescript
interface JoinRequest {
  id: string;
  gid: string;
  username: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}
```

**Message Interface**

```typescript
interface Message {
  id: string;
  channelId: string;
  username: string;
  content: string;
  timestamp: number;
  imageUrl?: string;
}
```

**Server-Side Data Structures**

On the server side, data is stored in MongoDB collections. All data is loaded into in-memory arrays on server startup for fast access. The main collections are defined below.

**Users Collection**

```json
{
  "users": [
    {
      "id": "u1",
      "username": "super",
      "email": "super@admin.com",
      "password": "123",
      "roles": ["Super Admin"],
      "groups": ["g1756882814729838"]
    }
  ]
}
```

**Groups Collection**

```json
{
  "groups": [
    {
      "id": "g1756882814729838",
      "name": "Group A",
      "ownerUsername": "super",
      "admins": ["super"],
      "members": ["super", "user"],
      "channels": [
        {
          "id": "c175688284670737",
          "name": "channel 1",
          "members": ["super"]
        }
      ]
    }
  ]
}
```

## REST API/Sockets

**Authentication Routes (/api/auth)**

**POST /api/auth/login**

- **Parameters:** { username: string, password: string }
- **Returns:** { user: User } (without password) or 401 { error: string }
- **Purpose:** Authenticate user credentials and return user object for session establishment. User details is then stored in local storage and deleted on logout.

**User Routes (/api/users)**

**GET /api/users**

- **Parameters:** None
- **Returns:** { users: User[] } (passwords excluded)
- **Purpose:** Retrieve all users in the system. Used in the dashboard component to establish all user data for group-admin and super-admin controls(promote user to roles, delete user, add user to group etc.).

**POST /api/users**

- **Parameters:** { username: string, email: string, password?: string, role?: string }
- **Returns:** 201 { user: User } or 400/409 { error: string }
- **Purpose:** Create new user account with specified role (defaults to 'User'). Used in dashboard component super admin controls, to create new users.

**DELETE /api/users/:id**

- **Parameters:** id (URL parameter)
- **Returns:** { message: string } or 404 { error: string }
- **Purpose:** Delete user and remove from all groups/channels. Used in the dashboard component for user self-deletion or super admin user deletion.

**POST /api/users/:id/promote-super-admin**

- **Parameters:** id (URL parameter)
- **Returns:** { message: string } or 400/404 { error: string }
- **Purpose:** Promote user to Super Admin role. Used in dashboard component super admin controls, to promote specified user to super admin role.

**Group Routes (/api/groups)**

**GET /api/groups**

- **Parameters:** None
- **Returns:** { groups: Group[] }
- **Purpose:** Retrieve all groups with complete channel and member information. Used in Dashboard to gather all group information.

**POST /api/groups**

- **Parameters:** { name: string, ownerUsername: string }
- **Returns:** 201 { group: Group } or 400/403/404 { error: string }
- **Purpose:** Create new group (Group Admin or Super Admin only). Used in dashboard component for super admin and group admin controls to create a new group with specified name and the creating user in the "admins" and "members" array.

**DELETE /api/groups/:id**

- **Parameters:** id (URL parameter)
- **Returns:** { message: string } or 404 { error: string }
- **Purpose:** Delete group and clean up all user associations. Used in dashboard component for super admin and group admin controls to delete a specified group and all related data (messages, join requests, channels).

**POST /api/groups/:id/members**

- **Parameters:** id (URL), { username: string } (body)
- **Returns:** { message: string } or 400/404 { error: string }
- **Purpose:** Add user to group membership. Used in dashboard component for super admin and group admin controls to add a specified user directly to a specified group.

**DELETE /api/groups/:id/members/:username**

- **Parameters:** id, username (URL parameters)
- **Returns:** { message: string } or 404 { error: string }
- **Purpose:** Remove user from group and all associated channels. Used in dashboard component for super admin and group admin controls to delete a specified user from a specified group.

**POST /api/groups/:id/admins**

- **Parameters:** id (URL), { username: string } (body)
- **Returns:** { message: string } or 400/404 { error: string }
- **Purpose:** Promote group member to group admin. Used in dashboard component for super admin and group admin controls to promote a specified user to be group admin for a specified group.

**DELETE /api/groups/:id/admins/:username**

- **Parameters:** id, username (URL parameters)
- **Returns:** { message: string } or 400 { error: string }
- **Purpose:** Demote group admin (cannot remove group owner). Used in dashboard component for super admin and group admin controls to demote a specified user from group admin for specified group.

**Channel Routes (/api/channels)**

**POST /api/groups/:id/channels**

- **Parameters:** id (URL), { name: string } (body)
- **Returns:** 201 { channel: Channel } or 400/404 { error: string }
- **Purpose:** Create new channel within a group. Used in dashboard component for super admin and group admin controls to create a new channel in a specified group.

**DELETE /api/groups/:groupId/channels/:channelId**

- **Parameters:** groupId, channelId (URL parameters)
- **Returns:** { message: string } or 404 { error: string }
- **Purpose:** Delete channel from group. Used in dashboard component for super admin and group admin controls to remove a specified channel from a specified group.

**POST /api/groups/:groupId/channels/:channelId/members**

- **Parameters:** groupId, channelId (URL), { username: string } (body)
- **Returns:** { message: string } or 400/404 { error: string }
- **Purpose:** Add group member to specific channel. Used in dashboard component for super admin and group admin controls to add a specified group member to a specified channel.

**DELETE /api/groups/:groupId/channels/:channelId/members/:username**

- **Parameters:** groupId, channelId, username (URL parameters)
- **Returns:** { message: string } or 404 { error: string }
- **Purpose:** Remove user from specific channel. Used in dashboard component for super admin and group admin controls to remove a specified user from a specified channel.

**Join Request Routes (/api/join-requests)**

**GET /api/join-requests**

- **Parameters:** None
- **Returns:** { joinRequests: JoinRequest[] }
- **Purpose:** Retrieve all join requests (for admin review). Used in dashboard component to display pending join requests for group admins and super admins to approve or reject.

**POST /api/groups/:gid/requests**

- **Parameters:** gid (URL), { username: string } (body)
- **Returns:** 201 { request: JoinRequest } or 400/404/409 { error: string }
- **Purpose:** Create join request for a group. Used in dashboard component user view to allow users to request access to groups they are not members of.

**POST /api/join-requests/:id/approve**

- **Parameters:** id (URL parameter)
- **Returns:** { message: string } or 400/404 { error: string }
- **Purpose:** Approve join request and add user to group. Used in dashboard component for group admins and super admins to accept pending join requests and grant group membership.

**POST /api/join-requests/:id/reject**

- **Parameters:** id (URL parameter)
- **Returns:** { message: string } or 400/404 { error: string }
- **Purpose:** Reject join request. Used in dashboard component for group admins and super admins to deny pending join requests without granting group membership.

**Message Routes (/api/messages)**

**GET /api/channels/:channelId/messages**

- **Parameters:** channelId (URL), ?limit=50 (optional query parameter)
- **Returns:** { messages: Message[] }
- **Purpose:** Retrieve recent messages for a channel (message history). Used in chat component to load previous messages when user enters a channel, with optional limit parameter to control number of messages returned

**POST /api/channels/:channelId/messages**

- **Parameters:** channelId (URL), { username: string, content: string, imageUrl?: string } (body)
- **Returns:** 201 { message: Message }
- **Purpose:** Create new message in channel. Used in chat component to save messages to database when sent via Socket.io, supports both text messages and messages with image attachments.

**Image Routes (/api/images)**

**POST /api/upload/profile**

- **Parameters:** FormData with image file
- **Returns:** { imageUrl: string } or 400 { error: string }
- **Purpose:** Upload user profile image. Used in dashboard to allow users to upload and update their profile picture, returns URL path to stored image.

**POST /api/upload/message**

- **Parameters:** FormData with image file
- **Returns:** { imageUrl: string } or 400 { error: string }
- **Purpose:** Upload image for message attachment. Used in chat component to allow users to attach images to their messages, returns URL path that is then included in message content.

**Socket.io Events**

**Client → Server Events:**

**join-channel**

- **Data:** { channelId: string, username: string }
- **Purpose:** User joins a channel room to receive real-time messages. Used in chat component when user navigates to a channel. Server adds socket to room, stores username and channelId on socket object, and broadcasts join notification to other channel members

**send-message**

- **Data:** { channelId: string, username: string, content: string, imageUrl?: string }
- **Purpose:** Send message to all users in channel. Used in chat component when user submits a message. Server generates unique message ID and timestamp, saves to MongoDB messages collection, then broadcasts to all connected channel members via new-message event

**disconnect**

- **Data:** Automatic event (no data sent)
- **Purpose:** Triggered when socket connection closes. Server broadcasts user-left notification to channel if user had joined a channel, then cleans up socket connection

**Server → Client Events:**

**new-message**

- **Data:** { id: string, channelId: string, username: string, content: string, timestamp: number, imageUrl?: string }
- **Purpose:** Broadcast new message to all channel members (including sender). Received in chat component to display incoming messages in real-time. Message includes generated ID and timestamp from server
- **Broadcast:** Sent to all sockets in channel room via io.to(channelId).emit()

**user-joined**

- **Data:** { username: string, type: 'system', timestamp: number }
- **Purpose:** Notify existing channel members when a new user joins. Received in chat component to optionally display system notification (e.g., "jake joined the channel")
- **Broadcast:** Sent to all sockets in channel room except sender via socket.to(channelId).emit()

**user-left**

- **Data:** { username: string, type: 'system', timestamp: number }
- **Purpose:** Notify channel members when user disconnects or leaves. Received in chat component to optionally display system notification (e.g., "jake left the channel")
- **Broadcast:** Sent to all sockets in channel room except sender

## Angular Architecture

**Components**

**LoginComponent (src/app/components/login/)**

- **Purpose:** User authentication interface
- **Features:**
  - Username/password input form with validation
  - Error message display for invalid credentials
  - Auto-redirect if user already authenticated
  - Loading state management during login
  - Server connection error handling
- **Key Methods:**
  - ngOnInit(): Checks existing session and redirects to dashboard if logged in
  - onLogin(): Validates input fields, calls AuthService.login(), handles success/error responses
- **Template:** login.component.html - Form with two-way data binding
- **Styles:** login.component.css - Centered login card with responsive design

**DashboardComponent (src/app/components/dashboard/)**

- **Purpose:** Main application interface with role-based views
- **Features:**
  - **Super Admin View:**
    - User creation form with username, email, password, and role fields
    - User list with delete functionality
    - Full group/channel administration capabilities
    - Promote users to Super Admin
  - **Group Admin View:**
    - Group creation and deletion
    - Channel creation within owned groups
    - Member management (add/remove users)
    - Promote members to group admin within owned groups
    - Join request approval/denial functionality
  - **User View:**
    - Display accessible groups and channels
    - View group memberships
    - View channel access within groups
    - Join request functionality
    - Avatar selection
- **Key Methods:**
  - ngOnInit(): Load users and groups data on component initialization
  - isSuperAdmin(), isGroupAdmin(): Permission check methods
  - getCurrentUserRole(): Returns display string for user's role
  - createUser(), deleteUser(): User CRUD operations
  - createGroup(), deleteGroup(): Group CRUD operations
  - addUserToGroup(), removeUserFromGroup(): Group membership management
  - addChannelToGroup(), removeChannelFromGroup(): Channel CRUD operations
  - addUserToChannel(), removeUserFromChannel(): Channel membership management
  - loadUsers(), loadGroups(): Refresh data from server
  - showMessage(text, type): Display success/error notifications
  - getAvailableUsersForGroup(), getAvailableUsersForChannel(): Filter users for dropdowns
  - getUserGroups(), getUserChannelsInGroup(): Filter data for regular users
- **Template:** dashboard.component.html - Role-conditional sections with @If directives
- **Styles:** dashboard.component.css - Card-based layout with gradient headers

**ChatComponent (src/app/components/chat/)**

- **Purpose:** Real-time messaging interface for channel communication
- **Features:**
  - Display message history with timestamps and usernames
  - Send text messages in real-time
  - Send image messages with upload functionality
  - Real-time message updates via Socket.io
  - User joining/leaving notification
  - Typing indicators when users are composing messages
  - User avatars/profile pictures next to messages
  - Auto-scroll to latest messages
- **Key Methods:**
  - ngOnInit(): Load channel history from API, connect to Socket.io, join channel room
  - sendMessage(): Validate message, emit to server via socket, clear input field
  - onNewMessage(): Socket listener for incoming messages, append to message list
  - onUserTyping(): Socket listener for typing indicators
  - uploadImage(): Handle image file selection, upload to server, send image message
  - loadMessages(): Fetch message history via HTTP API
  - scrollToBottom(): Auto-scroll chat to latest message
  - ngOnDestroy(): Leave channel room, disconnect socket on component destroy
- **Template:** chat.component.html - Message list, input area, image upload button
- **Styles:** chat.component.css - Chat bubble layout, message alignment, scrollable container

**Services**

**AuthService (src/app/services/auth.service.ts)**

- **Purpose:** Authentication and session management
- **Methods:**
  - login(username: string, password: string): Observable<boolean> - Authenticate with server, store user in localStorage on success
  - logout(): void - Clear session and remove user from localStorage
  - getCurrentUser(): User | null - Retrieve current user object from localStorage
  - isLoggedIn(): boolean - Check if user is authenticated
  - hasRole(role: string): boolean - Check if current user has specific role
- **Data Flow:**
  1. Calls ApiService to send credentials to server
  2. Receives user object from server (without password)
  3. Stores user in localStorage under key 'currentUser'
  4. Returns boolean observable for login success/failure
- **Storage:** Uses browser localStorage for session persistence
- **Testing:** auth.service.spec.ts - Unit tests for authentication logic

**ApiService (src/app/services/api.service.ts)**

- **Purpose:** HTTP communication layer with backend REST API
- **Base URL:** http://localhost:3000/api
- **Methods:**
  - **Authentication:**
    - login(payload: { username, password }) - POST /api/auth/login
  - **User Management:**
    - getUsers() - GET /api/users
    - addUser(payload) - POST /api/users
    - deleteUser(userId) - DELETE /api/users/:id
    - promoteToSuperAdmin(userId) - POST /api/users/:id/promote-super-admin
  - **Group Management:**
    - getGroups() - GET /api/groups
    - createGroup(payload) - POST /api/groups
    - deleteGroup(groupId) - DELETE /api/groups/:id
    - addUserToGroup(groupId, username) - POST /api/groups/:id/members
    - removeUserFromGroup(groupId, username) - DELETE /api/groups/:id/members/:username
    - promoteToGroupAdmin(groupId, username) - POST /api/groups/:id/admins
    - demoteGroupAdmin(groupId, username) - DELETE /api/groups/:id/admins/:username
  - **Channel Management:**
    - addChannelToGroup(groupId, channelName) - POST /api/groups/:id/channels
    - removeChannelFromGroup(groupId, channelId) - DELETE /api/groups/:groupId/channels/:channelId
    - addUserToChannel(groupId, channelId, username) - POST channel members
    - removeUserFromChannel(groupId, channelId, username) - DELETE channel members
  - **Join Requests:**
    - getJoinRequests() - GET /api/join-requests
    - createJoinRequest(groupId, username) - POST /api/groups/:gid/requests
    - approveRequest(requestId) - POST /api/join-requests/:id/approve
    - rejectRequest(requestId) - POST /api/join-requests/:id/reject
  - **Messages:**
    - getChannelMessages(channelId, limit?) - GET /api/channels/:channelId/messages
    - sendMessage(channelId, payload) - POST /api/channels/:channelId/messages
  - **Images:**
    - uploadProfileImage(formData) - POST /api/upload/profile
    - uploadMessageImage(formData) - POST /api/upload/message
- **Returns:** Typed Observable responses matching server JSON format
- **Error Handling:** Centralized error interceptor for HTTP errors
- **Headers:** Automatically includes Content-Type: application/json
- **Testing:** api.service.spec.ts - HTTP request mocking and testing

**AuthGuard (src/app/services/auth.guard.ts)**

- **Purpose:** Protect routes from unauthorized access
- **Implementation:** Implements Angular CanActivate interface
- **Logic:**
  1. Check if user is logged in via AuthService.isLoggedIn()
  2. If authenticated, return true to allow navigation
  3. If not authenticated, redirect to /login and return false
- **Usage:** Applied to dashboard and chat routes in routing configuration
- **Testing:** auth.guard.spec.ts - Route protection scenarios

**SocketService (src/app/services/socket.service.ts)**

- **Purpose:** WebSocket communication for real-time features
- **Connection:** Socket.io client library connecting to http://localhost:3000
- **Methods:**
  - connect(): void - Establish socket connection to server
  - disconnect(): void - Close socket connection
  - joinChannel(channelId: string): void - Emit 'join-channel' event to join room
  - leaveChannel(channelId: string): void - Emit 'leave-channel' event to leave room
  - sendMessage(message: { channelId, username, content, imageUrl? }): void - Emit 'send-message' event
  - onNewMessage(): Observable<Message> - Listen for 'new-message' events, return as Observable
  - onUserTyping(): Observable<{username, channelId, isTyping}> - Listen for 'user-typing' events
  - emitTyping(channelId: string, isTyping: boolean): void - Emit typing indicator
  - onUserJoined(): Observable<{channelId, username}> - Listen for user join events
  - onUserLeft(): Observable<{channelId, username}> - Listen for user leave events
  - onError(): Observable<string> - Listen for error events from server
- **Implementation:**
  - Uses RxJS Observables to convert socket events to Angular-friendly streams
  - Automatically reconnects on disconnection
  - Handles connection errors gracefully
- **Testing:** socket.spec.ts - Mock socket events and test responses

**Models**

**TypeScript Interfaces** (src/app/model/model.ts)

All data structures defined as TypeScript interfaces:

- User - User entity with id, username, email, roles, groups
- Group - Group entity with id, name, owner, admins, members, channels
- Channel - Channel entity with id, name, members
- JoinRequest - Join request with id, groupId, username, status, timestamp
- Message - Message entity with id, channelId, username, content, timestamp, imageUrl

**Routes**

**Routing Configuration** (src/app/app.routes.ts)

```typescript
const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'chat/:channelId',
    component: ChatComponent,
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '/dashboard' }
];
```

**Route Descriptions:**

- **Root (/)**: Redirects to login page
- **/login**: Public login page, no authentication required
- **/dashboard**: Protected main dashboard, requires AuthGuard
- **/chat/:channelId**: Protected chat interface with dynamic channel ID parameter, requires AuthGuard
- **Wildcard (\*\*)**: Catch-all route redirects to dashboard (which then requires auth)

**Navigation Flow:**

1. Unauthenticated user → Redirected to /login
2. After login → Navigate to /dashboard
3. Click on channel → Navigate to /chat/:channelId
4. Logout → Navigate back to /login
