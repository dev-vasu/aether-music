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
    'Set Current Track': props<{ track: any }>(),
    'Play': emptyProps(),
    'Pause': emptyProps(),
    'Next': emptyProps(),
    'Previous': emptyProps(),
    'Set Volume': props<{ volume: number }>(),
    'Set Progress': props<{ progress: number }>(),
    'Set Colors': props<{ primary: string, secondary: string }>(),
    'Load Recommendations': props<{ query: string }>(),
    'Load Recommendations Success': props<{ tracks: any[] }>(),
    'Load Recommendations Failure': props<{ error: string }>(),
  }
});
