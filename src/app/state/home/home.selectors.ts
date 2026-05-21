import { createFeatureSelector, createSelector } from '@ngrx/store';
import { HomeState } from './home.reducer';

export const selectHomeState = createFeatureSelector<HomeState>('home');

export const selectCategorizedMusic = createSelector(
  selectHomeState,
  (state) => ({
    trending: state.trending,
    hindi: state.hindi,
    english: state.english,
    punjabi: state.punjabi,
    instaViral: state.instaViral,
    devotional: state.devotional
  })
);

export const selectHomeLoading = createSelector(
  selectHomeState,
  (state) => state.loading
);
