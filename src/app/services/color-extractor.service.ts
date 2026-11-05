import { Injectable } from '@angular/core';
import { getPalette } from 'colorthief';

@Injectable({
  providedIn: 'root'
})
export class ColorExtractorService {
  async extractColors(imageUrl: string): Promise<{ primary: string; secondary: string }> {
    const fallback = { primary: '#6366f1', secondary: '#a855f7' };
    if (!imageUrl) return fallback;

    return new Promise<{ primary: string; secondary: string }>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = imageUrl;

      img.onload = async () => {
        try {
          const palette = await getPalette(img, { colorCount: 5 });
          if (!palette || palette.length === 0) {
            return resolve(fallback);
          }

          let primary = palette[0]?.hex() || fallback.primary;
          let secondary = palette[1]?.hex() || palette[0]?.hex() || fallback.secondary;

          // Color calibration: if primary is too green, shift to cosmic violet
          const rgb = palette[0]?.rgb();
          if (rgb && rgb.g > 150 && rgb.r < 100 && rgb.b < 100) {
            primary = '#a855f7';
          }

          resolve({ primary, secondary });
        } catch {
          resolve(fallback);
        }
      };

      img.onerror = () => resolve(fallback);
    });
  }
}
