import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from './auth.service';
import { ApiService } from './api.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService, ApiService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('should login successfully and store user', (done) => {
      const mockUser = {
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['User'],
        groups: []
      };

      service.login('testuser', 'password').subscribe(success => {
        expect(success).toBe(true);
        const storedUser = JSON.parse(localStorage.getItem('currentUser')!);
        expect(storedUser.username).toBe('testuser');
        done();
      });

      const req = httpMock.expectOne('http://localhost:3000/api/auth/login');
      req.flush({ user: mockUser });
    });

    it('should return false on login failure', (done) => {
      service.login('wrong', 'credentials').subscribe({
        next: (success) => {
          expect(success).toBe(false);
          expect(localStorage.getItem('currentUser')).toBeNull();
          done();
        },
        error: () => {
          done();
        }
      });

      const req = httpMock.expectOne('http://localhost:3000/api/auth/login');
      req.flush({ error: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('logout', () => {
    it('should remove user from localStorage', () => {
      localStorage.setItem('currentUser', JSON.stringify({ username: 'test' }));
      service.logout();
      expect(localStorage.getItem('currentUser')).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user from localStorage', () => {
      const mockUser = { id: '123', username: 'test', email: 'test@test.com', roles: ['User'], groups: [] };
      localStorage.setItem('currentUser', JSON.stringify(mockUser));
      
      const user = service.getCurrentUser();
      expect(user).toEqual(mockUser);
    });

    it('should return null when no user is stored', () => {
      const user = service.getCurrentUser();
      expect(user).toBeNull();
    });
  });

  describe('isLoggedIn', () => {
    it('should return true when user is logged in', () => {
      localStorage.setItem('currentUser', JSON.stringify({ username: 'test' }));
      expect(service.isLoggedIn()).toBe(true);
    });

    it('should return false when no user is logged in', () => {
      expect(service.isLoggedIn()).toBe(false);
    });
  });
});