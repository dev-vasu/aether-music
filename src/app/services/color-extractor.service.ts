import { Injectable } from '@angular/core';
import * as ColorThiefNamespace from 'colorthief';

const ColorThief = (ColorThiefNamespace as any).default || ColorThiefNamespace;

@Injectable({
  providedIn: 'root'
})
export class ColorExtractorService {
  private colorThief: any;

  extractColors(imageUrl: string): Promise<{ primary: string, secondary: string }> {
    if (!this.colorThief) {
      try {
        this.colorThief = new ColorThief();
      } catch (e) {
        console.error('Failed to initialize ColorThief', e);
        return Promise.resolve({ primary: '#6366f1', secondary: '#a855f7' });
      }
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = imageUrl;
      img.onload = () => {
        try {
            const palette = this.colorThief.getPalette(img, 5);
            let primary = `rgb(${palette[0].join(',')})`;
            let secondary = `rgb(${palette[1].join(',')})`;
            
            // Aether Shift: If color is too green/dark, shift it to cosmic violet/indigo
            const r = palette[0][0], g = palette[0][1], b = palette[0][2];
            // Detect "Spotify Green" range (high green, low red/blue)
            if (g > 150 && r < 100 && b < 100) {
                primary = '#a855f7'; // Force to Violet
            }
            
            resolve({ primary, secondary });
        } catch (e) {
            resolve({ primary: '#6366f1', secondary: '#a855f7' });
        }
      };
      img.onerror = (err) => resolve({ primary: '#6366f1', secondary: '#a855f7' });
    });
  }
}
