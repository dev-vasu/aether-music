import { createActionGroup, emptyProps, props } from '@ngrx/store';

export const PlayerActions = createActionGroup({
  source: 'Player',
  events: {
    'Load Playlists': emptyProps(),
    'Load Playlists Success': props<{ playlists: any[] }>(),
    'Load Playlists Failure': props<{ error: string }>(),
    'Load Top Tracks': emptyProps(),
    'Load Top Tracks Success': props<{ tracks: any[] }>(),
    'Load Top Tracks Failure': props<{ error: string }>(),
    'Search Tracks': props<{ query: string }>(),
    'Search Tracks Success': props<{ tracks: any[] }>(),
    'Search Tracks Failure': props<{ error: string }>(),
    'Set Current Track': props<{ track: any }>(),
    'Set Queue': props<{ tracks: any[]; startIndex?: number }>(),
    'Play': emptyProps(),
    'Pause': emptyProps(),
    'Next': emptyProps(),
    'Previous': emptyProps(),
    'Toggle Shuffle': emptyProps(),
    'Cycle Repeat': emptyProps(),
    'Set Volume': props<{ volume: number }>(),
    'Set Progress': props<{ progress: number }>(),
    'Set Colors': props<{ primary: string; secondary: string }>(),
    'Load Recommendations': props<{ query?: string; track?: any }>(),
    'Load Recommendations Success': props<{ tracks: any[]; vibeProfile?: string }>(),
    'Load Recommendations Failure': props<{ error: string }>(),
  }
});
