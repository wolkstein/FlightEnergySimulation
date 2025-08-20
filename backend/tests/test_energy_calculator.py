"""Tests für den EnergyCalculator Service"""
import pytest
import math
from services.energy_calculator import EnergyCalculator
from models.vehicles import VehicleType, VehicleConfig
from models.waypoint import Waypoint, WindData


class TestEnergyCalculator:
    
    @pytest.fixture
    def calculator(self):
        """Fixture für EnergyCalculator Instanz"""
        return EnergyCalculator()
    
    @pytest.fixture
    def sample_waypoints(self):
        """Fixture für Sample Waypoints"""
        return [
            Waypoint(latitude=49.4875, longitude=8.466, altitude=100, speed=10),
            Waypoint(latitude=49.4900, longitude=8.470, altitude=120, speed=10),
            Waypoint(latitude=49.4920, longitude=8.475, altitude=100, speed=10)
        ]
    
    @pytest.fixture
    def quadcopter_config(self):
        """Fixture für Quadcopter-Konfiguration"""
        return VehicleConfig(
            vehicle_type=VehicleType.QUADCOPTER,
            mass=2.5,
            max_power=1500,
            hover_power=800,
            max_speed=20,
            max_climb_rate=5,
            battery_capacity=10000,
            battery_voltage=22.2,
            drag_coefficient=0.03,
            rotor_diameter=0.3,
            rotor_count=4,
            motor_efficiency=0.85,
            propeller_efficiency=0.75
        )
    
    @pytest.fixture
    def plane_config(self):
        """Fixture für Plane-Konfiguration"""
        return VehicleConfig(
            vehicle_type=VehicleType.PLANE,
            mass=3.0,
            max_power=1200,
            cruise_power=400,
            max_speed=30,
            max_climb_rate=8,
            stall_speed=12,
            battery_capacity=15000,
            battery_voltage=44.4,
            drag_coefficient=0.025,
            wing_area=0.6,
            motor_efficiency=0.88,
            propeller_efficiency=0.82
        )

    def test_calculate_distance_horizontal(self, calculator, sample_waypoints):
        """Test horizontale Distanz-Berechnung"""
        wp1, wp2 = sample_waypoints[0], sample_waypoints[1]
        # Setze gleiche Höhe für horizontalen Test
        wp1.altitude = 100
        wp2.altitude = 100
        
        distance = calculator.calculate_distance(wp1, wp2)
        
        # Erwartete Distanz zwischen den Koordinaten (ca. 400-500m)
        assert 300 < distance < 600
        assert isinstance(distance, float)
    
    def test_calculate_distance_vertical(self, calculator):
        """Test vertikale Distanz-Berechnung"""
        wp1 = Waypoint(latitude=49.4875, longitude=8.466, altitude=100, speed=10)
        wp2 = Waypoint(latitude=49.4875, longitude=8.466, altitude=150, speed=10)
        
        distance = calculator.calculate_distance(wp1, wp2)
        
        # Bei gleichen Koordinaten sollte die Distanz = Höhendifferenz sein
        assert distance == 50.0
    
    def test_calculate_distance_3d(self, calculator):
        """Test 3D-Distanz-Berechnung"""
        wp1 = Waypoint(latitude=49.4875, longitude=8.466, altitude=100, speed=10)
        wp2 = Waypoint(latitude=49.4900, longitude=8.470, altitude=120, speed=10)
        
        distance = calculator.calculate_distance(wp1, wp2)
        
        # 3D-Distanz sollte größer als horizontale und vertikale Komponente allein sein
        assert distance > 20  # Höhendifferenz
        assert distance > 400  # Ungefähre horizontale Distanz
        assert isinstance(distance, float)
    
    def test_calculate_air_density_sea_level(self, calculator):
        """Test Luftdichte-Berechnung auf Meereshöhe"""
        density = calculator.calculate_air_density(0)
        
        # Sollte Standard-Luftdichte sein
        assert abs(density - 1.225) < 0.001
    
    def test_calculate_air_density_altitude(self, calculator):
        """Test Luftdichte-Berechnung mit Höhe"""
        density_100m = calculator.calculate_air_density(100)
        density_1000m = calculator.calculate_air_density(1000)
        
        # Luftdichte sollte mit Höhe abnehmen
        assert density_100m < 1.225
        assert density_1000m < density_100m
        assert density_1000m > 0  # Sollte positiv bleiben
    
    def test_quadcopter_power_hover(self, calculator, quadcopter_config):
        """Test Quadcopter Leistungsberechnung im Schwebeflug"""
        power = calculator.calculate_quadcopter_power(
            config=quadcopter_config,
            speed=0,
            climb_rate=0,
            air_density=1.225
        )
        
        # Im Schwebeflug sollte ungefähr Hover-Power benötigt werden
        assert 700 < power < 900
        assert isinstance(power, float)
    
    def test_quadcopter_power_horizontal_flight(self, calculator, quadcopter_config):
        """Test Quadcopter Leistung bei Horizontalflug"""
        power_hover = calculator.calculate_quadcopter_power(
            config=quadcopter_config,
            speed=0,
            climb_rate=0,
            air_density=1.225
        )
        
        power_flight = calculator.calculate_quadcopter_power(
            config=quadcopter_config,
            speed=10,
            climb_rate=0,
            air_density=1.225
        )
        
        # Horizontalflug sollte mehr Leistung benötigen als Schweben
        assert power_flight > power_hover
    
    def test_quadcopter_power_climbing(self, calculator, quadcopter_config):
        """Test Quadcopter Leistung beim Steigflug"""
        power_hover = calculator.calculate_quadcopter_power(
            config=quadcopter_config,
            speed=0,
            climb_rate=0,
            air_density=1.225
        )
        
        power_climb = calculator.calculate_quadcopter_power(
            config=quadcopter_config,
            speed=0,
            climb_rate=2,
            air_density=1.225
        )
        
        # Steigflug sollte mehr Leistung benötigen
        assert power_climb > power_hover
    
    def test_plane_power_cruise(self, calculator, plane_config):
        """Test Plane Leistungsberechnung im Reiseflug"""
        power = calculator.calculate_plane_power(
            config=plane_config,
            speed=20,
            climb_rate=0,
            air_density=1.225
        )
        
        # Sollte in realistischem Bereich sein
        assert 200 < power < 800
        assert isinstance(power, float)
    
    def test_plane_power_stall_speed(self, calculator, plane_config):
        """Test Plane Leistung bei Stall-Geschwindigkeit"""
        # Geschwindigkeit unter Stall-Speed sollte hohe Leistung erfordern
        power_stall = calculator.calculate_plane_power(
            config=plane_config,
            speed=10,  # Unter stall_speed (12)
            climb_rate=0,
            air_density=1.225
        )
        
        power_cruise = calculator.calculate_plane_power(
            config=plane_config,
            speed=20,
            climb_rate=0,
            air_density=1.225
        )
        
        # Stall-nahe Geschwindigkeit sollte mehr Leistung benötigen
        assert power_stall > power_cruise
    
    def test_estimate_hover_power(self, calculator, quadcopter_config):
        """Test Hover-Power Schätzung"""
        hover_power = calculator.estimate_hover_power(quadcopter_config, 1.225)
        
        # Sollte realistischer Wert für 2.5kg Quadcopter sein
        assert 500 < hover_power < 1200
        assert isinstance(hover_power, float)
    
    def test_estimate_hover_power_altitude(self, calculator, quadcopter_config):
        """Test Hover-Power bei unterschiedlichen Höhen"""
        power_sea_level = calculator.estimate_hover_power(quadcopter_config, 1.225)
        power_altitude = calculator.estimate_hover_power(quadcopter_config, 1.0)
        
        # Bei geringerer Luftdichte sollte mehr Leistung benötigt werden
        assert power_altitude > power_sea_level
    
    def test_wind_impact_headwind(self, calculator, quadcopter_config):
        """Test Windeinfluss bei Gegenwind"""
        wind_data = WindData(
            latitude=49.4875,
            longitude=8.466,
            altitude=100,
            wind_speed_ms=5,
            wind_direction_deg=0,  # Nordwind
            wind_vector_x=0,
            wind_vector_y=5,
            wind_vector_z=0
        )
        
        power_no_wind = calculator.calculate_quadcopter_power(
            config=quadcopter_config,
            speed=10,
            climb_rate=0,
            air_density=1.225
        )
        
        power_headwind = calculator.calculate_quadcopter_power(
            config=quadcopter_config,
            speed=10,
            climb_rate=0,
            air_density=1.225,
            wind_data=wind_data
        )
        
        # Gegenwind sollte mehr Leistung erfordern
        assert power_headwind >= power_no_wind
    
    def test_power_values_realistic(self, calculator, quadcopter_config, plane_config):
        """Test dass Leistungswerte realistisch sind"""
        # Quadcopter Tests
        quad_power = calculator.calculate_quadcopter_power(
            config=quadcopter_config,
            speed=15,
            climb_rate=2,
            air_density=1.225
        )
        
        # Plane Tests  
        plane_power = calculator.calculate_plane_power(
            config=plane_config,
            speed=25,
            climb_rate=3,
            air_density=1.225
        )
        
        # Leistung sollte positive Werte haben
        assert quad_power > 0
        assert plane_power > 0
        
        # Sollte unter max_power bleiben (mit Puffer für Tests)
        assert quad_power < quadcopter_config.max_power * 1.5
        assert plane_power < plane_config.max_power * 1.5
    
    def test_edge_cases_zero_values(self, calculator, quadcopter_config):
        """Test Edge Cases mit Zero-Werten"""
        # Zero speed, zero climb
        power = calculator.calculate_quadcopter_power(
            config=quadcopter_config,
            speed=0,
            climb_rate=0,
            air_density=1.225
        )
        
        assert power > 0  # Hover power sollte trotzdem positiv sein
        
        # Zero air density (theoretisch, praktisch unmöglich)
        power_no_air = calculator.calculate_quadcopter_power(
            config=quadcopter_config,
            speed=10,
            climb_rate=0,
            air_density=0.001  # Sehr geringe Dichte
        )
        
        assert power_no_air > 0  # Sollte trotzdem funktionieren
