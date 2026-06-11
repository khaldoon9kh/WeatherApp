import React, {useState, useCallback, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {searchCities} from '../services/geocodingService';

export default function CitySearchModal({visible, onClose, onCitySelect}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceTimer = useRef(null);

  const handleQueryChange = useCallback(text => {
    setQuery(text);
    setError(null);
    clearTimeout(debounceTimer.current);

    if (text.trim().length < 2) {
      setResults([]);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const cities = await searchCities(text);
        setResults(cities);
      } catch {
        setError('Search failed. Please check your connection.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, []);

  const handleSelect = useCallback(city => {
    onCitySelect(city);
    setQuery('');
    setResults([]);
    onClose();
  }, [onCitySelect, onClose]);

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Add City</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Icon name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <Icon name="magnify" size={20} color="#64748B" style={styles.searchIcon} />
            <TextInput
              style={styles.input}
              placeholder="Search city..."
              placeholderTextColor="#475569"
              value={query}
              onChangeText={handleQueryChange}
              autoFocus
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {loading && <ActivityIndicator size="small" color="#38BDF8" style={styles.loader} />}
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <FlatList
            data={results}
            keyExtractor={item => String(item.id)}
            renderItem={({item}) => (
              <TouchableOpacity style={styles.resultItem} onPress={() => handleSelect(item)}>
                <Icon name="map-marker" size={18} color="#38BDF8" style={styles.pinIcon} />
                <View style={styles.resultText}>
                  <Text style={styles.cityName}>{item.name}</Text>
                  <Text style={styles.regionText}>
                    {[item.region, item.country].filter(Boolean).join(', ')}
                  </Text>
                </View>
                <Icon name="chevron-right" size={18} color="#334155" />
              </TouchableOpacity>
            )}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              !loading && query.length >= 2 ? (
                <Text style={styles.emptyText}>No cities found for "{query}"</Text>
              ) : null
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 46,
    color: '#F1F5F9',
    fontSize: 16,
  },
  loader: {
    marginLeft: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  pinIcon: {
    marginRight: 12,
  },
  resultText: {
    flex: 1,
  },
  cityName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  regionText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  emptyText: {
    color: '#475569',
    textAlign: 'center',
    marginTop: 32,
    fontSize: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 8,
    textAlign: 'center',
  },
});
