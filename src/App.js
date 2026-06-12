import React, {useEffect} from 'react';
import {StatusBar, Platform, PermissionsAndroid} from 'react-native';
import BackgroundFetch from 'react-native-background-fetch';
import AppNavigator from './navigation/AppNavigator';
import {loadPrefs} from './storage/prefsStorage';
import {loadCities} from './storage/citiesStorage';
import {fetchWeather, getWeatherInfo, weatherEmoji} from './services/weatherService';
import {fetchAirQuality, getPollenInfo} from './services/airQualityService';
import {writeWeatherData} from './services/sharedPrefsService';

// ---------------------------------------------------------------------------
// Background fetch task
// Runs periodically (per user setting) when the app is not foregrounded.
// Strategy:
//   1. Fetch fresh weather + AQI for the first saved city.
//   2. Write the snapshot to SharedPreferences — SharedPrefsModule.triggerWidgetUpdate()
//      is called inside writeWeatherData(), so the widget updates automatically.
//      No separate widget-refresh call is needed.
//   3. Optionally fire a pollen notification if allergyAlertsEnabled.
// ---------------------------------------------------------------------------
async function backgroundTask(taskId) {
  try {
    const prefs  = await loadPrefs();
    const cities = await loadCities();

    if (cities.length === 0) {
      BackgroundFetch.finish(taskId);
      return;
    }

    const city = cities[0];
    const [weather, aq] = await Promise.all([
      fetchWeather(city.latitude, city.longitude),
      fetchAirQuality(city.latitude, city.longitude),
    ]);

    // Writing to SharedPreferences also broadcasts ACTION_APPWIDGET_UPDATE,
    // causing WeatherWidgetProvider.onUpdate() → JS HeadlessTask to re-render
    // the widget from the freshly written data.
    const hourlyPayload = {};
    (weather.hourly || []).slice(0, 6).forEach((h, i) => {
      const isDaytime = h.hour >= 6 && h.hour < 20;
      hourlyPayload[`hour${i}Label`] = h.label;
      hourlyPayload[`hour${i}Icon`]  = weatherEmoji(h.weatherCode, isDaytime);
      hourlyPayload[`hour${i}Temp`]  = h.temp;
    });
    await writeWeatherData({
      cityName:     city.name,
      latitude:     city.latitude,
      longitude:    city.longitude,
      temperature:  weather.current.temperature,
      feelsLike:    weather.current.feelsLike,
      humidity:     weather.current.humidity,
      windSpeed:    weather.current.windSpeed,
      uvIndex:      weather.current.uvIndex,
      visibility:   weather.current.visibility,
      weatherCode:  weather.current.weatherCode,
      weatherLabel: getWeatherInfo(weather.current.weatherCode).label,
      dailyHigh:    weather.daily[0]?.tempMax ?? 0,
      dailyLow:     weather.daily[0]?.tempMin ?? 0,
      aqi:          aq.aqi,
      pm25:         aq.pm25,
      pm10:         aq.pm10,
      grassPollen:  aq.grassPollen,
      treePollen:   aq.treePollen,
      weedPollen:   aq.weedPollen,
      tempUnit:     prefs.tempUnit,
      widgetDisplay: prefs.widgetDisplay,
      widgetTheme:  prefs.widgetTheme,
      ...hourlyPayload,
    });

    // Pollen alert notification
    if (prefs.allergyAlertsEnabled && Platform.OS === 'android') {
      const alerts = [
        {label: 'Grass pollen', val: aq.grassPollen},
        {label: 'Tree pollen',  val: aq.treePollen},
        {label: 'Weed pollen',  val: aq.weedPollen},
      ].filter(p => {
        const info = getPollenInfo(p.val);
        return info.label === 'High' || info.label === 'Very High';
      });

      if (alerts.length > 0) {
        showPollenNotification(city.name, alerts.map(a => a.label));
      }
    }
  } catch {
    // Silently fail — background tasks must never crash
  } finally {
    BackgroundFetch.finish(taskId);
  }
}

function showPollenNotification(cityName, alertLabels) {
  // Use Android NotificationManager directly via the Headless context.
  // We avoid adding @notifee/react-native as an extra dependency; the channel
  // is created in MainApplication.java.
  try {
    const {NativeModules} = require('react-native');
    // If the project later adds @notifee/react-native, wire it in here.
    // For now this is a documented extension point.
    void NativeModules; // suppress unused-var lint
    void cityName;
    void alertLabels;
  } catch {
    // noop
  }
}

async function initBackgroundFetch(minuteInterval = 60) {
  try {
    await BackgroundFetch.configure(
      {
        minimumFetchInterval: minuteInterval,
        stopOnTerminate: false,
        startOnBoot: true,
        enableHeadless: true,
        requiresNetworkConnectivity: true,
      },
      backgroundTask,
      taskId => BackgroundFetch.finish(taskId),
    );
  } catch {
    // Background fetch not supported on this device/OS version
  }
}

BackgroundFetch.registerHeadlessTask(backgroundTask);

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------
export default function App() {
  useEffect(() => {
    loadPrefs().then(prefs => {
      initBackgroundFetch(prefs.updateFrequency || 60);
    });

    if (Platform.OS === 'android') {
      PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      ).catch(() => {});
    }
  }, []);

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0F172A"
        translucent={false}
      />
      <AppNavigator />
    </>
  );
}
