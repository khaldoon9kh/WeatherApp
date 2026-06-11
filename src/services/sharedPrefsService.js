import {NativeModules} from 'react-native';

const {WeatherSharedPrefs} = NativeModules;

if (!WeatherSharedPrefs && __DEV__) {
  console.warn(
    '[sharedPrefsService] WeatherSharedPrefs native module not found. ' +
    'Run `npx react-native run-android` to rebuild with the native bridge.',
  );
}

/**
 * Write a full weather + AQI + pollen + settings snapshot to SharedPreferences.
 * Also triggers ACTION_APPWIDGET_UPDATE so the home screen widget reflects
 * the new data immediately — no separate widget refresh call needed.
 *
 * @param {object} payload  See SharedPrefsModule.java for the full key list.
 */
export async function writeWeatherData(payload) {
  if (!WeatherSharedPrefs) {
    return false;
  }
  return WeatherSharedPrefs.writeWeatherData(payload);
}

/**
 * Read the last weather snapshot written by the app.
 * Returns null if the native module is unavailable.
 *
 * @returns {Promise<object|null>}
 */
export async function readWeatherData() {
  if (!WeatherSharedPrefs) {
    return null;
  }
  return WeatherSharedPrefs.readWeatherData();
}

/**
 * Write only widget display settings (tempUnit, widgetDisplay, widgetTheme).
 * Used by SettingsScreen so the widget re-renders on preference change without
 * waiting for the next full weather fetch.
 *
 * @param {{ tempUnit: string, widgetDisplay: string, widgetTheme: string }} settings
 */
export async function writeSettings(settings) {
  if (!WeatherSharedPrefs) {
    return false;
  }
  return WeatherSharedPrefs.writeSettings(settings);
}
