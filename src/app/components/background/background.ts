import { Component, inject, computed } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectPlayerColors } from '../../state/player/player.selectors';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-background',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cosmic-universe">
      <!-- Animated Nebula Orb 1 (Primary Hue) -->
      <div
        class="nebula-orb orb-primary"
        [style.background]="primaryBlobColor()">
      </div>

      <!-- Animated Nebula Orb 2 (Secondary Hue) -->
      <div
        class="nebula-orb orb-secondary"
        [style.background]="secondaryBlobColor()">
      </div>

      <!-- Animated Nebula Orb 3 (Cosmic Accent) -->
      <div class="nebula-orb orb-accent"></div>

      <!-- Celestial Stardust Layer -->
      <div class="stars-layer"></div>

      <!-- Frosted Blur Overlay -->
      <div class="frosted-glass-overlay"></div>

      <!-- Deep Vignette Overlay -->
      <div class="vignette-overlay"></div>
    </div>
  `,
  styles: [`
    .cosmic-universe {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: -1;
      overflow: hidden;
      background: #030008;
      pointer-events: none;
    }

    .nebula-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(110px);
      opacity: 0.45;
      will-change: transform, opacity;
      transition: background 3s ease, opacity 2s ease;
    }

    .orb-primary {
      width: 65vw;
      height: 65vw;
      max-width: 850px;
      max-height: 850px;
      top: -15%;
      left: -10%;
      animation: nebulaDrift1 26s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }

    .orb-secondary {
      width: 55vw;
      height: 55vw;
      max-width: 750px;
      max-height: 750px;
      bottom: -15%;
      right: -10%;
      animation: nebulaDrift2 32s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }

    .orb-accent {
      width: 45vw;
      height: 45vw;
      max-width: 600px;
      max-height: 600px;
      top: 30%;
      left: 30%;
      background: radial-gradient(circle, rgba(236, 72, 153, 0.3) 0%, rgba(99, 102, 241, 0.2) 60%, transparent 80%);
      animation: celestialBreathe 18s ease-in-out infinite;
      opacity: 0.35;
    }

    .stars-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: 
        radial-gradient(1px 1px at 20px 30px, rgba(255, 255, 255, 0.7), transparent),
        radial-gradient(1.5px 1.5px at 150px 180px, rgba(168, 85, 247, 0.8), transparent),
        radial-gradient(1px 1px at 280px 90px, rgba(255, 255, 255, 0.5), transparent),
        radial-gradient(2px 2px at 400px 320px, rgba(99, 102, 241, 0.8), transparent),
        radial-gradient(1px 1px at 620px 210px, rgba(255, 255, 255, 0.6), transparent),
        radial-gradient(1.5px 1.5px at 780px 450px, rgba(236, 72, 153, 0.7), transparent),
        radial-gradient(1px 1px at 940px 140px, rgba(255, 255, 255, 0.5), transparent),
        radial-gradient(2px 2px at 1100px 380px, rgba(6, 182, 212, 0.8), transparent);
      background-size: 1200px 600px;
      opacity: 0.55;
    }

    .frosted-glass-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      backdrop-filter: blur(60px);
      -webkit-backdrop-filter: blur(60px);
    }

    .vignette-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at center, transparent 30%, rgba(3, 0, 8, 0.85) 100%);
    }
  `]
})
export class BackgroundComponent {
  private store = inject(Store);
  colors = this.store.selectSignal(selectPlayerColors);

  primaryBlobColor = computed(() => {
    const c = this.colors().primary || '#6366f1';
    return `radial-gradient(circle, ${c} 0%, rgba(99, 102, 241, 0.4) 50%, transparent 80%)`;
  });

  secondaryBlobColor = computed(() => {
    const c = this.colors().secondary || '#a855f7';
    return `radial-gradient(circle, ${c} 0%, rgba(168, 85, 247, 0.3) 50%, transparent 80%)`;
  });
}
