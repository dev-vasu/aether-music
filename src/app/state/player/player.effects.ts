import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { PlayerActions } from './player.actions';
import { selectCurrentTrack } from './player.selectors';
import { YoutubeService } from '../../services/youtube.service';
import { ColorExtractorService } from '../../services/color-extractor.service';
import { catchError, from, map, of, switchMap, withLatestFrom } from 'rxjs';

@Injectable()
export class PlayerEffects {
  private actions$ = inject(Actions);
  private store = inject(Store);
  private youtubeService = inject(YoutubeService);
  private colorExtractor = inject(ColorExtractorService);

  loadTopTracks$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PlayerActions.loadTopTracks),
      switchMap(() =>
        from(this.youtubeService.searchMusic('', { useCache: true, maxResults: 20 })).pipe(
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
        from(this.youtubeService.searchMusic(query, { isUserSearch: true, maxResults: 24 })).pipe(
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

  // Trigger recommendation loading whenever a track is set, queued, or advanced
  triggerRecommendations$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        PlayerActions.setCurrentTrack,
        PlayerActions.setQueue,
        PlayerActions.next,
        PlayerActions.previous
      ),
      withLatestFrom(this.store.select(selectCurrentTrack)),
      map(([action, currentTrack]) => {
        let track = currentTrack;
        if ('track' in action && action.track) {
          track = action.track;
        } else if ('tracks' in action && action.tracks && action.tracks.length > 0) {
          const idx = action.startIndex || 0;
          track = action.tracks[idx] || action.tracks[0];
        }
        return PlayerActions.loadRecommendations({
          query: track ? `${track.artists?.[0]?.name || ''} ${track.name}` : '',
          track
        });
      })
    )
  );

  loadRecommendations$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PlayerActions.loadRecommendations),
      withLatestFrom(this.store.select(selectCurrentTrack)),
      switchMap(([{ track }, currentTrack]) => {
        const targetTrack = track || currentTrack;
        return from(this.youtubeService.getVibeRecommendations(targetTrack)).pipe(
          map(({ tracks, vibeProfile }) =>
            PlayerActions.loadRecommendationsSuccess({ tracks, vibeProfile })
          ),
          catchError(() => {
            const curated = this.youtubeService.getCuratedMockData();
            return of(PlayerActions.loadRecommendationsSuccess({
              tracks: curated.trending,
              vibeProfile: 'GLOBAL POP // 120 BPM'
            }));
          })
        );
      })
    )
  );
}
