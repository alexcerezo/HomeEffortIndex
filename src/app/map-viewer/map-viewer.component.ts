import { Component, OnInit, OnDestroy, AfterViewInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-map-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-viewer.component.html',
  styleUrls: ['./map-viewer.component.css']
})
export class MapViewerComponent implements OnInit, AfterViewInit, OnDestroy {
  private map: any = null;
  private L: any = null;
  private geoJsonLayer: any = null;
  private provinceColors = new Map<string, string>();

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  ngOnInit(): void {}

  async ngAfterViewInit(): Promise<void> {
    // Solo ejecutar en el navegador, no en el servidor
    if (isPlatformBrowser(this.platformId)) {
      // Importar Leaflet dinámicamente solo en el navegador
      const leafletModule = await import('leaflet');
      this.L = leafletModule.default || leafletModule;
      
      // Fix para los iconos de Leaflet
      delete (this.L.Icon.Default.prototype as any)._getIconUrl;
      this.L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      
      this.initializeMap();
      this.loadGeoJSON();
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initializeMap(): void {
    console.log('Inicializando mapa...');
    
    // Inicializar el mapa centrado en Europa
    this.map = this.L.map('map', {
      center: [50.0, 10.0], // Centro de Europa
      zoom: 4,
      zoomControl: true,
      attributionControl: false
    });

    console.log('Mapa creado:', this.map);

    // Añadir un mapa base para visualización (temporal para debug)
    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      opacity: 0.3 // Baja opacidad para que el foco esté en las provincias
    }).addTo(this.map);
  }

  private async loadGeoJSON(): Promise<void> {
    try {
      console.log('Cargando GeoJSON...');
      const response = await fetch('/NUTS_3.geojson');
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const geojsonData = await response.json();
      console.log('GeoJSON cargado, features:', geojsonData.features?.length);

      if (this.map) {
        this.geoJsonLayer = this.L.geoJSON(geojsonData, {
          style: (feature: any) => this.getProvinceStyle(feature),
          onEachFeature: (feature: any, layer: any) => this.onEachFeature(feature, layer)
        }).addTo(this.map);

        console.log('GeoJSON Layer añadido al mapa');

        // Ajustar el mapa para que se vea todo el GeoJSON
        const bounds = this.geoJsonLayer.getBounds();
        this.map.fitBounds(bounds);
        
        console.log('Mapa ajustado a bounds:', bounds);
      }
    } catch (error) {
      console.error('Error al cargar el GeoJSON:', error);
    }
  }

  private getProvinceStyle(feature: any): any {
    const provinceId = feature.properties?.NUTS_ID || feature.properties?.id || Math.random().toString();
    
    // Generar o recuperar color para esta provincia
    if (!this.provinceColors.has(provinceId)) {
      this.provinceColors.set(provinceId, this.generateRandomColor());
    }

    return {
      fillColor: this.provinceColors.get(provinceId),
      fillOpacity: 0.7,
      color: '#ffffff', // Color del borde
      weight: 1,
      opacity: 1
    };
  }

  private generateRandomColor(): string {
    // Generar colores vibrantes y variados
    const hue = Math.floor(Math.random() * 360);
    const saturation = 60 + Math.floor(Math.random() * 30); // 60-90%
    const lightness = 45 + Math.floor(Math.random() * 20);  // 45-65%
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  private onEachFeature(feature: any, layer: any): void {
    const provinceName = feature.properties?.NUTS_NAME || 
                        feature.properties?.name || 
                        'Región desconocida';
    
    // Crear tooltip
    layer.bindTooltip(provinceName, {
      permanent: false,
      direction: 'top',
      className: 'province-tooltip'
    });

    // Eventos de interacción
    layer.on({
      mouseover: (e: any) => this.highlightFeature(e),
      mouseout: (e: any) => this.resetHighlight(e),
      click: (e: any) => this.onProvinceClick(e)
    });
  }

  private highlightFeature(e: any): void {
    const layer = e.target;
    
    layer.setStyle({
      weight: 3,
      color: '#666',
      fillOpacity: 0.9
    });

    layer.bringToFront();
  }

  private resetHighlight(e: any): void {
    if (this.geoJsonLayer) {
      this.geoJsonLayer.resetStyle(e.target);
    }
  }

  private onProvinceClick(e: any): void {
    const feature = e.target.feature;
    const provinceName = feature.properties?.NUTS_NAME || 
                        feature.properties?.name || 
                        'Región desconocida';
    
    console.log('Provincia clickeada:', provinceName, feature.properties);
    
    // Aquí puedes añadir más funcionalidad, como mostrar un panel con información
    if (this.map) {
      this.map.fitBounds(e.target.getBounds());
    }
  }
}
