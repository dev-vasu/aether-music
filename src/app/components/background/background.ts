import { Component, inject, computed } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectPlayerColors } from '../../state/player/player.selectors';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-background',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="braun-universe">
      <!-- Subtle Architectural Ambient Gradients with Current Song Accent -->
      <div class="ambient-glow glow-top" [style.background]="topGlow()"></div>
      <div class="ambient-glow glow-bottom" [style.background]="bottomGlow()"></div>
      
      <!-- Fine Acoustic Grid Texture -->
      <div class="subtle-texture"></div>

      <!-- Vignette Frame -->
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
    }

    .ambient-glow {
      position: absolute;
      border-radius: 50%;
      filter: blur(140px);
      opacity: 0.36;
      pointer-events: none;
      transition: background 1.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.5s ease;
    }

    .glow-top {
      width: 65vw;
      height: 55vh;
      top: -12%;
      left: 18%;
    }

    .glow-bottom {
      width: 75vw;
      height: 55vh;
      bottom: -15%;
      right: 12%;
    }

    .subtle-texture {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      background-size: 32px 32px;
      opacity: 0.6;
    }

    .vignette {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 50% 50%, transparent 60%, rgba(10, 11, 14, 0.75) 100%);
    }
  `]
})
export class BackgroundComponent {
  private store = inject(Store);
  playerColors = this.store.selectSignal(selectPlayerColors);

  topGlow = computed(() => {
    const c = this.playerColors().primary || '#ff5722';
    return `radial-gradient(circle, color-mix(in srgb, ${c} 22%, transparent) 0%, rgba(35, 38, 45, 0.35) 60%, transparent 80%)`;
  });

  bottomGlow = computed(() => {
    const c = this.playerColors().secondary || '#ff5722';
    return `radial-gradient(circle, color-mix(in srgb, ${c} 18%, transparent) 0%, rgba(30, 33, 40, 0.45) 55%, transparent 70%)`;
  });
}
