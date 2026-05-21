import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { AuthActions } from './auth.actions';
import { PlayerActions } from '../player/player.actions';
import { of, switchMap } from 'rxjs';

@Injectable()
export class AuthEffects {
  private actions$ = inject(Actions);

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      switchMap(() => of(AuthActions.loginSuccess({ authenticated: true })))
    )
  );

  loginSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loginSuccess),
      switchMap(() => [
        PlayerActions.loadPlaylists(),
        PlayerActions.loadTopTracks()
      ])
    )
  );
}
