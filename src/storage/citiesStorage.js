import AsyncStorage from '@react-native-async-storage/async-storage';

const CITIES_KEY = '@weather_cities';

export async function loadCities() {
  try {
    const raw = await AsyncStorage.getItem(CITIES_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveCities(cities) {
  await AsyncStorage.setItem(CITIES_KEY, JSON.stringify(cities));
}

export async function addCity(city) {
  const cities = await loadCities();
  const exists = cities.some(c => c.id === city.id);
  if (exists) {
    return cities;
  }
  const updated = [...cities, city];
  await saveCities(updated);
  return updated;
}

export async function removeCity(cityId) {
  const cities = await loadCities();
  const updated = cities.filter(c => c.id !== cityId);
  await saveCities(updated);
  return updated;
}
