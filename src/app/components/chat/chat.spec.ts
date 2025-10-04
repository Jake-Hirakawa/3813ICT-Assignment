import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { Chat } from './chat';

describe('Chat', () => {
  let component: Chat;
  let fixture: ComponentFixture<Chat>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Chat],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { 
            params: of({ groupId: '123', channelId: '456' }),
            snapshot: { params: { groupId: '123', channelId: '456' } }
          }
        },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Chat);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});