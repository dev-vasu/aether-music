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
      <!-- Subtle Architectural Ambient Gradients -->
      <div class="ambient-glow glow-top"></div>
      <div class="ambient-glow glow-bottom"></div>
      
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
      opacity: 0.22;
      pointer-events: none;
      transition: opacity 1.5s ease;
    }

    .glow-top {
      width: 60vw;
      height: 50vh;
      top: -10%;
      left: 20%;
      background: radial-gradient(circle, rgba(255, 87, 34, 0.12) 0%, rgba(35, 38, 45, 0.4) 60%, transparent 80%);
    }

    .glow-bottom {
      width: 70vw;
      height: 50vh;
      bottom: -15%;
      right: 15%;
      background: radial-gradient(circle, rgba(30, 33, 40, 0.6) 0%, transparent 70%);
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
}
