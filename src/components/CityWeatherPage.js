import React, {useEffect, useState, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {fetchWeather, getWeatherInfo, convertTemp} from '../services/weatherService';
import {fetchAirQuality} from '../services/airQualityService';
import AQIBadge from './AQIBadge';
import ForecastStrip from './ForecastStrip';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

/**
 * A single full-screen weather page for one city.
 *
 * Loading is deferred: the network request is only issued when isActive first
 * becomes true, so off-screen pages never consume API quota. When the user
 * swipes back to an already-loaded page, onDataReady fires immediately from
 * state rather than re-fetching.
 */
export default function CityWeatherPage({
  city,
  unit = 'C',
  isGPS = false,
  isActive = false,
  onDataReady,   // (weather, airQuality) => void — called when data is ready & page is visible
  onDelete,      // () => void — omit for GPS city
}) {
  const [weather, setWeather] = useState(null);
  const [airQuality, setAirQuality] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Tracks whether we have ever successfully loaded data for this city.
  // Stored in a ref so the isActive effect can read it without being in deps.
  const hasDataRef = useRef(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const [w, aq] = await Promise.all([
        fetchWeather(city.latitude, city.longitude),
        fetchAirQuality(city.latitude, city.longitude),
      ]);
      setWeather(w);
      setAirQuality(aq);
      hasDataRef.current = true;
      onDataReady?.(w, aq);
    } catch {
      setError('Could not load weather. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [city.latitude, city.longitude, onDataReady]);

  // Deferred fetch: only run when this page first becomes active.
  // If data is already loaded, fire the callback immediately so CitiesScreen
  // can re-push the cached data to the widget (e.g. after swiping back).
  useEffect(() => {
    if (!isActive) {
      return;
    }
    if (hasDataRef.current && weather && airQuality) {
      onDataReady?.(weather, airQuality);
      return;
    }
    loadData();
    // Intentionally omitting loadData / onDataReady from deps — both are
    // stable callbacks, and we only want to re-run this when isActive flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const onRefresh = useCallback(() => loadData(true), [loadData]);

  // ── Loading first time ─────────────────────────────────────────────────
  if (loading && !weather) {
    return (
      <View style={[styles.page, styles.centered]}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.hint}>Loading {city.name}…</Text>
      </View>
    );
  }

  // ── Error with no previous data ────────────────────────────────────────
  if (error && !weather) {
    return (
      <View style={[styles.page, styles.centered]}>
        <Icon name="weather-cloudy-alert" size={52} color="#475569" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Not yet active (neighbour page, never fetched) ─────────────────────
  if (!weather) {
    return <View style={styles.page} />;
  }

  const info = getWeatherInfo(weather.current.weatherCode);
  const temp = convertTemp(weather.current.temperature, unit);
  const feelsLike = convertTemp(weather.current.feelsLike, unit);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#38BDF8"
          colors={['#38BDF8']}
        />
      }>

      {/* ── City / region header ── */}
      <View style={styles.cityHeader}>
        <View style={styles.cityNameRow}>
          <Icon
            name={isGPS ? 'crosshairs-gps' : 'map-marker'}
            size={14}
            color="#38BDF8"
          />
          <Text style={styles.cityName} numberOfLines={1}>
            {city.name}
          </Text>
          {city.region ? (
            <Text style={styles.regionLabel} numberOfLines={1}>
              {city.region}
            </Text>
          ) : null}
        </View>

        {onDelete ? (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={onDelete}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Icon name="close-circle-outline" size={22} color="#475569" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ── Hero block: icon + temperature ── */}
      <View style={styles.heroBlock}>
        <Icon name={info.icon} size={80} color="#38BDF8" />
        <View style={styles.heroText}>
          <Text style={styles.temperature}>
            {temp}°<Text style={styles.unit}>{unit}</Text>
          </Text>
          <Text style={styles.condition}>{info.label}</Text>
        </View>
      </View>

      {/* ── Detail chips ── */}
      <View style={styles.chips}>
        <DetailChip
          icon="thermometer"
          label="Feels like"
          value={`${feelsLike}°${unit}`}
        />
        <DetailChip
          icon="water-percent"
          label="Humidity"
          value={`${Math.round(weather.current.humidity)}%`}
        />
        <DetailChip
          icon="weather-windy"
          label="Wind"
          value={`${Math.round(weather.current.windSpeed)} km/h`}
        />
      </View>

      {/* ── AQI ── */}
      {airQuality ? (
        <View style={styles.aqiRow}>
          <AQIBadge aqi={airQuality.aqi} />
        </View>
      ) : null}

      {/* ── 3-day forecast ── */}
      <View style={styles.forecastWrapper}>
        <ForecastStrip forecast={weather.daily.slice(0, 3)} unit={unit} />
      </View>
    </ScrollView>
  );
}

function DetailChip({icon, label, value}) {
  return (
    <View style={styles.chip}>
      <Icon name={icon} size={14} color="#38BDF8" />
      <View style={styles.chipText}>
        <Text style={styles.chipValue}>{value}</Text>
        <Text style={styles.chipLabel}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  page: {
    width: SCREEN_WIDTH,
    minHeight: '100%',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  // ── City header ──────────────────────────────────────────────────────────
  cityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  cityNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  cityName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F1F5F9',
    flexShrink: 1,
  },
  regionLabel: {
    fontSize: 13,
    color: '#64748B',
    flexShrink: 1,
  },
  deleteBtn: {
    padding: 2,
  },
  // ── Hero ─────────────────────────────────────────────────────────────────
  heroBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 16,
  },
  heroText: {
    gap: 4,
  },
  temperature: {
    fontSize: 72,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -2,
    includeFontPadding: false,
    lineHeight: 76,
  },
  unit: {
    fontSize: 36,
    fontWeight: '600',
    color: '#94A3B8',
  },
  condition: {
    fontSize: 18,
    color: '#94A3B8',
    fontWeight: '500',
  },
  // ── Chips ────────────────────────────────────────────────────────────────
  chips: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chipText: {
    gap: 1,
  },
  chipValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  chipLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  // ── AQI ──────────────────────────────────────────────────────────────────
  aqiRow: {
    marginBottom: 24,
  },
  // ── Forecast ─────────────────────────────────────────────────────────────
  forecastWrapper: {
    marginTop: 'auto',
  },
  // ── States ───────────────────────────────────────────────────────────────
  hint: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#38BDF8',
    borderRadius: 10,
  },
  retryText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 14,
  },
});
