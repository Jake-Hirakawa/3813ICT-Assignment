import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DashboardComponent } from './dashboard';

describe('Dashboard', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    })
    .compileComponents();

    // Mock a logged in user
    const mockUser = {
      id: 'u1',
      username: 'testuser',
      email: 'test@example.com',
      roles: ['User'],
      groups: []
    };
    localStorage.setItem('currentUser', JSON.stringify(mockUser));

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load current user on init', () => {
    expect(component.currentUser).toBeDefined();
    expect(component.currentUser?.username).toBe('testuser');
  });

  it('should initialize with empty users array', () => {
    expect(component.users).toBeDefined();
    expect(Array.isArray(component.users)).toBe(true);
  });

  it('should initialize with empty groups array', () => {
    expect(component.groups).toBeDefined();
    expect(Array.isArray(component.groups)).toBe(true);
  });

  it('should correctly identify user role as User', () => {
    const role = component.getCurrentUserRole();
    expect(role).toBe('User');
  });

  it('should return false for isSuperAdmin when user is not Super Admin', () => {
    expect(component.isSuperAdmin()).toBe(false);
  });

  it('should return false for isGroupAdmin when user is not Group Admin', () => {
    expect(component.isGroupAdmin()).toBe(false);
  });
});