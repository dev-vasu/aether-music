import { Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectPlayerColors } from '../../state/player/player.selectors';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-background',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="aurora-canvas" [style.background]="'linear-gradient(135deg, ' + colors().primary + ' 0%, #030008 100%)'">
      <div class="vibrant-overlay"></div>
    </div>
  `,
  styles: [`
    .aurora-canvas {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: -1;
      transition: background 3s ease;
    }
    .vibrant-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at center, transparent 0%, rgba(3,0,8,0.8) 100%);
    }
  `]
})
export class BackgroundComponent {
  private store = inject(Store);
  colors = this.store.selectSignal(selectPlayerColors);
}
