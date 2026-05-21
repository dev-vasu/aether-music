import { createReducer, on } from '@ngrx/store';
import { AuthActions } from './auth.actions';

export interface AuthState {
  isAuthenticated: boolean;
  error: string | null;
  loading: boolean;
}

export const initialState: AuthState = {
  isAuthenticated: false,
  error: null,
  loading: false,
};

export const authReducer = createReducer(
  initialState,
  on(AuthActions.login, (state) => ({ ...state, loading: true, error: null })),
  on(AuthActions.loginSuccess, (state, { authenticated }) => ({
    ...state,
    isAuthenticated: authenticated,
    loading: false,
  })),
  on(AuthActions.loginFailure, (state, { error }) => ({
    ...state,
    error,
    loading: false,
  })),
  on(AuthActions.logout, () => initialState)
);
