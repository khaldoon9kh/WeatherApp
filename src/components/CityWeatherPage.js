import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {fetchWeather, getWeatherInfo, convertTemp} from '../services/weatherService';
import {fetchAirQuality} from '../services/airQualityService';
import AQIBadge from './AQIBadge';
import ForecastStrip from './ForecastStrip';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

export default function CityWeatherPage({city, unit = 'C', isGPS = false}) {
  const [weather, setWeather] = useState(null);
  const [airQuality, setAirQuality] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [w, aq] = await Promise.all([
        fetchWeather(city.latitude, city.longitude),
        fetchAirQuality(city.latitude, city.longitude),
      ]);
      setWeather(w);
      setAirQuality(aq);
    } catch (e) {
      setError('Failed to load weather data.');
    } finally {
      setLoading(false);
    }
  }, [city.latitude, city.longitude]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <View style={[styles.page, styles.centered]}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Loading {city.name}...</Text>
      </View>
    );
  }

  if (error || !weather) {
    return (
      <View style={[styles.page, styles.centered]}>
        <Icon name="weather-cloudy-alert" size={48} color="#475569" />
        <Text style={styles.errorText}>{error || 'No data available'}</Text>
      </View>
    );
  }

  const info = getWeatherInfo(weather.current.weatherCode);
  const temp = convertTemp(weather.current.temperature, unit);

  return (
    <View style={styles.page}>
      <View style={styles.topRow}>
        <Icon name={isGPS ? 'crosshairs-gps' : 'map-marker'} size={14} color="#38BDF8" />
        <Text style={styles.cityName} numberOfLines={1}>{city.name}</Text>
        {city.region ? <Text style={styles.regionLabel}>{city.region}</Text> : null}
      </View>

      <View style={styles.mainTemp}>
        <Icon name={info.icon} size={64} color="#38BDF8" />
        <Text style={styles.temperature}>{temp}°{unit}</Text>
      </View>

      <Text style={styles.condition}>{info.label}</Text>

      {airQuality && (
        <View style={styles.aqiRow}>
          <AQIBadge aqi={airQuality.aqi} size="small" />
        </View>
      )}

      <View style={styles.forecastWrapper}>
        <ForecastStrip forecast={weather.daily.slice(0, 3)} unit={unit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
  },
  centered: {
    justifyContent: 'center',
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  cityName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F1F5F9',
    flexShrink: 1,
  },
  regionLabel: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 1,
  },
  mainTemp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  temperature: {
    fontSize: 80,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -2,
    includeFontPadding: false,
  },
  condition: {
    fontSize: 18,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 16,
  },
  aqiRow: {
    marginBottom: 24,
  },
  forecastWrapper: {
    alignSelf: 'stretch',
    marginTop: 'auto',
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
  },
});
