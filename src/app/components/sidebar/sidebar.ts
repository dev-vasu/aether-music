import { Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectPlaylists } from '../../state/player/player.selectors';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="sidebar">
      <div class="logo">
        <svg viewBox="0 0 24 24" fill="currentColor" class="logo-icon"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
        <span class="text">Aether</span>
      </div>
      <nav>
        <ul>
          <li routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
            <svg viewBox="0 0 24 24" fill="currentColor" class="nav-icon"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            Home
          </li>
          <li routerLink="/search" routerLinkActive="active">
            <svg viewBox="0 0 24 24" fill="currentColor" class="nav-icon"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.49 0 1 0 9.5 16a6.471 6.471 0 0 0 3.99-1.39l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            Search
          </li>
          <li routerLink="/library" routerLinkActive="active">
            <svg viewBox="0 0 24 24" fill="currentColor" class="nav-icon"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
            Library
          </li>
        </ul>
      </nav>
      <div class="playlists">
        <div class="playlist-header">
            <h3>Your Orbit</h3>
            <svg viewBox="0 0 24 24" fill="currentColor" class="plus-icon"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        </div>
        <ul>
          <li *ngFor="let playlist of playlists()">
            {{ playlist.name }}
          </li>
          <li *ngIf="playlists().length === 0" class="empty-state">No playlists yet</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .sidebar {
      width: 260px;
      height: 100vh;
      background: rgba(10, 10, 18, 0.7);
      backdrop-filter: blur(25px);
      color: white;
      padding: 24px;
      display: flex;
      flex-direction: column;
      border-right: 1px solid rgba(255, 255, 255, 0.08);
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 22px;
      font-weight: 900;
      margin-bottom: 40px;
      letter-spacing: -0.5px;
    }
    .logo-icon {
      width: 28px;
      height: 28px;
      color: #a855f7;
    }
    nav ul {
      list-style: none;
      padding: 0;
      margin-bottom: 30px;
    }
    nav li {
      padding: 12px 16px;
      margin: 4px 0;
      cursor: pointer;
      opacity: 0.6;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 16px;
      font-weight: 600;
      border-radius: 12px;
    }
    nav li:hover {
      opacity: 1;
      background: rgba(255, 255, 255, 0.06);
    }
    nav li.active {
      opacity: 1;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(168, 85, 247, 0.3));
      color: #c084fc;
    }
    .nav-icon {
      width: 22px;
      height: 22px;
    }
    .playlist-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding: 0 16px;
    }
    .plus-icon {
      width: 20px;
      height: 20px;
      opacity: 0.5;
      cursor: pointer;
    }
    .plus-icon:hover {
      opacity: 1;
      color: #a855f7;
    }
    .playlists {
      flex-grow: 1;
      overflow-y: auto;
    }
    .playlists ul {
      list-style: none;
      padding: 0;
    }
    .playlists li {
      padding: 8px 16px;
      font-size: 13px;
      opacity: 0.5;
      cursor: pointer;
      transition: opacity 0.2s;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      border-radius: 8px;
    }
    .playlists li:hover {
      opacity: 1;
      background: rgba(255, 255, 255, 0.03);
    }
    .empty-state {
      font-style: italic;
      font-size: 12px !important;
    }
    h3 {
      font-size: 11px;
      text-transform: uppercase;
      opacity: 0.4;
      letter-spacing: 1.5px;
      font-weight: 800;
    }
  `]
})
export class SidebarComponent {
  private store = inject(Store);
  playlists = this.store.selectSignal(selectPlaylists);
}
