import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFS_KEY = '@weather_prefs';

const DEFAULT_PREFS = {
  tempUnit: 'C',
  widgetDisplay: 'temp_condition_aqi',  // 'temp_only' | 'temp_condition' | 'temp_condition_aqi'
  widgetTheme: 'dark',                  // 'dark' | 'light' | 'transparent'
  locationPrecision: 'exact',           // 'exact' | 'privacy'
  updateFrequency: 60,                  // minutes: 30 | 60 | 180
  allergyAlertsEnabled: true,
};

export async function loadPrefs() {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) {
      return {...DEFAULT_PREFS};
    }
    return {...DEFAULT_PREFS, ...JSON.parse(raw)};
  } catch {
    return {...DEFAULT_PREFS};
  }
}

export async function savePrefs(prefs) {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export async function updatePref(key, value) {
  const current = await loadPrefs();
  const updated = {...current, [key]: value};
  await savePrefs(updated);
  return updated;
}
