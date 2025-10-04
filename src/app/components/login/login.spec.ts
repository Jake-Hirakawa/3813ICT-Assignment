import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const authSpy = jasmine.createSpyObj('AuthService', ['login', 'isLoggedIn']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, FormsModule],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty credentials', () => {
    expect(component.username).toBe('');
    expect(component.password).toBe('');
  });

  it('should validate missing credentials', () => {
    component.username = '';
    component.password = '';
    component.onLogin();
    expect(component.errorMessage).toContain('username and password');
  });

  it('should login successfully', () => {
    component.username = 'testuser';
    component.password = 'password';
    authService.login.and.returnValue(of(true));
    
    component.onLogin();
    
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should show error on login failure', () => {
    component.username = 'testuser';
    component.password = 'wrong';
    authService.login.and.returnValue(of(false));
    
    component.onLogin();
    
    expect(component.errorMessage).toContain('Invalid');
  });
});