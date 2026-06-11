import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import CityWeatherPage from '../components/CityWeatherPage';
import CitySearchModal from '../components/CitySearchModal';
import {loadCities, addCity, removeCity} from '../storage/citiesStorage';
import {loadPrefs} from '../storage/prefsStorage';
import {getLocationWithPermission} from '../services/locationService';
import {getWeatherInfo} from '../services/weatherService';
import {writeWeatherData} from '../services/sharedPrefsService';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

export default function CitiesScreen() {
  const [prefs, setPrefs]             = useState(null);
  const [cities, setCities]           = useState([]);
  const [gpsCity, setGpsCity]         = useState(null);
  const [pageIndex, setPageIndex]     = useState(0);   // drives dot UI + FlatList extraData
  const [searchVisible, setSearchVisible] = useState(false);
  const [loading, setLoading]         = useState(true);

  const flatListRef   = useRef(null);
  const pageIndexRef  = useRef(0);   // always-current page, readable inside callbacks
  const prefsRef      = useRef(null);
  const allPagesRef   = useRef([]);  // always-current derived array

  // pageDataRef is keyed by city ID (not array index) so index shifts after
  // add/delete never invalidate cached data for the wrong city.
  const pageDataRef   = useRef({});  // { [cityId]: { weather, airQuality } }

  // ──────────────────────────────────────────────────────────────────────────
  // Keep refs in sync with the latest render values
  // ──────────────────────────────────────────────────────────────────────────
  const allPages = gpsCity ? [gpsCity, ...cities] : cities;

  useEffect(() => {
    allPagesRef.current = allPages;
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Reload prefs on tab focus — picks up unit/theme changes from Settings
  // ──────────────────────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      loadPrefs().then(p => {
        setPrefs(p);
        prefsRef.current = p;
      });
    }, []),
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Initial load: GPS + saved cities
  // ──────────────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [userPrefs, savedCities] = await Promise.all([
        loadPrefs(),
        loadCities(),
      ]);
      setPrefs(userPrefs);
      prefsRef.current = userPrefs;

      let gps = null;
      try {
        const coords = await getLocationWithPermission(
          userPrefs.locationPrecision === 'privacy',
        );
        gps = {
          id: '__gps__',
          name: 'Current Location',
          latitude: coords.latitude,
          longitude: coords.longitude,
          isGPS: true,
        };
      } catch {
        // Location permission denied or unavailable — skip GPS page
      }
      setGpsCity(gps);
      setCities(savedCities);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ──────────────────────────────────────────────────────────────────────────
  // Write the active city's latest weather snapshot to SharedPreferences.
  // This triggers ACTION_APPWIDGET_UPDATE via SharedPrefsModule so the widget
  // always reflects the city currently on screen.
  // ──────────────────────────────────────────────────────────────────────────
  const pushToWidget = useCallback((city, weather, aq) => {
    const p = prefsRef.current;
    if (!city || !weather || !aq || !p) {
      return;
    }
    writeWeatherData({
      cityName:      city.name,
      latitude:      city.latitude,
      longitude:     city.longitude,
      temperature:   weather.current.temperature,
      feelsLike:     weather.current.feelsLike,
      humidity:      weather.current.humidity,
      windSpeed:     weather.current.windSpeed,
      uvIndex:       weather.current.uvIndex,
      visibility:    weather.current.visibility,
      weatherCode:   weather.current.weatherCode,
      weatherLabel:  getWeatherInfo(weather.current.weatherCode).label,
      aqi:           aq.aqi,
      pm25:          aq.pm25,
      pm10:          aq.pm10,
      grassPollen:   aq.grassPollen,
      treePollen:    aq.treePollen,
      weedPollen:    aq.weedPollen,
      tempUnit:      p.tempUnit,
      widgetDisplay: p.widgetDisplay,
      widgetTheme:   p.widgetTheme,
    }).catch(() => {});
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Called by CityWeatherPage when its fetch completes (or when a
  // previously-loaded page becomes active again after a swipe-back).
  // ──────────────────────────────────────────────────────────────────────────
  const handleDataReady = useCallback((cityId, weather, aq) => {
    // Cache using city ID so index shifts after add/delete stay correct
    pageDataRef.current[cityId] = {weather, aq};

    // Only write to widget if this is the page currently on screen
    const activeCity = allPagesRef.current[pageIndexRef.current];
    if (!activeCity || activeCity.id !== cityId) {
      return;
    }
    pushToWidget(activeCity, weather, aq);
  }, [pushToWidget]);

  // ──────────────────────────────────────────────────────────────────────────
  // Scroll handlers
  // ──────────────────────────────────────────────────────────────────────────

  // onScroll fires on every frame — only used for smooth dot animation
  const handleScroll = useCallback(event => {
    const idx = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setPageIndex(idx);
    pageIndexRef.current = idx;
  }, []);

  // onMomentumScrollEnd fires once when the page fully settles — used to push
  // the newly-active city's data to the widget
  const handleMomentumScrollEnd = useCallback(event => {
    const idx = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    pageIndexRef.current = idx;
    setPageIndex(idx);

    const city = allPagesRef.current[idx];
    if (!city) {
      return;
    }
    const cached = pageDataRef.current[city.id];
    if (cached) {
      // Data already loaded — push immediately
      pushToWidget(city, cached.weather, cached.aq);
    }
    // If not cached, the page is still loading; handleDataReady will push
    // once the fetch completes (since it checks activeCity id at that point).
  }, [pushToWidget]);

  // ──────────────────────────────────────────────────────────────────────────
  // Add city from search modal
  // ──────────────────────────────────────────────────────────────────────────
  const handleAddCity = useCallback(async city => {
    const updated = await addCity(city);
    setCities(updated);

    // Scroll to the newly-added page
    const newIdx = (gpsCity ? 1 : 0) + (updated.length - 1);
    // Wait one frame for FlatList to measure the new item before scrolling
    requestAnimationFrame(() => {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({index: newIdx, animated: true});
        pageIndexRef.current = newIdx;
        setPageIndex(newIdx);
        // Widget will update when the new page's data loads via handleDataReady
      }, 80);
    });
  }, [gpsCity]);

  // ──────────────────────────────────────────────────────────────────────────
  // Delete city (long-press or × button)
  // ──────────────────────────────────────────────────────────────────────────
  const handleDeleteCity = useCallback(cityId => {
    const currentIdx = pageIndexRef.current;
    Alert.alert(
      'Remove City',
      'Remove this city from your list?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            // Remove from storage
            const updated = await removeCity(cityId);
            // Evict from cache
            delete pageDataRef.current[cityId];
            setCities(updated);

            // Determine where to land after removal
            const newAllPages = gpsCity
              ? [gpsCity, ...updated]
              : updated;
            const newIdx = Math.min(currentIdx, Math.max(0, newAllPages.length - 1));

            requestAnimationFrame(() => {
              setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                  index: newIdx,
                  animated: false,
                });
                pageIndexRef.current = newIdx;
                setPageIndex(newIdx);

                // Push the new active city's cached data to the widget
                const newActive = newAllPages[newIdx];
                if (newActive) {
                  const cached = pageDataRef.current[newActive.id];
                  if (cached) {
                    pushToWidget(newActive, cached.weather, cached.aq);
                  }
                }
              }, 80);
            });
          },
        },
      ],
    );
  }, [gpsCity, pushToWidget]);

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#38BDF8" />
      </View>
    );
  }

  const activeCity = allPages[pageIndex];

  return (
    <View style={styles.container}>
      {/* ── Floating header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {activeCity ? (
            <Icon
              name={activeCity.isGPS ? 'crosshairs-gps' : 'map-marker'}
              size={14}
              color="#38BDF8"
            />
          ) : null}
          <Text style={styles.headerTitle} numberOfLines={1}>
            {activeCity?.name || 'Cities'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setSearchVisible(true)}>
          <Icon name="plus" size={22} color="#38BDF8" />
        </TouchableOpacity>
      </View>

      {allPages.length === 0 ? (
        /* ── Empty state ── */
        <View style={styles.empty}>
          <Icon name="map-marker-plus-outline" size={64} color="#1E293B" />
          <Text style={styles.emptyTitle}>No cities yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap + to search and add your first city
          </Text>
          <TouchableOpacity
            style={styles.addFirstBtn}
            onPress={() => setSearchVisible(true)}>
            <Text style={styles.addFirstText}>Add City</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* ── Swipeable city pages ── */}
          <FlatList
            ref={flatListRef}
            data={allPages}
            keyExtractor={item => String(item.id)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            onScroll={handleScroll}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            scrollEventThrottle={16}
            // extraData ensures each item re-receives the correct isActive prop
            // when pageIndex changes
            extraData={pageIndex}
            renderItem={({item, index}) => (
              <CityWeatherPage
                city={item}
                unit={prefs?.tempUnit || 'C'}
                isGPS={!!item.isGPS}
                isActive={index === pageIndex}
                onDataReady={(weather, aq) =>
                  handleDataReady(item.id, weather, aq)
                }
                onDelete={
                  item.isGPS
                    ? undefined
                    : () => handleDeleteCity(item.id)
                }
              />
            )}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
          />

          {/* ── Dot indicators ── */}
          <View style={styles.dotsRow}>
            {allPages.map((_, i) => (
              <TouchableOpacity
                key={i}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                onPress={() => {
                  flatListRef.current?.scrollToIndex({index: i, animated: true});
                  pageIndexRef.current = i;
                  setPageIndex(i);
                  // Treat tap-on-dot the same as scroll settle
                  const city = allPagesRef.current[i];
                  if (city) {
                    const cached = pageDataRef.current[city.id];
                    if (cached) {
                      pushToWidget(city, cached.weather, cached.aq);
                    }
                  }
                }}>
                <View
                  style={[styles.dot, i === pageIndex && styles.dotActive]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* ── Search modal ── */}
      <CitySearchModal
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        onCitySelect={handleAddCity}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  centered: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F1F5F9',
    flexShrink: 1,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(56,189,248,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
  },

  // ── Dot indicators ───────────────────────────────────────────────────────
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E293B',
  },
  dotActive: {
    width: 22,
    backgroundColor: '#38BDF8',
    borderRadius: 3,
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#334155',
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 21,
  },
  addFirstBtn: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 13,
    backgroundColor: '#38BDF8',
    borderRadius: 14,
  },
  addFirstText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 15,
  },
});
