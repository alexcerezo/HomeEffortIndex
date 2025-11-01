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
  private canvasRenderer: any;
  private expenditureData = new Map<string, number>();
  private minExpenditure = Infinity;
  private maxExpenditure = -Infinity;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  async ngAfterViewInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      // Importar Leaflet dinámicamente
      const leafletModule = await import('leaflet');
      this.L = leafletModule.default || leafletModule;
      
      // Load expenditure data
      await this.loadExpenditureData();
      
      await this.initMap();
      this.invalidateMapSize();
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private async loadExpenditureData(): Promise<void> {
    try {
      const response = await fetch('/lifecost.json');
      const data = await response.json();
      
      // Map geo codes to their indices and then to expenditure values
      const geoIndex = data.dimension.geo.category.index;
      const values = data.value;
      
      // Process only NUTS 2 regions (codes with exactly 4 characters)
      for (const [geoCode, index] of Object.entries(geoIndex)) {
        const code = String(geoCode);
        // NUTS 2 codes are typically 4 characters (e.g., ITC4, ES11, DE21)
        // Exception: Croatian NUTS 2 codes have 5 characters starting with HR0 (e.g., HR02, HR03)
        if (code.length === 4 || (code.length === 5 && code.startsWith('HR0'))) {
          const value = values[String(index)];
          if (value !== undefined && value !== null) {
            this.expenditureData.set(code, Number(value));
            this.minExpenditure = Math.min(this.minExpenditure, Number(value));
            this.maxExpenditure = Math.max(this.maxExpenditure, Number(value));
          }
        }
      }
      
      console.log(`Loaded expenditure data for ${this.expenditureData.size} NUTS2 regions`);
      console.log(`Min: ${this.minExpenditure}%, Max: ${this.maxExpenditure}%`);
    } catch (error) {
      console.error('Error loading expenditure data:', error);
    }
  }

  /**
   * Get color based on expenditure percentage
   * Uses a gradient from green (low) to yellow (medium) to red (high)
   * @param value The expenditure percentage
   * @returns HSL color string
   */
  private getColorForExpenditure(value: number): string {
    if (this.minExpenditure === Infinity || this.maxExpenditure === -Infinity) {
      return '#cccccc'; // Gray for missing data
    }
    
    // Normalize value between 0 and 1
    const normalized = (value - this.minExpenditure) / (this.maxExpenditure - this.minExpenditure);
    
    // Color scale: green (120°) -> yellow (60°) -> red (0°)
    // Lower expenditure = better (green), higher = worse (red)
    const hue = 120 * (1 - normalized); // 120 for green, 0 for red
    
    return `hsl(${hue}, 70%, 50%)`;
  }

  private async initMap(): Promise<void> {
    // Calcular zoom inicial según el ancho de la pantalla
    const width = window.innerWidth;
    let initialZoom = 4;
    
    if (width < 1350) {
      initialZoom = 3;  // Móvil pequeño
    } else {
      initialZoom = 4;  // Desktop
    }

    this.map = this.L.map('map', {
      attributionControl: false,
      preferCanvas: true,
      inertia: false
    }).setView([55, 10], initialZoom);

    // Esperar a que el mapa esté listo antes de continuar
    await new Promise<void>((resolve) => {
      this.map.whenReady(() => {
        this.invalidateMapSize();
        resolve();
      });
    });

    // Cargar el GeoJSON después de que el mapa esté listo
    await this.loadGeoJSON();
  }

  private async loadGeoJSON(): Promise<void> {
    const mapInstance = this.map;
    if (!mapInstance) {
      return;
    }

    const response = await fetch('/NUTS_3.geojson');
    const data = await response.json();

    // Verificar nuevamente después del fetch asíncrono
    if (!this.map) {
      return;
    }

    // Filtrar solo las regiones NUTS 2 (LEVL_CODE === 2)
    const nuts2Data = {
      ...data,
      features: data.features.filter((feature: any) => feature.properties?.LEVL_CODE === 2)
    };

    this.canvasRenderer = this.L.canvas({ padding: 1 });
    this.geojson = this.L.geoJSON(nuts2Data, {
      renderer: this.canvasRenderer,
      style: (feature: any) => this.style(feature),
      onEachFeature: (feature: any, layer: any) => this.onEachFeature(feature, layer)
    }).addTo(this.map);
  }

  private style(feature: any): any {
    const id = feature.properties?.NUTS_ID;
    
    let fillColor = '#cccccc'; // Default gray for missing data
    
    if (id) {
      const expenditure = this.expenditureData.get(id);
      if (expenditure !== undefined) {
        fillColor = this.getColorForExpenditure(expenditure);
      }
    }

    return {
      fillColor: fillColor,
      weight: 0.5,
      opacity: 1,
      color: '#666666', // Border color
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
    this.invalidateMapSize();
    this.map.fitBounds(e.target.getBounds(), {
      padding: [50, 50],
      maxZoom: 7,
      animate: true,
      duration: 1
    });
  }

  private invalidateMapSize(): void {
    if (!this.map) {
      return;
    }

    const mapInstance = this.map;
    setTimeout(() => mapInstance?.invalidateSize(), 0);
  }
}
