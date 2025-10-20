import { Routes } from '@angular/router';
import { MapViewerComponent } from './map-viewer/map-viewer.component';

export const routes: Routes = [
  { path: '', component: MapViewerComponent },
  { path: '**', redirectTo: '' }
];
