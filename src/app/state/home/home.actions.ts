import { createActionGroup, emptyProps, props } from '@ngrx/store';

export const HomeActions = createActionGroup({
  source: 'Home',
  events: {
    'Load Categorized Music': emptyProps(),
    'Load Categorized Music Success': props<{ 
        trending: any[], 
        hindi: any[], 
        english: any[], 
        punjabi: any[], 
        instaViral: any[], 
        devotional: any[] 
    }>(),
    'Load Categorized Music Failure': props<{ error: string }>(),
  }
});
