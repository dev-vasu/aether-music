import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HomeActions } from './home.actions';
import { YoutubeService } from '../../services/youtube.service';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';

@Injectable()
export class HomeEffects {
  private actions$ = inject(Actions);
  private ytService = inject(YoutubeService);

  private readonly CACHE_KEY = 'melody_home_cache_v8'; // Bumped version for real live music & rich fallbacks
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000;

  loadCategorizedMusic$ = createEffect(() =>
    this.actions$.pipe(
      ofType(HomeActions.loadCategorizedMusic),
      switchMap(() => {
        const cachedData = this.getCache();
        if (cachedData) return of(HomeActions.loadCategorizedMusicSuccess(cachedData));

        return forkJoin({
          trending: this.ytService.searchMusic('top hits 2026 official audio', { useCache: true }),
          hindi: this.ytService.searchMusic('Arijit Singh Pritam hits official audio', { useCache: true }),
          english: this.ytService.searchMusic('Taylor Swift Billie Eilish hits official audio', { useCache: true }),
          punjabi: this.ytService.searchMusic('Diljit Dosanjh Karan Aujla hits official audio', { useCache: true }),
          instaViral: this.ytService.searchMusic('Trending Phonk Drift 2026', { useCache: true }),
          devotional: this.ytService.searchMusic('Coke Studio Pakistan Sufi hits', { useCache: true })
        }).pipe(
          map(results => {
            const filterRowUnique = (tracks: any[]) => {
              if (!Array.isArray(tracks)) return [];
              const seenNames = new Set<string>();
              return tracks.filter(t => {
                if (!t || !t.name) return false;
                const normalizedName = t.name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15);
                if (seenNames.has(normalizedName)) return false;
                seenNames.add(normalizedName);
                return true;
              });
            };

            const curated = this.ytService.getCuratedMockData();
            const trendingTracks = filterRowUnique(results.trending);
            const hindiTracks = filterRowUnique(results.hindi);
            const englishTracks = filterRowUnique(results.english);
            const punjabiTracks = filterRowUnique(results.punjabi);
            const instaTracks = filterRowUnique(results.instaViral);
            const devotionalTracks = filterRowUnique(results.devotional);

            const finalized = {
              trending: trendingTracks.length > 0 ? trendingTracks : curated.trending,
              hindi: hindiTracks.length > 0 ? hindiTracks : curated.hindi,
              english: englishTracks.length > 0 ? englishTracks : curated.english,
              punjabi: punjabiTracks.length > 0 ? punjabiTracks : curated.punjabi,
              instaViral: instaTracks.length > 0 ? instaTracks : curated.instaViral,
              devotional: devotionalTracks.length > 0 ? devotionalTracks : curated.devotional
            };

            this.saveCache(finalized);
            return HomeActions.loadCategorizedMusicSuccess(finalized);
          }),
          catchError(() => of(HomeActions.loadCategorizedMusicSuccess(this.ytService.getCuratedMockData())))
        );
      })
    )
  );

  private getCache() {
    try {
      const item = localStorage.getItem(this.CACHE_KEY);
      if (!item) return null;
      const parsed = JSON.parse(item);
      if (Date.now() - parsed.timestamp > this.CACHE_EXPIRY) {
        localStorage.removeItem(this.CACHE_KEY);
        return null;
      }
      return parsed.data;
    } catch { return null; }
  }

  private saveCache(data: any) {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: data
      }));
    } catch {}
  }
}
