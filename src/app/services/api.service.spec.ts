import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  const baseUrl = 'http://localhost:3000/api';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('User API', () => {
    it('should fetch users', () => {
      const mockUsers = [{ id: '1', username: 'user1', email: 'user1@test.com', roles: ['User'], groups: [] }];

      service.getUsers().subscribe(response => {
        expect(response.users).toEqual(mockUsers);
      });

      const req = httpMock.expectOne(`${baseUrl}/users`);
      expect(req.request.method).toBe('GET');
      req.flush({ users: mockUsers });
    });

    it('should add user', () => {
      const newUser = { username: 'newuser', email: 'new@test.com', password: 'pass', role: 'user' };

      service.addUser(newUser).subscribe(response => {
        expect(response.user.username).toBe('newuser');
      });

      const req = httpMock.expectOne(`${baseUrl}/users`);
      expect(req.request.method).toBe('POST');
      req.flush({ user: { ...newUser, id: '123', roles: ['User'], groups: [] } });
    });

    it('should delete user', () => {
      service.deleteUser('123').subscribe(response => {
        expect(response.message).toBeTruthy();
      });

      const req = httpMock.expectOne(`${baseUrl}/users/123`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ message: 'User deleted' });
    });
  });

  describe('Group API', () => {
    it('should fetch groups', () => {
      const mockGroups = [{ id: '1', name: 'Group1', ownerUsername: 'admin', admins: [], members: [], channels: [] }];

      service.getGroups().subscribe(response => {
        expect(response.groups).toEqual(mockGroups);
      });

      const req = httpMock.expectOne(`${baseUrl}/groups`);
      expect(req.request.method).toBe('GET');
      req.flush({ groups: mockGroups });
    });

    it('should create group', () => {
      const groupData = { name: 'Test Group', ownerUsername: 'admin' };

      service.createGroup(groupData).subscribe(response => {
        expect(response.group.name).toBe('Test Group');
      });

      const req = httpMock.expectOne(`${baseUrl}/groups`);
      expect(req.request.method).toBe('POST');
      req.flush({ group: { ...groupData, id: '123', admins: [], members: [], channels: [] } });
    });

    it('should delete group', () => {
      service.deleteGroup('123').subscribe(response => {
        expect(response.message).toBeTruthy();
      });

      const req = httpMock.expectOne(`${baseUrl}/groups/123`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ message: 'Group deleted' });
    });
  });

  describe('Channel API', () => {
    it('should add channel to group', () => {
      service.addChannelToGroup('g1', 'channel1').subscribe(response => {
        expect(response.channel).toBeTruthy();
      });

      const req = httpMock.expectOne(`${baseUrl}/groups/g1/channels`);
      expect(req.request.method).toBe('POST');
      req.flush({ channel: { id: 'c1', name: 'channel1', members: [] } });
    });

    it('should remove channel from group', () => {
      service.removeChannelFromGroup('g1', 'c1').subscribe(response => {
        expect(response.message).toBeTruthy();
      });

      const req = httpMock.expectOne(`${baseUrl}/groups/g1/channels/c1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ message: 'Channel removed' });
    });
  });
});