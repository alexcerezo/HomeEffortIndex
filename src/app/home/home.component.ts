import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapViewerComponent } from '../map-viewer/map-viewer.component';
import { InfoPanelComponent } from '../info-panel/info-panel.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MapViewerComponent, InfoPanelComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  selectedProvince: any = null;

  onProvinceSelected(province: any): void {
    this.selectedProvince = province;
  }
}
