import { Component, AfterViewInit, OnDestroy, PLATFORM_ID, Inject, Output, EventEmitter } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-map-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-viewer.component.html',
  styleUrls: ['./map-viewer.component.css']
})
export class MapViewerComponent implements AfterViewInit, OnDestroy {
  @Output() provinceSelected = new EventEmitter<any>();

  private map: any;
  private L: any;
  private geojson: any;
  private provinceColors = new Map<string, string>();

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  async ngAfterViewInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      // Importar Leaflet dinámicamente
      const leafletModule = await import('leaflet');
      this.L = leafletModule.default || leafletModule;
      
      this.initMap();
      await this.loadGeoJSON();
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    this.map = this.L.map('map', {
      attributionControl: false
    }).setView([55, 10], 4);
  }

  private async loadGeoJSON(): Promise<void> {
    const response = await fetch('/NUTS_3.geojson');
    const data = await response.json();

    this.geojson = this.L.geoJSON(data, {
      style: (feature: any) => this.style(feature),
      onEachFeature: (feature: any, layer: any) => this.onEachFeature(feature, layer)
    }).addTo(this.map);
  }

  private style(feature: any): any {
    const id = feature.properties?.NUTS_ID;
    if (id && !this.provinceColors.has(id)) {
      const hue = Math.floor(Math.random() * 360);
      this.provinceColors.set(id, `hsl(${hue}, 70%, 50%)`);
    }

    return {
      fillColor: this.provinceColors.get(id),
      weight: 0.5,
      opacity: 1,
      color: this.provinceColors.get(id),
      fillOpacity: 0.7
    };
  }

  private onEachFeature(feature: any, layer: any): void {
    layer.on({
      mouseover: (e: any) => this.highlightFeature(e),
      mouseout: (e: any) => this.resetHighlight(e),
      click: (e: any) => this.zoomToFeature(e)
    });
  }

  private highlightFeature(e: any): void {
    const layer = e.target;
    layer.setStyle({
      fillOpacity: 0.9
    });
  }

  private resetHighlight(e: any): void {
    this.geojson.resetStyle(e.target);
  }

  private zoomToFeature(e: any): void {
    const province = e.target.feature.properties;
    this.provinceSelected.emit(province);
    this.map.fitBounds(e.target.getBounds(), {
      padding: [50, 50],
      maxZoom: 7,
      animate: true,
      duration: 1
    });
  }
}
