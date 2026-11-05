import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { PlayerActions } from './player.actions';
import { YoutubeService } from '../../services/youtube.service';
import { ColorExtractorService } from '../../services/color-extractor.service';
import { catchError, from, map, of, switchMap } from 'rxjs';

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
          map((tracks) => {
            if (!tracks || tracks.length === 0) {
              const curated = this.youtubeService.getCuratedMockData();
              return PlayerActions.loadTopTracksSuccess({ tracks: curated.trending });
            }
            return PlayerActions.loadTopTracksSuccess({ tracks });
          }),
          catchError((error) => {
            const curated = this.youtubeService.getCuratedMockData();
            return of(PlayerActions.loadTopTracksSuccess({ tracks: curated.trending }));
          })
        )
      )
    )
  );

  searchTracks$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PlayerActions.searchTracks),
      switchMap(({ query }) =>
        from(this.youtubeService.searchMusic(query, { isUserSearch: true })).pipe(
          map((tracks) => {
            if (!tracks || tracks.length === 0) {
              const curated = this.youtubeService.getCuratedMockData();
              const q = query.toLowerCase();
              let matched = Object.values(curated)
                .flat()
                .filter(t => t.name.toLowerCase().includes(q) || t.artists.some((a: any) => a.name.toLowerCase().includes(q)));
              if (matched.length === 0) {
                matched = [...curated.trending, ...curated.instaViral];
              }
              return PlayerActions.searchTracksSuccess({ tracks: matched });
            }
            return PlayerActions.searchTracksSuccess({ tracks });
          }),
          catchError((error) => {
            const curated = this.youtubeService.getCuratedMockData();
            return of(PlayerActions.searchTracksSuccess({ tracks: curated.trending }));
          })
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
        const query = track ? `${track.artists[0]?.name || ''} ${track.name} similar` : '';
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
          map(tracks => {
            if (!tracks || tracks.length === 0) {
              const curated = this.youtubeService.getCuratedMockData();
              return PlayerActions.loadRecommendationsSuccess({ tracks: curated.instaViral });
            }
            return PlayerActions.loadRecommendationsSuccess({ tracks });
          }),
          catchError(() => {
            const curated = this.youtubeService.getCuratedMockData();
            return of(PlayerActions.loadRecommendationsSuccess({ tracks: curated.instaViral }));
          })
        );
      })
    )
  );
}
