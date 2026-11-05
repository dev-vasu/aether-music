import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  text: string;
  type?: 'info' | 'success' | 'warning';
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  public currentToast = signal<ToastMessage | null>(null);
  private timeoutId: any;

  show(text: string, type: 'info' | 'success' | 'warning' = 'info', icon?: string) {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    const toast: ToastMessage = { id: Date.now(), text, type, icon };
    this.currentToast.set(toast);
    this.timeoutId = setTimeout(() => {
      this.currentToast.set(null);
    }, 2800);
  }
}
