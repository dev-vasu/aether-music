import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerBarComponent } from './player-bar';
import { provideStore } from '@ngrx/store';
import { provideRouter } from '@angular/router';
import { playerReducer } from '../../state/player/player.reducer';

describe('PlayerBarComponent', () => {
  let component: PlayerBarComponent;
  let fixture: ComponentFixture<PlayerBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerBarComponent],
      providers: [
        provideStore({ player: playerReducer }),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PlayerBarComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
