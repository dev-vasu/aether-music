import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HomeActions } from './home.actions';
import { YoutubeService } from '../../services/youtube.service';
import { catchError, from, map, of, switchMap } from 'rxjs';

@Injectable()
export class HomeEffects {
  private actions$ = inject(Actions);
  private ytService = inject(YoutubeService);

  loadCategorizedMusic$ = createEffect(() =>
    this.actions$.pipe(
      ofType(HomeActions.loadCategorizedMusic),
      switchMap(() => {
        // Purge any stale legacy 24-hour localStorage cache to ensure dynamic refreshes
        if (typeof localStorage !== 'undefined') {
          try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
              const key = localStorage.key(i);
              if (key && (key.startsWith('melody_home_cache') || key.startsWith('melody_cache_v13_Arijit') || key.startsWith('melody_cache_v13_Diljit'))) {
                localStorage.removeItem(key);
              }
            }
          } catch {}
        }

        return from(this.ytService.getCategorizedHomeMusic()).pipe(
          map(results => {
            const filterRowUnique = (tracks: any[]) => {
              if (!Array.isArray(tracks)) return [];
              const seenNames = new Set<string>();
              const mashupTerms = ['mashup', 'mash up', 'compilation', 'jukebox', 'nonstop', 'fan edit', 'full album'];
              return tracks.filter(t => {
                if (!t || !t.name) return false;
                const lower = t.name.toLowerCase();
                if (mashupTerms.some(term => lower.includes(term))) return false;
                const normalizedName = lower.replace(/[^a-z0-9]/g, '').substring(0, 15);
                if (seenNames.has(normalizedName)) return false;
                seenNames.add(normalizedName);
                return true;
              });
            };

            const curated = this.ytService.getCuratedMockData();
            const trendingTracks = filterRowUnique(results?.trending);
            const hindiTracks = filterRowUnique(results?.hindi);
            const englishTracks = filterRowUnique(results?.english);
            const punjabiTracks = filterRowUnique(results?.punjabi);
            const instaTracks = filterRowUnique(results?.instaViral);
            const devotionalTracks = filterRowUnique(results?.devotional);

            const finalized = {
              trending: trendingTracks.length >= 3 ? trendingTracks : curated.trending,
              hindi: hindiTracks.length >= 3 ? hindiTracks : curated.hindi,
              english: englishTracks.length >= 3 ? englishTracks : curated.english,
              punjabi: punjabiTracks.length >= 3 ? punjabiTracks : curated.punjabi,
              instaViral: instaTracks.length >= 3 ? instaTracks : curated.instaViral,
              devotional: devotionalTracks.length >= 3 ? devotionalTracks : curated.devotional
            };

            return HomeActions.loadCategorizedMusicSuccess(finalized);
          }),
          catchError(() => of(HomeActions.loadCategorizedMusicSuccess(this.ytService.getCuratedMockData())))
        );
      })
    )
  );
}
