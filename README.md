# Chat System - Phase 1 Documentation

## Git Repository Organization

### Repository Structure
```
chat-system/
├── server/
│   ├── server.js                 # Main Express server
│   ├── data.json                # JSON file for data persistence
│   └── package.json             # Server dependencies
└── src/app/
│   ├── components/
│   │   ├── login/           # Login component
│   │   ├── dashboard/       # Main dashboard component
│   ├── services/
│   │   ├── api.service.ts   # HTTP API communication
|   |   ├── auth.guard.ts    # Authentication Guard
│   │   └── auth.service.ts  # Authentication management
│   ├── data/
│   │   └── model.ts         # TypeScript interfaces
│   └── app.routes.ts        # Angular routing configuration
└── package.json             # Client dependencies

```

### Git Usage Strategy
- **Branching**: Feature branches for major components (server-implementation, dashboard-ui)
- **Commits**: Regular commits after each functional completion with descriptive messages
- **Workflow**: Develop on feature branches → test locally → merge to main
- **Separation**: Server and client developed in parallel with separate commit histories

## Data Structures

### Client Side Data Models (TypeScript Interfaces)

#### User Interface
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];          // ['Super Admin', 'Group Admin', 'User']
  groups: string[];         // Array of group IDs user belongs to
}
```

#### Group Interface
```typescript
interface Group {
  id: string;
  name: string;
  ownerUsername: string;    // Username of group creator
  admins: string[];         // Array of admin usernames
  members: string[];        // Array of member usernames
  channels: Channel[];      // Array of channel objects
}
```

#### Channel Interface
```typescript
interface Channel {
  id: string;
  name: string;
  members: string[];        // Array of usernames with channel access
}
```

### Server Side Data Structures (JSON Schema)

#### Users Collection
```json
{
  "users": [
    {
      "id": "u1672847123456",
      "username": "super",
      "email": "super@admin.com", 
      "password": "123",
      "roles": ["Super Admin"],
      "groups": ["g1672847123789"]
    }
  ]
}
```

#### Groups Collection
```json
{
  "groups": [
    {
      "id": "g1672847123789",
      "name": "General",
      "ownerUsername": "super",
      "admins": ["super"],
      "members": ["super", "user1"],
      "channels": [
        {
          "id": "c1672847124000",
          "name": "general",
          "members": ["super"]
        }
      ]
    }
  ]
}
```

#### Join Requests Collection
```json
{
  "joinRequests": [
    {
      "id": "r1672847124111",
      "gid": "g1672847123789",
      "username": "user1",
      "status": "pending",
      "createdAt": 1672847124111
    }
  ]
}
```

## Angular Architecture

**Components:**
- **LoginComponent**: Authentication form, validation, redirects
- **DashboardComponent**: Role-based UI (Super Admin: user mgmt, Group Admin: group mgmt, User: view only)

**Services:**  
- **AuthService**: localStorage session management, getCurrentUser(), login(), logout()
- **ApiService**: HTTP client wrapper for all server endpoints

**Models:** TypeScript interfaces in `data/model.ts` (User, Group, Channel)

**Routes:** Login (public), Dashboard (AuthGuard protected)

## Node Server Architecture

**Modules:** express, cors, fs, path

**Global Variables:** users[], groups[], joinRequests[] (in-memory arrays)

**Functions:**
- `saveData()`: Atomic JSON file write  
- `loadData()`: JSON file read with normalization
- `genId()`: Unique ID generation
- Helper functions: getUserByUsername(), getGroupById(), etc.

**Files:** Single server.js with organized route sections

## Server Routes

### Authentication
- `POST /api/auth/login` - Body: `{username, password}` - Returns: `{user}` or 401

### User Management  
- `GET /api/users` - Returns: `{users[]}` (Super Admin view)
- `POST /api/users` - Body: `{username, email, password?}` - Returns: `{user}` or 409
- `DELETE /api/users/:id` - Returns: `{message}` (Super Admin only)

### Group Management
- `GET /api/groups` - Returns: `{groups[]}` 
- `POST /api/groups` - Body: `{name, ownerUsername}` - Returns: `{group}` or 403
- `DELETE /api/groups/:id` - Returns: `{message}`
- `POST /api/groups/:id/members` - Body: `{username}` - Returns: `{message}`
- `DELETE /api/groups/:id/members/:username` - Returns: `{message}`

### Channel Management
- `POST /api/groups/:id/channels` - Body: `{name}` - Returns: `{channel}`  
- `DELETE /api/groups/:groupId/channels/:channelId` - Returns: `{message}`
- `POST /api/groups/:groupId/channels/:channelId/members` - Body: `{username}` - Returns: `{message}`
- `DELETE /api/groups/:groupId/channels/:channelId/members/:username` - Returns: `{message}`

## Client-Server Interaction

**Pattern:** Client Action → API Call → Server Array Update → JSON Save → Client Display Refresh

**Login:** Form submit → `/api/auth/login` → validate against users[] → store in localStorage → navigate to dashboard

**User Management:**  
- Create: `createUser()` → POST `/api/users` → add to users[] → saveData() → refresh user list
- Delete: `deleteUser()` → DELETE `/api/users/:id` → remove from users[] and all group arrays → refresh both lists

**Group Operations:**
- Create: `createGroup()` → POST `/api/groups` → add to groups[], update user.groups[] → refresh groups
- Add Member: `addUserToGroup()` → POST members → update group.members[] and user.groups[] → refresh display  
- Remove: similar pattern with array removal

**Channel Operations:**
- Add Channel: `addChannelToGroup()` → POST channels → add to group.channels[] → refresh group view
- Add User to Channel: POST channel members → add to channel.members[] → refresh channel display

**Display Updates:** All operations trigger data reload via `loadUsers()`/`loadGroups()` to sync UI with server state

## Running the project (development)

### Prerequisites
- Node.js (v14+)
- Angular CLI (`npm install -g @angular/cli`)

### Server Setup
```bash
cd server
npm install express cors
node server.js
```

### Client Setup
```bash
cd client
npm install
ng serve
```
