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
  
  // Variables públicas para el template
  public isLoading = false;
  public loadingMessage = '';
  public featureCount = 0;
  public currentZoom = 3;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  ngOnInit(): void {}

  async ngAfterViewInit(): Promise<void> {
    console.log('=== ngAfterViewInit iniciado ===');
    // Solo ejecutar en el navegador, no en el servidor
    if (isPlatformBrowser(this.platformId)) {
      console.log('Plataforma: Navegador');
      
      // Pequeña espera para asegurar que el DOM esté listo
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Importar Leaflet dinámicamente solo en el navegador
      if (!this.L) {
        console.log('Importando Leaflet...');
        const leafletModule = await import('leaflet');
        this.L = leafletModule.default || leafletModule;
        
        // Fix para los iconos de Leaflet
        delete (this.L.Icon.Default.prototype as any)._getIconUrl;
        this.L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
        console.log('Leaflet importado correctamente');
      }
      
      this.initializeMap();
      this.loadGeoJSON();
    }
  }

  ngOnDestroy(): void {
    // Limpiar el layer GeoJSON
    if (this.geoJsonLayer && this.map) {
      this.map.removeLayer(this.geoJsonLayer);
      this.geoJsonLayer = null;
    }
    
    // Limpiar el mapa completamente
    if (this.map) {
      this.map.off();
      this.map.remove();
      this.map = null;
    }
    
    // Limpiar el cache de colores
    this.provinceColors.clear();
  }

  private initializeMap(): void {
    console.log('=== Inicializando mapa ===');
    
    // Verificar que Leaflet esté cargado
    if (!this.L) {
      console.error('Leaflet no está cargado!');
      return;
    }
    
    // Limpiar el contenedor del mapa si ya existe un mapa previo
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.error('No se encuentra el elemento #map');
      return;
    }
    
    console.log('Contenedor del mapa encontrado');
    
    // Limpiar completamente el contenedor
    if ((mapContainer as any)._leaflet_id) {
      console.log('Limpiando mapa anterior...');
      mapContainer.innerHTML = '';
      delete (mapContainer as any)._leaflet_id;
    }
    
    // Si ya existe un mapa, destruirlo primero
    if (this.map) {
      console.log('Destruyendo instancia de mapa anterior...');
      try {
        this.map.off();
        this.map.remove();
      } catch (e) {
        console.warn('Error al destruir mapa anterior:', e);
      }
      this.map = null;
    }
    
    // Definir límites de Europa (aproximados, sin incluir regiones árticas extremas)
    const europeBounds = this.L.latLngBounds(
      this.L.latLng(30.0, -12.0), // Suroeste (cerca de Gibraltar)
      this.L.latLng(75.0, 40.0)   // Noreste (cerca del norte de Noruega)
    );
    
    console.log('Creando nueva instancia del mapa...');
    // Inicializar el mapa centrado en Europa con menos zoom
    this.map = this.L.map('map', {
      center: [50.0, 10.0], // Centro de Europa
      zoom: 4.5,            // Zoom inicial con decimales
      minZoom: 3.75,        // Zoom mínimo con decimales
      maxZoom: 8,           // Zoom máximo
      maxBounds: europeBounds, // Límites del mapa
      maxBoundsViscosity: 1, // Hace que los límites sean "duros"
      zoomSnap: 0.25,       // Permite zoom en incrementos de 0.25 para suavidad
      zoomDelta: 1,         // Los botones +/- cambian de 1 en 1 (normal)
      wheelPxPerZoomLevel: 30, // Zoom con rueda más rápido (por defecto es 60, menor = más rápido)
      zoomControl: true,
      attributionControl: false
    });

    console.log('Mapa creado:', this.map);

    // NO añadimos mapa base - solo fondo azul
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
      color: this.provinceColors.get(provinceId), // Sin borde blanco, usa el mismo color
      weight: 0.5,      // Borde muy fino
      opacity: 0.8
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
    
    // Resaltado sutil solo aumentando opacidad, sin traer al frente
    layer.setStyle({
      fillOpacity: 0.95
    });
  }

  private resetHighlight(e: any): void {
    // Simplemente restaurar usando el layer GeoJSON
    if (this.geoJsonLayer) {
      this.geoJsonLayer.resetStyle(e.target);
    }
  }

  private onProvinceClick(e: any): void {
    const feature = e.target.feature;
    const layer = e.target;
    const provinceName = feature.properties?.NUTS_NAME || 
                        feature.properties?.name || 
                        'Región desconocida';
    
    console.log('Provincia clickeada:', provinceName, feature.properties);
    
    // Zoom suave a la provincia sin modificar estilos
    if (this.map) {
      this.map.fitBounds(layer.getBounds(), {
        padding: [50, 50],
        maxZoom: 7
      });
    }
  }
}
