import { Routes } from '@angular/router';
import { HomeViewComponent } from './pages/home/home';
import { SearchViewComponent } from './pages/search/search';
import { LibraryViewComponent } from './pages/library/library';
import { ProfileViewComponent } from './pages/profile/profile';

export const routes: Routes = [
  { path: '', component: HomeViewComponent },
  { path: 'search', component: SearchViewComponent },
  { path: 'library', component: LibraryViewComponent },
  { path: 'profile', component: ProfileViewComponent },
  { path: '**', redirectTo: '' }
];
