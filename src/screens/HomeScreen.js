import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ClockDisplay from '../components/ClockDisplay';
import ForecastStrip from '../components/ForecastStrip';
import WeatherCard from '../components/WeatherCard';
import AQIBadge from '../components/AQIBadge';
import PollenCard from '../components/PollenCard';
import {fetchWeather, getWeatherInfo, convertTemp} from '../services/weatherService';
import {fetchAirQuality, buildAllergySummary, getPollenInfo} from '../services/airQualityService';
import {getLocationWithPermission} from '../services/locationService';
import {loadPrefs} from '../storage/prefsStorage';
import {loadCities} from '../storage/citiesStorage';
import {writeWeatherData} from '../services/sharedPrefsService';

export default function HomeScreen() {
  const [prefs, setPrefs] = useState(null);
  const [activeCity, setActiveCity] = useState(null);
  const [weather, setWeather] = useState(null);
  const [airQuality, setAirQuality] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const resolveCity = useCallback(async (userPrefs) => {
    const savedCities = await loadCities();
    if (savedCities.length > 0) {
      return savedCities[0];
    }
    const coords = await getLocationWithPermission(userPrefs.locationPrecision === 'privacy');
    return {
      name: 'Current Location',
      latitude: coords.latitude,
      longitude: coords.longitude,
      isGPS: true,
    };
  }, []);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }
    setError(null);
    try {
      const userPrefs = await loadPrefs();
      setPrefs(userPrefs);

      const city = await resolveCity(userPrefs);
      setActiveCity(city);

      const [w, aq] = await Promise.all([
        fetchWeather(city.latitude, city.longitude),
        fetchAirQuality(city.latitude, city.longitude),
      ]);
      setWeather(w);
      setAirQuality(aq);

      // Persist a snapshot to SharedPreferences so the home screen widget can
      // render immediately from cached data (also triggers widget update broadcast).
      writeWeatherData({
        cityName:     city.name,
        latitude:     city.latitude,
        longitude:    city.longitude,
        temperature:  w.current.temperature,
        feelsLike:    w.current.feelsLike,
        humidity:     w.current.humidity,
        windSpeed:    w.current.windSpeed,
        uvIndex:      w.current.uvIndex,
        visibility:   w.current.visibility,
        weatherCode:  w.current.weatherCode,
        weatherLabel: getWeatherInfo(w.current.weatherCode).label,
        aqi:          aq.aqi,
        pm25:         aq.pm25,
        pm10:         aq.pm10,
        grassPollen:  aq.grassPollen,
        treePollen:   aq.treePollen,
        weedPollen:   aq.weedPollen,
        tempUnit:     userPrefs.tempUnit,
        widgetDisplay: userPrefs.widgetDisplay,
        widgetTheme:  userPrefs.widgetTheme,
      }).catch(() => {}); // fire-and-forget, never block the UI

    } catch (e) {
      setError(e.message || 'Failed to load weather data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [resolveCity]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [loadData]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Fetching weather...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Icon name="weather-cloudy-alert" size={56} color="#475569" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const unit = prefs?.tempUnit || 'C';
  const current = weather?.current;
  const info = getWeatherInfo(current?.weatherCode ?? 0);
  const allergySummary = airQuality
    ? buildAllergySummary(airQuality.grassPollen, airQuality.treePollen, airQuality.weedPollen)
    : null;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#38BDF8"
          colors={['#38BDF8']}
        />
      }>
      {/* City header */}
      <View style={styles.cityHeader}>
        <View style={styles.cityRow}>
          <Icon
            name={activeCity?.isGPS ? 'crosshairs-gps' : 'map-marker'}
            size={16}
            color="#38BDF8"
          />
          <Text style={styles.cityName} numberOfLines={1}>
            {activeCity?.name || 'Weather'}
          </Text>
        </View>
      </View>

      {/* Top split: Clock | Current Temp */}
      <View style={styles.splitRow}>
        <View style={styles.clockSide}>
          <ClockDisplay />
        </View>
        <View style={styles.tempSide}>
          <Icon name={info.icon} size={52} color="#38BDF8" />
          <Text style={styles.mainTemp}>
            {convertTemp(current?.temperature ?? 0, unit)}°{unit}
          </Text>
          <Text style={styles.condition}>{info.label}</Text>
        </View>
      </View>

      {/* Weather detail cards */}
      <View style={styles.cardRow}>
        <WeatherCard
          icon="thermometer"
          label="Feels Like"
          value={convertTemp(current?.feelsLike ?? 0, unit)}
          unit={`°${unit}`}
          color="#FB923C"
        />
        <WeatherCard
          icon="water-percent"
          label="Humidity"
          value={Math.round(current?.humidity ?? 0)}
          unit="%"
          color="#60A5FA"
        />
        <WeatherCard
          icon="weather-windy"
          label="Wind"
          value={Math.round(current?.windSpeed ?? 0)}
          unit=" km/h"
          color="#A78BFA"
        />
        <WeatherCard
          icon="sun-wireless"
          label="UV Index"
          value={Math.round(current?.uvIndex ?? 0)}
          unit=""
          color="#FBBF24"
        />
        <WeatherCard
          icon="eye"
          label="Visibility"
          value={Math.round(current?.visibility ?? 0)}
          unit=" km"
          color="#34D399"
        />
      </View>

      {/* Air Quality & Allergy Section */}
      {airQuality && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Air Quality & Allergies</Text>

          <View style={styles.aqiRow}>
            <AQIBadge aqi={airQuality.aqi} />
            <View style={styles.pm}>
              <Text style={styles.pmLabel}>PM2.5</Text>
              <Text style={styles.pmValue}>{Math.round(airQuality.pm25)}</Text>
              <Text style={styles.pmLabel}>PM10</Text>
              <Text style={styles.pmValue}>{Math.round(airQuality.pm10)}</Text>
            </View>
          </View>

          <View style={styles.pollenRow}>
            <PollenCard type="grass" value={airQuality.grassPollen} label="Grass" />
            <PollenCard type="tree"  value={airQuality.treePollen}  label="Tree" />
            <PollenCard type="weed"  value={airQuality.weedPollen}  label="Weed" />
          </View>

          {allergySummary && (
            <View style={styles.allergyBox}>
              <Icon name="information-outline" size={16} color="#38BDF8" style={styles.allergyIcon} />
              <Text style={styles.allergyText}>{allergySummary}</Text>
            </View>
          )}
        </View>
      )}

      {/* 5-Day Forecast */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5-Day Forecast</Text>
        <ForecastStrip forecast={weather?.daily} unit={unit} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 15,
    marginTop: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 15,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#38BDF8',
    borderRadius: 10,
  },
  retryText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 15,
  },
  cityHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cityName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F1F5F9',
    flexShrink: 1,
  },
  splitRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginTop: 8,
    marginBottom: 16,
  },
  clockSide: {
    flex: 1,
    justifyContent: 'center',
  },
  tempSide: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  mainTemp: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    includeFontPadding: false,
  },
  condition: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  cardRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#38BDF8',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  aqiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  pm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  pmLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  pmValue: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '700',
  },
  pollenRow: {
    flexDirection: 'row',
    gap: 8,
  },
  allergyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(56,189,248,0.08)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.2)',
  },
  allergyIcon: {
    marginTop: 1,
  },
  allergyText: {
    flex: 1,
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 20,
  },
});
