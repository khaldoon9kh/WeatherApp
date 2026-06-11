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
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import CityWeatherPage from '../components/CityWeatherPage';
import CitySearchModal from '../components/CitySearchModal';
import {loadCities, addCity, removeCity} from '../storage/citiesStorage';
import {loadPrefs} from '../storage/prefsStorage';
import {getLocationWithPermission} from '../services/locationService';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

export default function CitiesScreen() {
  const [prefs, setPrefs] = useState(null);
  const [cities, setCities] = useState([]);
  const [gpsCity, setGpsCity] = useState(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [searchVisible, setSearchVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [userPrefs, savedCities] = await Promise.all([
        loadPrefs(),
        loadCities(),
      ]);
      setPrefs(userPrefs);

      try {
        const coords = await getLocationWithPermission(
          userPrefs.locationPrecision === 'privacy',
        );
        setGpsCity({
          id: '__gps__',
          name: 'Current Location',
          latitude: coords.latitude,
          longitude: coords.longitude,
          isGPS: true,
        });
      } catch {
        setGpsCity(null);
      }

      setCities(savedCities);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const allPages = gpsCity
    ? [gpsCity, ...cities]
    : cities;

  const handleAddCity = useCallback(async city => {
    const updated = await addCity(city);
    setCities(updated);
    const newIndex = (gpsCity ? 1 : 0) + updated.length - 1;
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({index: newIndex, animated: true});
      setPageIndex(newIndex);
    }, 300);
  }, [gpsCity]);

  const handleDeleteCity = useCallback(cityId => {
    Alert.alert(
      'Remove City',
      'Remove this city from your list?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updated = await removeCity(cityId);
            setCities(updated);
            if (pageIndex > 0) {
              setPageIndex(p => Math.max(0, p - 1));
            }
          },
        },
      ],
    );
  }, [pageIndex]);

  const onScroll = useCallback(event => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / SCREEN_WIDTH);
    setPageIndex(index);
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#38BDF8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cities</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setSearchVisible(true)}>
          <Icon name="plus" size={22} color="#38BDF8" />
        </TouchableOpacity>
      </View>

      {allPages.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="map-marker-plus" size={56} color="#334155" />
          <Text style={styles.emptyTitle}>No cities yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap + to search and add cities
          </Text>
          <TouchableOpacity
            style={styles.addFirstBtn}
            onPress={() => setSearchVisible(true)}>
            <Text style={styles.addFirstText}>Add City</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={allPages}
            keyExtractor={item => String(item.id)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            renderItem={({item}) => (
              <CityPageWrapper
                city={item}
                unit={prefs?.tempUnit || 'C'}
                onLongPress={
                  item.isGPS ? undefined : () => handleDeleteCity(item.id)
                }
              />
            )}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
          />

          {/* Dot indicators */}
          <View style={styles.dotsRow}>
            {allPages.map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => {
                  flatListRef.current?.scrollToIndex({index: i, animated: true});
                  setPageIndex(i);
                }}>
                <View
                  style={[
                    styles.dot,
                    i === pageIndex && styles.dotActive,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <CitySearchModal
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        onCitySelect={handleAddCity}
      />
    </View>
  );
}

function CityPageWrapper({city, unit, onLongPress}) {
  return (
    <TouchableOpacity
      style={styles.pageWrapper}
      onLongPress={onLongPress}
      delayLongPress={600}
      activeOpacity={1}>
      {onLongPress && (
        <View style={styles.deleteHint}>
          <Icon name="gesture-tap-hold" size={12} color="#475569" />
          <Text style={styles.deleteHintText}>Hold to remove</Text>
        </View>
      )}
      <CityWeatherPage city={city} unit={unit} isGPS={city.isGPS} />
    </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F1F5F9',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(56,189,248,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
  },
  pageWrapper: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  deleteHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 24,
    paddingBottom: 4,
  },
  deleteHintText: {
    fontSize: 11,
    color: '#475569',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#334155',
  },
  dotActive: {
    width: 20,
    backgroundColor: '#38BDF8',
    borderRadius: 3,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#334155',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#1E293B',
    textAlign: 'center',
  },
  addFirstBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: '#38BDF8',
    borderRadius: 14,
  },
  addFirstText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 15,
  },
});
