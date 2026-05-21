import { createReducer, on } from '@ngrx/store';
import { PlayerActions } from './player.actions';

export interface PlayerState {
  currentTrack: any | null;
  playbackHistory: any[];
  isPlaying: boolean;
  volume: number;
  progress: number;
  playlists: any[];
  topTracks: any[];
  recommendedTracks: any[];
  primaryColor: string;
  secondaryColor: string;
  loading: boolean;
  error: string | null;
}

export const initialState: PlayerState = {
  currentTrack: null,
  playbackHistory: [],
  isPlaying: false,
  volume: 50,
  progress: 0,
  playlists: [],
  topTracks: [],
  recommendedTracks: [],
  primaryColor: '#6366f1',
  secondaryColor: '#a855f7',
  loading: false,
  error: null,
};

export const playerReducer = createReducer(
  initialState,
  on(PlayerActions.setCurrentTrack, (state, { track }) => {
    const history = state.currentTrack ? [...state.playbackHistory, state.currentTrack] : state.playbackHistory;
    // Limit history size to 50
    const limitedHistory = history.slice(-50);
    return {
      ...state,
      currentTrack: track,
      playbackHistory: limitedHistory,
      isPlaying: true
    };
  }),
  on(PlayerActions.next, (state) => {
    if (state.recommendedTracks.length === 0) return state;
    const nextTrack = state.recommendedTracks[0];
    const newRecommended = state.recommendedTracks.slice(1);
    const history = state.currentTrack ? [...state.playbackHistory, state.currentTrack] : state.playbackHistory;
    return {
      ...state,
      currentTrack: nextTrack,
      recommendedTracks: newRecommended,
      playbackHistory: history.slice(-50),
      isPlaying: true
    };
  }),
  on(PlayerActions.previous, (state) => {
    if (state.playbackHistory.length === 0) return state;
    const prevTrack = state.playbackHistory[state.playbackHistory.length - 1];
    const newHistory = state.playbackHistory.slice(0, -1);
    // When going back, the track we left doesn't necessarily go to recommendations, 
    // but for simplicity we'll just swap
    return {
      ...state,
      currentTrack: prevTrack,
      playbackHistory: newHistory,
      isPlaying: true
    };
  }),
  on(PlayerActions.play, (state) => ({ ...state, isPlaying: true })),
  on(PlayerActions.pause, (state) => ({ ...state, isPlaying: false })),
  on(PlayerActions.setVolume, (state, { volume }) => ({ ...state, volume })),
  on(PlayerActions.setProgress, (state, { progress }) => ({ ...state, progress })),
  on(PlayerActions.setColors, (state, { primary, secondary }) => ({
    ...state,
    primaryColor: primary,
    secondaryColor: secondary,
  })),
  on(PlayerActions.loadRecommendationsSuccess, (state, { tracks }) => ({
    ...state,
    recommendedTracks: tracks
  })),
  on(PlayerActions.loadTopTracksSuccess, (state, { tracks }) => ({
    ...state,
    topTracks: tracks,
    loading: false,
  }))
);
