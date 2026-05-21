import { createReducer, on } from '@ngrx/store';
import { HomeActions } from './home.actions';

export interface HomeState {
  trending: any[];
  hindi: any[];
  english: any[];
  punjabi: any[];
  instaViral: any[];
  devotional: any[];
  loading: boolean;
  error: string | null;
}

export const initialState: HomeState = {
  trending: [],
  hindi: [],
  english: [],
  punjabi: [],
  instaViral: [],
  devotional: [],
  loading: false,
  error: null,
};

export const homeReducer = createReducer(
  initialState,
  on(HomeActions.loadCategorizedMusic, (state) => ({ ...state, loading: true })),
  on(HomeActions.loadCategorizedMusicSuccess, (state, results) => ({
    ...state,
    ...results,
    loading: false,
  })),
  on(HomeActions.loadCategorizedMusicFailure, (state, { error }) => ({
    ...state,
    error,
    loading: false,
  }))
);
