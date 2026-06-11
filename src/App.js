import React, {useEffect} from 'react';
import {StatusBar, Platform, PermissionsAndroid} from 'react-native';
import BackgroundFetch from 'react-native-background-fetch';
import AppNavigator from './navigation/AppNavigator';
import {loadPrefs} from './storage/prefsStorage';
import {loadCities} from './storage/citiesStorage';
import {fetchWeather} from './services/weatherService';
import {fetchAirQuality, getPollenInfo} from './services/airQualityService';
import {requestWidgetRefresh} from './widget/WeatherWidget';

async function backgroundTask(taskId) {
  try {
    const prefs = await loadPrefs();
    const cities = await loadCities();

    // Refresh widget with latest data
    await requestWidgetRefresh();

    // Check pollen and show notifications if enabled
    if (prefs.allergyAlertsEnabled && cities.length > 0) {
      const city = cities[0];
      const aq = await fetchAirQuality(city.latitude, city.longitude);
      const pollens = [
        {label: 'Grass pollen', val: aq.grassPollen},
        {label: 'Tree pollen', val: aq.treePollen},
        {label: 'Weed pollen', val: aq.weedPollen},
      ];
      const alerts = pollens.filter(p => {
        const info = getPollenInfo(p.val);
        return info.label === 'High' || info.label === 'Very High';
      });

      if (alerts.length > 0 && Platform.OS === 'android') {
        const {default: notifee} = await import('@notifee/react-native').catch(() => ({default: null}));
        if (notifee) {
          await notifee.displayNotification({
            title: 'High Pollen Alert',
            body: `${alerts.map(a => a.label).join(', ')} levels are elevated in ${city.name}.`,
            android: {channelId: 'pollen_alerts'},
          });
        }
      }
    }
  } catch {
    // Silently fail — background task should not crash the app
  } finally {
    BackgroundFetch.finish(taskId);
  }
}

async function initBackgroundFetch(minuteInterval = 60) {
  try {
    const status = await BackgroundFetch.configure(
      {
        minimumFetchInterval: minuteInterval,
        stopOnTerminate: false,
        startOnBoot: true,
        enableHeadless: true,
        requiresNetworkConnectivity: true,
      },
      backgroundTask,
      taskId => {
        BackgroundFetch.finish(taskId);
      },
    );
    return status;
  } catch {
    return null;
  }
}

BackgroundFetch.registerHeadlessTask(backgroundTask);

export default function App() {
  useEffect(() => {
    loadPrefs().then(prefs => {
      initBackgroundFetch(prefs.updateFrequency || 60);
    });

    if (Platform.OS === 'android') {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS).catch(() => {});
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
