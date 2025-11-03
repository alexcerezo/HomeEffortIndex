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
  private affordabilityData = new Map<string, number>();
  private minYears = Infinity;
  private maxYears = -Infinity;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  async ngAfterViewInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      // Importar Leaflet dinámicamente
      const leafletModule = await import('leaflet');
      this.L = leafletModule.default || leafletModule;
      
      // Load housing affordability data
      await this.loadAffordabilityData();
      
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

  private async loadAffordabilityData(): Promise<void> {
    try {
      const response = await fetch('/housing_affordability.json');
      const data = await response.json();
      
      // Map geo codes to their indices and then to years values
      const geoIndex = data.dimension.geo.category.index;
      const values = data.value;
      
      // Process all NUTS2 regions
      for (const [geoCode, index] of Object.entries(geoIndex)) {
        const code = String(geoCode);
        const value = values[String(index)];
        if (value !== undefined && value !== null) {
          this.affordabilityData.set(code, Number(value));
          this.minYears = Math.min(this.minYears, Number(value));
          this.maxYears = Math.max(this.maxYears, Number(value));
        }
      }
      
      console.log(`Loaded housing affordability data for ${this.affordabilityData.size} NUTS2 regions`);
      console.log(`Min: ${this.minYears.toFixed(2)} years, Max: ${this.maxYears.toFixed(2)} years`);
    } catch (error) {
      console.error('Error loading housing affordability data:', error);
    }
  }

  /**
   * Get color based on years needed to buy a house
   * Uses a gradient from green (low) to yellow (medium) to red (high)
   * @param value The years needed to buy a house
   * @returns HSL color string
   */
  private getColorForAffordability(value: number): string {
    if (this.minYears === Infinity || this.maxYears === -Infinity) {
      return '#cccccc'; // Gray for missing data
    }
    
    // Normalize value between 0 and 1
    const normalized = (value - this.minYears) / (this.maxYears - this.minYears);
    
    // Color scale: green (120°) -> yellow (60°) -> red (0°)
    // Fewer years = better (green), more years = worse (red)
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
      const years = this.affordabilityData.get(id);
      if (years !== undefined) {
        fillColor = this.getColorForAffordability(years);
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
    const nuts_id = province.NUTS_ID;
    const years = this.affordabilityData.get(nuts_id);
    
    // Add years data to province object
    const enrichedProvince = {
      ...province,
      years_to_buy: years
    };
    
    this.provinceSelected.emit(enrichedProvince);
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
