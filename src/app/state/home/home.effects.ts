import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HomeActions } from './home.actions';
import { YoutubeService } from '../../services/youtube.service';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';

@Injectable()
export class HomeEffects {
  private actions$ = inject(Actions);
  private ytService = inject(YoutubeService);

  // Bumped to v12 to purge broken image cache and load verified studio covers
  private readonly CACHE_KEY = 'melody_home_cache_v12';
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000;

  loadCategorizedMusic$ = createEffect(() =>
    this.actions$.pipe(
      ofType(HomeActions.loadCategorizedMusic),
      switchMap(() => {
        const cachedData = this.getCache();
        if (cachedData) return of(HomeActions.loadCategorizedMusicSuccess(cachedData));

        return forkJoin({
          trending: this.ytService.searchMusic('The Weeknd Dua Lipa Coldplay hits', { useCache: true }),
          hindi: this.ytService.searchMusic('Arijit Singh Pritam', { useCache: true }),
          english: this.ytService.searchMusic('Taylor Swift Billie Eilish', { useCache: true }),
          punjabi: this.ytService.searchMusic('Diljit Dosanjh Karan Aujla', { useCache: true }),
          instaViral: this.ytService.searchMusic('INTERWORLD Kordhell Phonk', { useCache: true }),
          devotional: this.ytService.searchMusic('Jagjit Singh Ramayan Hariharan', { useCache: true })
        }).pipe(
          map(results => {
            const filterRowUnique = (tracks: any[]) => {
              if (!Array.isArray(tracks)) return [];
              const seenNames = new Set<string>();
              return tracks.filter(t => {
                if (!t || !t.name) return false;
                const lower = t.name.toLowerCase();
                if (lower.includes('die with a smile')) return false;
                const normalizedName = lower.replace(/[^a-z0-9]/g, '').substring(0, 15);
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
              trending: trendingTracks.length >= 4 ? trendingTracks : curated.trending,
              hindi: hindiTracks.length >= 4 ? hindiTracks : curated.hindi,
              english: englishTracks.length >= 4 ? englishTracks : curated.english,
              punjabi: punjabiTracks.length >= 4 ? punjabiTracks : curated.punjabi,
              instaViral: instaTracks.length >= 4 ? instaTracks : curated.instaViral,
              devotional: devotionalTracks.length >= 4 ? devotionalTracks : curated.devotional
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
