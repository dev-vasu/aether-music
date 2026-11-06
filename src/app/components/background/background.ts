import { Component, inject, computed } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectPlayerColors } from '../../state/player/player.selectors';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-background',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="braun-universe" [style.background]="universeBackground()">
      <!-- Primary Song Aura (Upper Corner) -->
      <div class="ambient-glow glow-primary" [style.background]="primaryGlow()"></div>

      <!-- Secondary Song Aura (Lower Corner) -->
      <div class="ambient-glow glow-secondary" [style.background]="secondaryGlow()"></div>

      <!-- Center Harmonic Halo -->
      <div class="ambient-glow glow-center" [style.background]="centerGlow()"></div>

      <!-- Horizon Reflection Base -->
      <div class="ambient-glow glow-horizon" [style.background]="horizonGlow()"></div>
      
      <!-- Fine Acoustic Grid Texture -->
      <div class="subtle-texture"></div>

      <!-- Atmospheric Vignette -->
      <div class="vignette"></div>
    </div>
  `,
  styles: [`
    .braun-universe {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: -1;
      overflow: hidden;
      background: #111215;
      pointer-events: none;
      transition: background 1.6s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .ambient-glow {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
      transition: background 1.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.6s ease;
      will-change: transform, background;
    }

    .glow-primary {
      width: 80vw;
      height: 75vh;
      top: -15%;
      left: -8%;
      filter: blur(100px);
      opacity: 0.75;
      animation: floatPrimary 18s ease-in-out infinite alternate;
    }

    .glow-secondary {
      width: 85vw;
      height: 80vh;
      bottom: -18%;
      right: -8%;
      filter: blur(110px);
      opacity: 0.70;
      animation: floatSecondary 22s ease-in-out infinite alternate;
    }

    .glow-center {
      width: 65vw;
      height: 55vh;
      top: 25%;
      left: 20%;
      filter: blur(120px);
      opacity: 0.55;
      animation: floatCenter 26s ease-in-out infinite alternate;
    }

    .glow-horizon {
      width: 95vw;
      height: 40vh;
      bottom: -5%;
      left: 2.5%;
      filter: blur(90px);
      opacity: 0.60;
    }

    @keyframes floatPrimary {
      0% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(4vw, 3vh) scale(1.08); }
      100% { transform: translate(-3vw, 5vh) scale(0.96); }
    }

    @keyframes floatSecondary {
      0% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(-4vw, -4vh) scale(1.06); }
      100% { transform: translate(3vw, -2vh) scale(0.94); }
    }

    @keyframes floatCenter {
      0% { transform: scale(0.95); opacity: 0.45; }
      50% { transform: scale(1.1); opacity: 0.65; }
      100% { transform: scale(1); opacity: 0.50; }
    }

    .subtle-texture {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px);
      background-size: 32px 32px;
      opacity: 0.55;
    }

    .vignette {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 50% 50%, transparent 45%, rgba(10, 11, 14, 0.60) 100%);
    }
  `]
})
export class BackgroundComponent {
  private store = inject(Store);
  playerColors = this.store.selectSignal(selectPlayerColors);

  universeBackground = computed(() => {
    const p = this.playerColors().primary || '#ff5722';
    const s = this.playerColors().secondary || '#f59e0b';
    return `radial-gradient(ellipse 90% 60% at 20% 10%, color-mix(in srgb, ${p} 16%, #0f1013 84%) 0%, transparent 70%),
            radial-gradient(ellipse 80% 50% at 80% 90%, color-mix(in srgb, ${s} 14%, #0c0d10 86%) 0%, transparent 65%),
            #0f1013`;
  });

  primaryGlow = computed(() => {
    const p = this.playerColors().primary || '#ff5722';
    return `radial-gradient(circle at 40% 40%, color-mix(in srgb, ${p} 36%, transparent) 0%, color-mix(in srgb, ${p} 14%, transparent) 45%, transparent 75%)`;
  });

  secondaryGlow = computed(() => {
    const s = this.playerColors().secondary || '#f59e0b';
    return `radial-gradient(circle at 60% 60%, color-mix(in srgb, ${s} 32%, transparent) 0%, color-mix(in srgb, ${s} 12%, transparent) 48%, transparent 75%)`;
  });

  centerGlow = computed(() => {
    const p = this.playerColors().primary || '#ff5722';
    const s = this.playerColors().secondary || '#f59e0b';
    return `radial-gradient(ellipse at 50% 50%, color-mix(in srgb, ${p} 22%, transparent) 0%, color-mix(in srgb, ${s} 16%, transparent) 45%, transparent 72%)`;
  });

  horizonGlow = computed(() => {
    const p = this.playerColors().primary || '#ff5722';
    return `radial-gradient(ellipse at 50% 100%, color-mix(in srgb, ${p} 26%, transparent) 0%, color-mix(in srgb, ${p} 10%, transparent) 50%, transparent 75%)`;
  });
}
