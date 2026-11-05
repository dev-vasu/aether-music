import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PlayerState } from './player.reducer';

export const selectPlayerState = createFeatureSelector<PlayerState>('player');

export const selectCurrentTrack = createSelector(
  selectPlayerState,
  (state) => state.currentTrack
);

export const selectIsPlaying = createSelector(
  selectPlayerState,
  (state) => state.isPlaying
);

export const selectPlayerColors = createSelector(
  selectPlayerState,
  (state) => ({ primary: state.primaryColor, secondary: state.secondaryColor })
);

export const selectTopTracks = createSelector(
  selectPlayerState,
  (state) => state.topTracks
);

export const selectRecommendedTracks = createSelector(
  selectPlayerState,
  (state) => state.recommendedTracks
);

export const selectVibeProfile = createSelector(
  selectPlayerState,
  (state) => state.vibeProfile || 'AETHER HARMONIC FLOW'
);

export const selectLoadingRecommendations = createSelector(
  selectPlayerState,
  (state) => state.loadingRecommendations
);

export const selectPlaylists = createSelector(
  selectPlayerState,
  (state) => state.playlists
);

export const selectPlayerLoading = createSelector(
  selectPlayerState,
  (state) => state.loading
);

export const selectQueue = createSelector(
  selectPlayerState,
  (state) => state.queue
);

export const selectQueueIndex = createSelector(
  selectPlayerState,
  (state) => state.queueIndex
);

export const selectIsShuffled = createSelector(
  selectPlayerState,
  (state) => state.isShuffled
);

export const selectRepeatMode = createSelector(
  selectPlayerState,
  (state) => state.repeatMode
);
