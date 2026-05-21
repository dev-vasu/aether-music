import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SpotifyService {
  constructor() {}
  async login() { return true; }
  getSdk() { return null as any; }
  setMockMode(enabled: boolean) {}
  getMockTopTracks() { return []; }
}
