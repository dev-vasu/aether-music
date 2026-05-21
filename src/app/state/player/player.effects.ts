import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { PlayerActions } from './player.actions';
import { YoutubeService } from '../../services/youtube.service';
import { ColorExtractorService } from '../../services/color-extractor.service';
import { catchError, from, map, of, switchMap, tap } from 'rxjs';

@Injectable()
export class PlayerEffects {
  private actions$ = inject(Actions);
  private youtubeService = inject(YoutubeService);
  private colorExtractor = inject(ColorExtractorService);

  loadTopTracks$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PlayerActions.loadTopTracks),
      switchMap(() =>
        from(this.youtubeService.searchMusic('')).pipe(
          map((tracks) => PlayerActions.loadTopTracksSuccess({ tracks })),
          catchError((error) => of(PlayerActions.loadTopTracksFailure({ error: error.message })))
        )
      )
    )
  );

  updateColors$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PlayerActions.setCurrentTrack),
      switchMap(({ track }) => {
        const imageUrl = track?.album?.images?.[0]?.url;
        if (!imageUrl) return of(PlayerActions.setColors({ primary: '#6366f1', secondary: '#a855f7' }));
        return from(this.colorExtractor.extractColors(imageUrl)).pipe(
          map(({ primary, secondary }) => PlayerActions.setColors({ primary, secondary })),
          catchError(() => of(PlayerActions.setColors({ primary: '#6366f1', secondary: '#a855f7' })))
        );
      })
    )
  );

  // Trigger recommendation loading when a track is set
  triggerRecommendations$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PlayerActions.setCurrentTrack),
      map(({ track }) => {
          const query = track ? `${track.artists[0].name} ${track.name} similar` : '';
          return PlayerActions.loadRecommendations({ query });
      })
    )
  );

  loadRecommendations$ = createEffect(() =>
    this.actions$.pipe(
        ofType(PlayerActions.loadRecommendations),
        switchMap(({ query }) => {
            if (!query) return of(PlayerActions.loadRecommendationsSuccess({ tracks: [] }));
            return from(this.youtubeService.searchMusic(query, { useCache: true, maxResults: 10 })).pipe(
                map(tracks => PlayerActions.loadRecommendationsSuccess({ tracks })),
                catchError(err => of(PlayerActions.loadRecommendationsFailure({ error: err.message })))
            );
        })
    )
  );
}
