import { createReducer, on } from '@ngrx/store';
import { PlayerActions } from './player.actions';

export type RepeatMode = 'off' | 'all' | 'one';

export interface PlayerState {
  currentTrack: any | null;
  playbackHistory: any[];
  queue: any[];
  originalQueue: any[];
  queueIndex: number;
  isShuffled: boolean;
  repeatMode: RepeatMode;
  isPlaying: boolean;
  volume: number;
  progress: number;
  playlists: any[];
  topTracks: any[];
  searchResults: any[];
  recommendedTracks: any[];
  vibeProfile: string;
  loadingRecommendations: boolean;
  primaryColor: string;
  secondaryColor: string;
  loading: boolean;
  error: string | null;
}

export const initialState: PlayerState = {
  currentTrack: null,
  playbackHistory: [],
  queue: [],
  originalQueue: [],
  queueIndex: -1,
  isShuffled: false,
  repeatMode: 'off',
  isPlaying: false,
  volume: 50,
  progress: 0,
  playlists: [],
  topTracks: [],
  searchResults: [],
  recommendedTracks: [],
  vibeProfile: 'AETHER HARMONIC FLOW',
  loadingRecommendations: false,
  primaryColor: '#ff5722',
  secondaryColor: '#f59e0b',
  loading: false,
  error: null,
};

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const playerReducer = createReducer(
  initialState,
  on(PlayerActions.setCurrentTrack, (state, { track }) => {
    if (!track) return state;
    const history = state.currentTrack ? [...state.playbackHistory, state.currentTrack] : state.playbackHistory;
    const limitedHistory = history.slice(-50);
    
    // Find index in current queue or append
    let newQueue = state.queue;
    let idx = state.queue.findIndex(t => t.id === track.id);
    if (idx === -1) {
      newQueue = [...state.queue, track];
      idx = newQueue.length - 1;
    }

    return {
      ...state,
      currentTrack: track,
      playbackHistory: limitedHistory,
      queue: newQueue,
      queueIndex: idx,
      isPlaying: true
    };
  }),

  on(PlayerActions.setQueue, (state, { tracks, startIndex = 0 }) => {
    if (!tracks || tracks.length === 0) return state;
    const validIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
    const track = tracks[validIndex];
    const history = state.currentTrack ? [...state.playbackHistory, state.currentTrack] : state.playbackHistory;

    let activeQueue = [...tracks];
    if (state.isShuffled) {
      const remaining = tracks.filter((_, i) => i !== validIndex);
      activeQueue = [track, ...shuffleArray(remaining)];
    }

    return {
      ...state,
      queue: activeQueue,
      originalQueue: [...tracks],
      queueIndex: state.isShuffled ? 0 : validIndex,
      currentTrack: track,
      playbackHistory: history.slice(-50),
      isPlaying: true
    };
  }),

  on(PlayerActions.toggleShuffle, (state) => {
    const newShuffled = !state.isShuffled;
    if (newShuffled) {
      if (!state.currentTrack || state.queue.length <= 1) {
        return { ...state, isShuffled: true };
      }
      const rest = state.queue.filter(t => t.id !== state.currentTrack.id);
      const shuffledQueue = [state.currentTrack, ...shuffleArray(rest)];
      return {
        ...state,
        isShuffled: true,
        queue: shuffledQueue,
        queueIndex: 0
      };
    } else {
      const orig = state.originalQueue.length > 0 ? state.originalQueue : state.queue;
      const idx = orig.findIndex(t => t.id === state.currentTrack?.id);
      return {
        ...state,
        isShuffled: false,
        queue: orig,
        queueIndex: idx !== -1 ? idx : 0
      };
    }
  }),

  on(PlayerActions.cycleRepeat, (state) => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const currentIdx = modes.indexOf(state.repeatMode);
    const nextMode = modes[(currentIdx + 1) % modes.length];
    return { ...state, repeatMode: nextMode };
  }),

  on(PlayerActions.next, (state) => {
    // If repeat mode is 'one' and we have a current track, restart it
    if (state.repeatMode === 'one' && state.currentTrack) {
      return { ...state, isPlaying: true, progress: 0 };
    }

    // Queue progression
    if (state.queue.length > 0 && state.queueIndex < state.queue.length - 1) {
      const nextIndex = state.queueIndex + 1;
      const nextTrack = state.queue[nextIndex];
      const history = state.currentTrack ? [...state.playbackHistory, state.currentTrack] : state.playbackHistory;
      return {
        ...state,
        currentTrack: nextTrack,
        queueIndex: nextIndex,
        playbackHistory: history.slice(-50),
        isPlaying: true
      };
    }

    // If reached end of queue and repeat mode is 'all'
    if (state.repeatMode === 'all' && state.queue.length > 0) {
      const history = state.currentTrack ? [...state.playbackHistory, state.currentTrack] : state.playbackHistory;
      return {
        ...state,
        currentTrack: state.queue[0],
        queueIndex: 0,
        playbackHistory: history.slice(-50),
        isPlaying: true
      };
    }

    // Fall back to recommended tracks if queue is exhausted
    if (state.recommendedTracks.length > 0) {
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
    }

    return state;
  }),

  on(PlayerActions.previous, (state) => {
    // If we have previous in queue
    if (state.queue.length > 0 && state.queueIndex > 0) {
      const prevIndex = state.queueIndex - 1;
      const prevTrack = state.queue[prevIndex];
      return {
        ...state,
        currentTrack: prevTrack,
        queueIndex: prevIndex,
        isPlaying: true
      };
    }

    // Otherwise fall back to history
    if (state.playbackHistory.length > 0) {
      const prevTrack = state.playbackHistory[state.playbackHistory.length - 1];
      const newHistory = state.playbackHistory.slice(0, -1);
      return {
        ...state,
        currentTrack: prevTrack,
        playbackHistory: newHistory,
        isPlaying: true
      };
    }

    return state;
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
  on(PlayerActions.loadRecommendations, (state) => ({
    ...state,
    loadingRecommendations: true
  })),
  on(PlayerActions.loadRecommendationsSuccess, (state, { tracks, vibeProfile }) => ({
    ...state,
    recommendedTracks: tracks,
    vibeProfile: vibeProfile || state.vibeProfile,
    loadingRecommendations: false
  })),
  on(PlayerActions.loadRecommendationsFailure, (state) => ({
    ...state,
    loadingRecommendations: false
  })),
  on(PlayerActions.loadTopTracksSuccess, (state, { tracks }) => ({
    ...state,
    topTracks: tracks,
    loading: false,
  })),
  on(PlayerActions.searchTracks, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  on(PlayerActions.searchTracksSuccess, (state, { tracks }) => ({
    ...state,
    searchResults: tracks,
    topTracks: tracks,
    loading: false
  })),
  on(PlayerActions.searchTracksFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  }))
);
