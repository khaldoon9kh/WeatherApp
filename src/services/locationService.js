import Geolocation from '@react-native-community/geolocation';
import {PermissionsAndroid, Platform} from 'react-native';

export async function requestLocationPermission() {
  if (Platform.OS !== 'android') {
    return true;
  }
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Weather App Location Permission',
      message: 'Weather App needs access to your location to show local weather.',
      buttonNeutral: 'Ask Me Later',
      buttonNegative: 'Cancel',
      buttonPositive: 'OK',
    },
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export function getCurrentLocation(privacyMode = false) {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => {
        let {latitude, longitude} = position.coords;
        if (privacyMode) {
          // Round to 2 decimal places (~1 km accuracy)
          latitude = Math.round(latitude * 100) / 100;
          longitude = Math.round(longitude * 100) / 100;
        }
        resolve({latitude, longitude});
      },
      error => reject(error),
      {
        enableHighAccuracy: !privacyMode,
        timeout: 15000,
        maximumAge: 60000,
      },
    );
  });
}

export async function getLocationWithPermission(privacyMode = false) {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    throw new Error('Location permission denied');
  }
  return getCurrentLocation(privacyMode);
}
