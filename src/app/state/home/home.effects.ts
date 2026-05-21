import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HomeActions } from './home.actions';
import { YoutubeService } from '../../services/youtube.service';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';

@Injectable()
export class HomeEffects {
  private actions$ = inject(Actions);
  private ytService = inject(YoutubeService);

  private readonly CACHE_KEY = 'melody_home_cache_v7'; // Bumped version for Ultra-HD thumbnails
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000;

  loadCategorizedMusic$ = createEffect(() =>
    this.actions$.pipe(
      ofType(HomeActions.loadCategorizedMusic),
      switchMap(() => {
        const cachedData = this.getCache();
        if (cachedData) return of(HomeActions.loadCategorizedMusicSuccess(cachedData));

        return forkJoin({
          trending: this.ytService.searchMusic('The Weeknd, Dua Lipa, Travis Scott official audio', { useCache: true }),
          hindi: this.ytService.searchMusic('Arijit Singh, Anirudh Ravichander official audio', { useCache: true }),
          english: this.ytService.searchMusic('Billie Eilish, Post Malone, Taylor Swift official audio', { useCache: true }),
          punjabi: this.ytService.searchMusic('Diljit Dosanjh, AP Dhillon, Karan Aujla official audio', { useCache: true }),
          instaViral: this.ytService.searchMusic('Trending Phonk Drift 2026 official audio', { useCache: true }),
          devotional: this.ytService.searchMusic('Coke Studio Pakistan 2026 official audio', { useCache: true })
        }).pipe(
          map(results => {
            // SMART CONTENT DIVERSIFIER: Filter by normalized name to prevent re-uploads
            const filterRowUnique = (tracks: any[]) => {
                const seenNames = new Set<string>();
                return tracks.filter(t => {
                    const normalizedName = t.name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15);
                    if (seenNames.has(normalizedName)) return false;
                    seenNames.add(normalizedName);
                    return true;
                });
            };

            const finalized = {
                trending: filterRowUnique(results.trending),
                hindi: filterRowUnique(results.hindi),
                english: filterRowUnique(results.english),
                punjabi: filterRowUnique(results.punjabi),
                instaViral: filterRowUnique(results.instaViral),
                devotional: filterRowUnique(results.devotional)
            };

            const hasData = Object.values(finalized).some(row => row.length > 0);
            if (hasData) {
                this.saveCache(finalized);
                return HomeActions.loadCategorizedMusicSuccess(finalized);
            } else {
                return HomeActions.loadCategorizedMusicSuccess(this.ytService.getCuratedMockData());
            }
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
