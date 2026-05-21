import { createActionGroup, emptyProps, props } from '@ngrx/store';

export const AuthActions = createActionGroup({
  source: 'Auth',
  events: {
    'Login': emptyProps(),
    'Login Success': props<{ authenticated: boolean }>(),
    'Login Failure': props<{ error: string }>(),
    'Logout': emptyProps(),
  }
});
