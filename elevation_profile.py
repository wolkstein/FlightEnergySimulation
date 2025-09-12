import subprocess
import json
import math
import matplotlib.pyplot as plt
from typing import List, Tuple, Dict

class ElevationProfiler:
    def __init__(self, opentopo_server: str = "192.168.71.250:5000"):
        self.server = opentopo_server
        self.dataset = "eudem25m"
    
    def calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Berechnet Entfernung zwischen zwei Koordinaten in Metern (Haversine)"""
        R = 6371000  # Erdradius in Metern
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        a = (math.sin(delta_lat/2) * math.sin(delta_lat/2) + 
             math.cos(lat1_rad) * math.cos(lat2_rad) * 
             math.sin(delta_lon/2) * math.sin(delta_lon/2))
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c
    
    def interpolate_points(self, start_lat: float, start_lon: float, 
                          end_lat: float, end_lon: float, 
                          distance_meters: float = 10.0) -> List[Tuple[float, float]]:
        """Berechnet Zwischenpunkte zwischen Start und Ziel"""
        total_distance = self.calculate_distance(start_lat, start_lon, end_lat, end_lon)
        num_points = int(total_distance / distance_meters) + 1
        
        points = []
        for i in range(num_points + 1):
            ratio = i / num_points if num_points > 0 else 0
            
            lat = start_lat + (end_lat - start_lat) * ratio
            lon = start_lon + (end_lon - start_lon) * ratio
            points.append((lat, lon))
        
        return points
    
    def curl_elevation(self, lat: float, lon: float) -> float:
        """Höhe für einzelne Koordinate per curl abfragen"""
        url = f"{self.server}/v1/{self.dataset}?locations={lat},{lon}"
        
        try:
            # curl Aufruf ausführen
            result = subprocess.run(['curl', '-s', url], 
                                  capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                data = json.loads(result.stdout)
                
                if data["status"] == "OK" and data["results"]:
                    elevation = data["results"][0]["elevation"]
                    print(f"curl {url} -> Höhe: {elevation}m")
                    return elevation if elevation is not None else 0.0
                else:
                    print(f"Fehler in API-Antwort: {data}")
                    return 0.0
            else:
                print(f"curl Fehler: {result.stderr}")
                return 0.0
                
        except subprocess.TimeoutExpired:
            print(f"Timeout bei curl für {lat},{lon}")
            return 0.0
        except json.JSONDecodeError as e:
            print(f"JSON Parse Fehler für {lat},{lon}: {e}")
            return 0.0
        except Exception as e:
            print(f"Unbekannter Fehler bei {lat},{lon}: {e}")
            return 0.0
    
    def curl_batch_elevations(self, points: List[Tuple[float, float]]) -> List[Dict]:
        """Batch-Abfrage für mehrere Punkte per curl"""
        # OpenTopo unterstützt mehrere Punkte: locations=lat1,lon1|lat2,lon2|...
        locations = "|".join([f"{lat},{lon}" for lat, lon in points])
        url = f"{self.server}/v1/{self.dataset}?locations={locations}"
        
        print(f"Batch curl: {len(points)} Punkte")
        print(f"URL: {url[:100]}{'...' if len(url) > 100 else ''}")
        
        try:
            # curl Aufruf für Batch
            result = subprocess.run(['curl', '-s', url], 
                                  capture_output=True, text=True, timeout=60)
            
            if result.returncode != 0:
                print(f"curl Batch-Fehler: {result.stderr}")
                # Fallback: Einzelne Abfragen
                return self.curl_individual_elevations(points)
            
            data = json.loads(result.stdout)
            
            results = []
            if data["status"] == "OK":
                print(f"Batch erfolgreich: {len(data['results'])} Ergebnisse")
                
                for i, result_data in enumerate(data["results"]):
                    if i >= len(points):
                        break
                        
                    lat, lon = points[i]
                    elevation = result_data["elevation"] if result_data["elevation"] is not None else 0.0
                    
                    # Kumulative Distanz berechnen
                    if i == 0:
                        distance = 0.0
                    else:
                        prev_lat, prev_lon = points[i-1]
                        distance = results[-1]["distance"] + self.calculate_distance(
                            prev_lat, prev_lon, lat, lon)
                    
                    results.append({
                        "lat": lat,
                        "lon": lon,
                        "elevation": elevation,
                        "distance": distance
                    })
            else:
                print(f"Batch API Fehler: {data}")
                # Fallback: Einzelne Abfragen
                return self.curl_individual_elevations(points)
            
            return results
            
        except Exception as e:
            print(f"Batch curl Fehler: {e}")
            # Fallback: Einzelne Abfragen
            return self.curl_individual_elevations(points)
    
    def curl_individual_elevations(self, points: List[Tuple[float, float]]) -> List[Dict]:
        """Einzelne curl-Abfragen als Fallback"""
        print("Fallback: Einzelne curl-Abfragen")
        results = []
        
        for i, (lat, lon) in enumerate(points):
            elevation = self.curl_elevation(lat, lon)
            
            # Kumulative Distanz berechnen
            if i == 0:
                distance = 0.0
            else:
                prev_lat, prev_lon = points[i-1]
                distance = results[-1]["distance"] + self.calculate_distance(
                    prev_lat, prev_lon, lat, lon)
            
            results.append({
                "lat": lat,
                "lon": lon,
                "elevation": elevation,
                "distance": distance
            })
        
        return results
    
    def interpolate_points_geodesic(self, start_lat: float, start_lon: float, 
                                   end_lat: float, end_lon: float, 
                                   distance_meters: float = 10.0) -> List[Tuple[float, float]]:
        """Berechnet Zwischenpunkte mit geodätischer Interpolation (Great Circle)"""
        total_distance = self.calculate_distance(start_lat, start_lon, end_lat, end_lon)
        num_points = int(total_distance / distance_meters)
        
        points = []
        
        # Koordinaten in Radianten
        lat1 = math.radians(start_lat)
        lon1 = math.radians(start_lon)
        lat2 = math.radians(end_lat)
        lon2 = math.radians(end_lon)
        
        # Angular distance
        d = total_distance / 6371000  # Erdradius
        
        for i in range(num_points + 1):
            f = i / num_points if num_points > 0 else 0
            
            # Spherical interpolation (slerp)
            a = math.sin((1-f) * d) / math.sin(d) if d > 0 else 1-f
            b = math.sin(f * d) / math.sin(d) if d > 0 else f
            
            # Cartesian coordinates
            x = a * math.cos(lat1) * math.cos(lon1) + b * math.cos(lat2) * math.cos(lon2)
            y = a * math.cos(lat1) * math.sin(lon1) + b * math.cos(lat2) * math.sin(lon2)
            z = a * math.sin(lat1) + b * math.sin(lat2)
            
            # Back to lat/lon
            lat = math.atan2(z, math.sqrt(x*x + y*y))
            lon = math.atan2(y, x)
            
            points.append((math.degrees(lat), math.degrees(lon)))
        
        return points
    
    def interpolate_points_simple_corrected(self, start_lat: float, start_lon: float, 
                                          end_lat: float, end_lon: float, 
                                          distance_meters: float = 10.0) -> List[Tuple[float, float]]:
        """Vereinfachte aber bessere Interpolation mit Längengradkorrektur"""
        total_distance = self.calculate_distance(start_lat, start_lon, end_lat, end_lon)
        num_points = int(total_distance / distance_meters)
        
        points = []
        
        # Mittlere Breite für Längengradkorrektur
        mid_lat = math.radians((start_lat + end_lat) / 2)
        cos_mid_lat = math.cos(mid_lat)
        
        for i in range(num_points + 1):
            ratio = i / num_points if num_points > 0 else 0
            
            # Linear für Breitengrad (meist OK)
            lat = start_lat + (end_lat - start_lat) * ratio
            
            # Korrigiert für Längengrad basierend auf mittlerer Breite
            lon_diff = end_lon - start_lon
            
            # Kürzester Weg über 180° Meridian berücksichtigen
            if abs(lon_diff) > 180:
                if lon_diff > 0:
                    lon_diff -= 360
                else:
                    lon_diff += 360
            
            lon = start_lon + lon_diff * ratio
            
            # Normalisierung auf [-180, 180]
            while lon > 180:
                lon -= 360
            while lon < -180:
                lon += 360
                
            points.append((lat, lon))
        
        return points

    def generate_profile(self, start_lat: float, start_lon: float,
                        end_lat: float, end_lon: float,
                        point_distance: float = 10.0, 
                        geodesic: bool = True) -> List[Dict]:
        """Generiert Höhenprofil mit geodätischer Interpolation (Standard für WGS84)"""
        print(f"Generiere Höhenprofil von ({start_lat}, {start_lon}) nach ({end_lat}, {end_lon})")
        print(f"Punktabstand: {point_distance}m")
        print(f"Koordinatensystem: WGS84")
        print(f"Interpolation: {'Geodätisch (korrekt für WGS84)' if geodesic else 'Linear (nur für kurze Strecken)'}")
        print(f"Server: {self.server}")
        
        # Für WGS84 ist geodätische Interpolation die korrekte Methode
        if geodesic:
            points = self.interpolate_points_geodesic(start_lat, start_lon, end_lat, end_lon, point_distance)
        else:
            # Warnung bei linearer Interpolation
            distance = self.calculate_distance(start_lat, start_lon, end_lat, end_lon)
            if distance > 1000:  # > 1km
                print(f"⚠️  WARNUNG: Lineare Interpolation bei {distance:.0f}m kann ungenau sein!")
                print("   Empfehlung: geodesic=True für WGS84-Koordinaten verwenden")
            points = self.interpolate_points_simple_corrected(start_lat, start_lon, end_lat, end_lon, point_distance)
            
        print(f"Anzahl Punkte: {len(points)}")
        
        # Distanzvergleich für Validierung
        total_calc = self.calculate_distance(start_lat, start_lon, end_lat, end_lon)
        print(f"Theoretische Distanz: {total_calc:.1f}m")
        
        # Höhen per curl abfragen (versuche erst Batch, dann einzeln)
        if len(points) > 50:
            print("Viele Punkte -> Einzelne curl-Aufrufe für Stabilität")
            profile = self.curl_individual_elevations(points)
        else:
            profile = self.curl_batch_elevations(points)
        
        print(f"Höhenprofil erstellt: {len(profile)} Datenpunkte")
        return profile
    
    def plot_profile(self, profile: List[Dict], save_path: str = None):
        """Höhenprofil visualisieren"""
        if not profile:
            print("Keine Daten zum Plotten vorhanden!")
            return
        
        distances = [p["distance"] for p in profile]
        elevations = [p["elevation"] for p in profile]
        
        plt.figure(figsize=(12, 6))
        plt.plot(distances, elevations, 'b-', linewidth=2)
        plt.fill_between(distances, elevations, alpha=0.3)
        
        plt.xlabel('Entfernung (m)')
        plt.ylabel('Höhe (m)')
        plt.title('Höhenprofil der Route')
        plt.grid(True, alpha=0.3)
        
        # Statistiken
        min_elev = min(elevations)
        max_elev = max(elevations)
        total_dist = max(distances)
        
        plt.text(0.02, 0.98, f'Gesamtdistanz: {total_dist:.0f}m\n'
                             f'Min. Höhe: {min_elev:.1f}m\n'
                             f'Max. Höhe: {max_elev:.1f}m\n'
                             f'Höhendifferenz: {max_elev-min_elev:.1f}m',
                 transform=plt.gca().transAxes, verticalalignment='top',
                 bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"Plot gespeichert: {save_path}")
        
        plt.show()

    def export_to_kml(self, profile: List[Dict], filename: str = "elevation_profile.kml", 
                     include_elevations: bool = True):
        """Exportiert Höhenprofil als KML für Google Maps"""
        if not profile:
            print("Keine Daten für KML-Export vorhanden!")
            return
        
        kml_content = '''<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Höhenprofil Route</name>
    <description>Geodätisch interpolierte Route mit Höhendaten</description>
    
    <!-- Stil für die Linie -->
    <Style id="routeStyle">
      <LineStyle>
        <color>ff0000ff</color>
        <width>3</width>
      </LineStyle>
      <PolyStyle>
        <color>7f0000ff</color>
      </PolyStyle>
    </Style>
    
    <!-- Stil für Höhenpunkte -->
    <Style id="elevationPoint">
      <IconStyle>
        <color>ff00ff00</color>
        <scale>0.5</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
    
    <!-- Route als Linie -->
    <Placemark>
      <name>Geodätische Route</name>
      <description>WGS84 geodätisch interpolierte Punkte</description>
      <styleUrl>#routeStyle</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>
'''
        
        # Koordinaten für Linie hinzufügen (lon,lat,elevation)
        for point in profile:
            if include_elevations:
                kml_content += f"          {point['lon']:.7f},{point['lat']:.7f},{point['elevation']:.1f}\n"
            else:
                kml_content += f"          {point['lon']:.7f},{point['lat']:.7f},0\n"
        
        kml_content += '''        </coordinates>
      </LineString>
    </Placemark>
    
    <!-- Start- und Endpunkt -->
    <Placemark>
      <name>Startpunkt</name>
      <description>Start der Route</description>
      <styleUrl>#elevationPoint</styleUrl>
      <Point>
        <coordinates>{},{},{}</coordinates>
      </Point>
    </Placemark>
    
    <Placemark>
      <name>Endpunkt</name>
      <description>Ende der Route</description>
      <styleUrl>#elevationPoint</styleUrl>
      <Point>
        <coordinates>{},{},{}</coordinates>
      </Point>
    </Placemark>
'''.format(
            profile[0]['lon'], profile[0]['lat'], profile[0]['elevation'],
            profile[-1]['lon'], profile[-1]['lat'], profile[-1]['elevation']
        )
        
        # Höhenpunkte alle 1km hinzufügen
        if include_elevations and len(profile) > 10:
            step = max(1, len(profile) // 10)  # Max 10 Punkte
            for i in range(0, len(profile), step):
                point = profile[i]
                kml_content += f'''
    <Placemark>
      <name>Höhenpunkt {i}</name>
      <description>
        Distanz: {point['distance']:.0f}m
        Höhe: {point['elevation']:.1f}m
        Koordinaten: {point['lat']:.6f}, {point['lon']:.6f}
      </description>
      <styleUrl>#elevationPoint</styleUrl>
      <Point>
        <coordinates>{point['lon']:.7f},{point['lat']:.7f},{point['elevation']:.1f}</coordinates>
      </Point>
    </Placemark>'''
        
        kml_content += '''
  </Document>
</kml>'''
        
        # KML-Datei schreiben
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(kml_content)
        
        print(f"KML-Datei erstellt: {filename}")
        print(f"Enthält {len(profile)} Punkte auf {profile[-1]['distance']:.0f}m Strecke")
        print("Öffne die Datei in Google My Maps oder Google Earth!")

# Produktive Nutzung mit konfigurierbaren Parametern
if __name__ == "__main__":
    import sys
    
    # === KONFIGURATION ===
    # Standardwerte
    START_LAT = 51.99      # Startpunkt Breitengrad
    START_LON = 8.522      # Startpunkt Längengrad
    END_LAT = 52.05        # Endpunkt Breitengrad  
    END_LON = 8.650        # Endpunkt Längengrad
    POINT_DISTANCE = 100.0  # Alle 100 Meter ein Punkt
    SERVER = "192.168.71.250:5000"
    
    # Kommandozeilen-Argumente überschreiben Standardwerte
    if len(sys.argv) >= 6:
        START_LAT = float(sys.argv[1])
        START_LON = float(sys.argv[2])
        END_LAT = float(sys.argv[3])
        END_LON = float(sys.argv[4])
        POINT_DISTANCE = float(sys.argv[5])
        
        if len(sys.argv) >= 7:
            SERVER = sys.argv[6]
    elif len(sys.argv) > 1:
        print("❌ Falsche Anzahl Argumente!")
        print("Nutzung:")
        print("  python elevation_profile.py")
        print("  oder")
        print("  python elevation_profile.py START_LAT START_LON END_LAT END_LON POINT_DISTANCE [SERVER]")
        print()
        print("Beispiel:")
        print("  python elevation_profile.py 51.99 8.522 52.05 8.650 100.0")
        print("  python elevation_profile.py 51.99 8.522 52.05 8.650 50.0 192.168.71.250:5000")
        sys.exit(1)
    
    # === AUSFÜHRUNG ===
    profiler = ElevationProfiler(SERVER)
    
    print("=== Höhenprofil Generator ===")
    print(f"Start: {START_LAT}, {START_LON}")
    print(f"Ende: {END_LAT}, {END_LON}")
    print(f"Punktabstand: {POINT_DISTANCE}m")
    print(f"Server: {SERVER}")
    
    # Entfernung berechnen
    total_distance = profiler.calculate_distance(START_LAT, START_LON, END_LAT, END_LON)
    print(f"Gesamtdistanz: {total_distance/1000:.2f}km")
    
    # Höhenprofil erstellen (geodätisch korrekt für WGS84)
    profile = profiler.generate_profile(
        START_LAT, START_LON, END_LAT, END_LON, 
        POINT_DISTANCE, geodesic=True
    )
    
    if profile:
        # Statistiken
        elevations = [p["elevation"] for p in profile]
        min_elev = min(elevations)
        max_elev = max(elevations)
        
        print(f"\n=== Ergebnis ===")
        print(f"Punkte: {len(profile)}")
        print(f"Min. Höhe: {min_elev:.1f}m")
        print(f"Max. Höhe: {max_elev:.1f}m")
        print(f"Höhendifferenz: {max_elev-min_elev:.1f}m")
        
        # Dateien erstellen
        distance_km = total_distance / 1000
        base_name = f"route_{distance_km:.1f}km_{POINT_DISTANCE:.0f}m"
        
        # Plot erstellen
        profiler.plot_profile(profile, f"{base_name}.png")
        
        # JSON exportieren
        with open(f"{base_name}.json", "w") as f:
            json.dump(profile, f, indent=2)
        
        # KML für Google Maps exportieren
        profiler.export_to_kml(profile, f"{base_name}.kml", include_elevations=True)
        
        print(f"\n=== Dateien erstellt ===")
        print(f"📊 {base_name}.png (Höhenprofil-Diagramm)")
        print(f"📄 {base_name}.json (Rohdaten)")
        print(f"🗺️  {base_name}.kml (Google Maps/Earth)")
        
        print(f"\n=== Google Maps Import ===")
        print("1. Öffne mymaps.google.com")
        print("2. 'Neue Karte erstellen'")
        print(f"3. 'Importieren' -> {base_name}.kml auswählen")
        print("4. Geodätisch korrekte Route wird angezeigt!")
        
    else:
        print("❌ Fehler beim Erstellen des Höhenprofils!")
        print("Prüfe Server-Verbindung und Koordinaten.")
        with open("elevation_profile.json", "w") as f:
            json.dump(profile, f, indent=2)
        print("Profil gespeichert: elevation_profile.json")

