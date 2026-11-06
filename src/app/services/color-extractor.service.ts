import { Injectable } from '@angular/core';
import { getPalette } from 'colorthief';

@Injectable({
  providedIn: 'root'
})
export class ColorExtractorService {
  private knownPalettes: Record<string, { primary: string; secondary: string }> = {
    'blinding lights': { primary: '#e11d48', secondary: '#f97316' },
    'starboy': { primary: '#dc2626', secondary: '#7c3aed' },
    'levitating': { primary: '#ec4899', secondary: '#6366f1' },
    'despacito': { primary: '#f59e0b', secondary: '#ea580c' },
    'yellow': { primary: '#eab308', secondary: '#06b6d4' },
    'one dance': { primary: '#f43f5e', secondary: '#fbbf24' },
    'shape of you': { primary: '#0284c7', secondary: '#38bdf8' },
    'kesariya': { primary: '#ff6f00', secondary: '#dc2626' },
    'raataan lambiyan': { primary: '#8b5cf6', secondary: '#3b82f6' },
    'tum hi ho': { primary: '#4f46e5', secondary: '#ec4899' },
    'apna bana le': { primary: '#ea580c', secondary: '#f59e0b' },
    'chaleya': { primary: '#e11d48', secondary: '#f43f5e' },
    'heeriye': { primary: '#d946ef', secondary: '#f43f5e' },
    'tum se hi': { primary: '#06b6d4', secondary: '#3b82f6' },
    'as it was': { primary: '#f43f5e', secondary: '#0ea5e9' },
    'flowers': { primary: '#f59e0b', secondary: '#fbbf24' },
    'circles': { primary: '#ca8a04', secondary: '#854d0e' },
    'birds of a feather': { primary: '#10b981', secondary: '#06b6d4' },
    'perfect': { primary: '#0284c7', secondary: '#6366f1' },
    '295': { primary: '#d97706', secondary: '#b45309' },
    'lover': { primary: '#ec4899', secondary: '#f43f5e' },
    'proper patola': { primary: '#f59e0b', secondary: '#e11d48' },
    'brown munde': { primary: '#d97706', secondary: '#475569' },
    'softly': { primary: '#f43f5e', secondary: '#fb923c' },
    'metamorphosis': { primary: '#06b6d4', secondary: '#8b5cf6' },
    'midnight': { primary: '#8b5cf6', secondary: '#ec4899' },
    'sahara': { primary: '#f59e0b', secondary: '#dc2626' },
    'murder in my mind': { primary: '#ef4444', secondary: '#b91c1c' },
    'close eyes': { primary: '#6366f1', secondary: '#06b6d4' },
    'ramayan': { primary: '#f59e0b', secondary: '#d97706' },
    'pasoori': { primary: '#f43f5e', secondary: '#f59e0b' },
    'tu jhoom': { primary: '#8b5cf6', secondary: '#d946ef' },
    'afreen afreen': { primary: '#e11d48', secondary: '#fbbf24' },
    'kun faya kun': { primary: '#0d9488', secondary: '#f59e0b' },
    'hanuman chalisa': { primary: '#ea580c', secondary: '#f59e0b' }
  };

  async extractColors(imageUrl: string, trackName?: string, artistName?: string): Promise<{ primary: string; secondary: string }> {
    const key = (trackName || '').toLowerCase().trim();
    if (key && this.knownPalettes[key]) {
      return this.knownPalettes[key];
    }

    const defaultFallback = { primary: '#ff5722', secondary: '#f59e0b' };
    if (!imageUrl) return defaultFallback;

    return new Promise<{ primary: string; secondary: string }>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = imageUrl;

      const timeout = setTimeout(() => {
        resolve(this.getFallbackByString(trackName || artistName || imageUrl));
      }, 1200);

      img.onload = async () => {
        clearTimeout(timeout);
        try {
          const palette = await getPalette(img, { colorCount: 5 });
          if (!palette || palette.length === 0) {
            return resolve(this.getFallbackByString(trackName || artistName || imageUrl));
          }

          let primary = palette[0]?.hex() || defaultFallback.primary;
          let secondary = palette[1]?.hex() || palette[0]?.hex() || defaultFallback.secondary;

          resolve({ primary, secondary });
        } catch {
          resolve(this.getFallbackByString(trackName || artistName || imageUrl));
        }
      };

      img.onerror = () => {
        clearTimeout(timeout);
        resolve(this.getFallbackByString(trackName || artistName || imageUrl));
      };
    });
  }

  private getFallbackByString(str: string): { primary: string; secondary: string } {
    const palettes = [
      { primary: '#ff5722', secondary: '#f59e0b' }, // Braun Amber & Gold
      { primary: '#06b6d4', secondary: '#6366f1' }, // Cyan & Indigo
      { primary: '#ec4899', secondary: '#f43f5e' }, // Pink & Rose
      { primary: '#8b5cf6', secondary: '#3b82f6' }, // Violet & Blue
      { primary: '#10b981', secondary: '#059669' }, // Emerald & Jade
      { primary: '#e11d48', secondary: '#fb923c' }, // Crimson & Peach
      { primary: '#f59e0b', secondary: '#d97706' }, // Saffron & Ochre
      { primary: '#6366f1', secondary: '#a855f7' }  // Purple & Lilac
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % palettes.length;
    return palettes[idx];
  }
}
