const BASE_URL = 'https://api.open-meteo.com/v1/forecast';

export const WEATHER_CODES = {
  0:  {label: 'Clear Sky',            icon: 'weather-sunny'},
  1:  {label: 'Mainly Clear',         icon: 'weather-sunny'},
  2:  {label: 'Partly Cloudy',        icon: 'weather-partly-cloudy'},
  3:  {label: 'Overcast',             icon: 'weather-cloudy'},
  45: {label: 'Foggy',                icon: 'weather-fog'},
  48: {label: 'Icy Fog',              icon: 'weather-fog'},
  51: {label: 'Light Drizzle',        icon: 'weather-partly-rainy'},
  53: {label: 'Drizzle',              icon: 'weather-partly-rainy'},
  55: {label: 'Dense Drizzle',        icon: 'weather-rainy'},
  61: {label: 'Light Rain',           icon: 'weather-rainy'},
  63: {label: 'Rain',                 icon: 'weather-rainy'},
  65: {label: 'Heavy Rain',           icon: 'weather-pouring'},
  71: {label: 'Light Snow',           icon: 'weather-snowy'},
  73: {label: 'Snow',                 icon: 'weather-snowy'},
  75: {label: 'Heavy Snow',           icon: 'weather-snowy-heavy'},
  77: {label: 'Snow Grains',          icon: 'weather-snowy'},
  80: {label: 'Light Showers',        icon: 'weather-partly-rainy'},
  81: {label: 'Showers',             icon: 'weather-pouring'},
  82: {label: 'Heavy Showers',        icon: 'weather-pouring'},
  85: {label: 'Snow Showers',         icon: 'weather-snowy-rainy'},
  86: {label: 'Heavy Snow Showers',   icon: 'weather-snowy-rainy'},
  95: {label: 'Thunderstorm',         icon: 'weather-lightning'},
  96: {label: 'Thunderstorm + Hail',  icon: 'weather-lightning-rainy'},
  99: {label: 'Heavy Thunderstorm',   icon: 'weather-lightning-rainy'},
};

export function getWeatherInfo(code) {
  return WEATHER_CODES[code] || {label: 'Unknown', icon: 'weather-cloudy'};
}

export function convertTemp(celsius, unit) {
  if (unit === 'F') {
    return Math.round(celsius * 9 / 5 + 32);
  }
  return Math.round(celsius);
}

export function tempLabel(celsius, unit) {
  return `${convertTemp(celsius, unit)}°${unit}`;
}

/** Emoji icon for widget and app-preview — switches sun/moon for day/night. */
export function weatherEmoji(code, isDaytime = true) {
  if (code === 0 || code === 1)           return isDaytime ? '☀️' : '🌙';
  if (code === 2)                         return isDaytime ? '⛅' : '☁️';
  if (code === 3)                         return '☁️';
  if (code === 45 || code === 48)         return '🌫️';
  if (code >= 51 && code <= 55)           return '🌦️';
  if (code >= 61 && code <= 65)           return '🌧️';
  if (code >= 71 && code <= 77)           return '❄️';
  if (code >= 80 && code <= 82)           return '🌩️';
  if (code >= 85 && code <= 86)           return '🌨️';
  if (code >= 95)                         return '⛈️';
  return isDaytime ? '⛅' : '🌙';
}

export async function fetchWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: [
      'temperature_2m',
      'apparent_temperature',
      'weathercode',
      'windspeed_10m',
      'relativehumidity_2m',
      'visibility',
      'uv_index',
    ].join(','),
    hourly: [
      'temperature_2m',
      'weathercode',
    ].join(','),
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'weathercode',
    ].join(','),
    forecast_days: 2, // 2 days so we always have 6 hours ahead even near midnight
    timezone: 'auto',
    wind_speed_unit: 'kmh',
  });

  const res = await fetch(`${BASE_URL}?${params}`);
  if (!res.ok) {
    throw new Error(`Weather API error: ${res.status}`);
  }
  const data = await res.json();

  // Find the current hour's index in the hourly array using the current.time field
  const currentHourPrefix = data.current.time.substring(0, 13); // "YYYY-MM-DDTHH"
  const hourlyTimes = data.hourly.time;
  let startIdx = hourlyTimes.findIndex(t => t.startsWith(currentHourPrefix));
  if (startIdx < 0) startIdx = 0;

  const hourly = [];
  for (let i = 0; i < 6; i++) {
    const idx = startIdx + i;
    if (idx >= hourlyTimes.length) break;
    const timeStr = hourlyTimes[idx]; // "2024-06-12T14:00"
    const hourNum = parseInt(timeStr.substring(11, 13), 10);
    let label;
    if (i === 0) {
      label = 'Now';
    } else {
      const ampm = hourNum >= 12 ? 'PM' : 'AM';
      const h12  = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
      label = `${h12} ${ampm}`;
    }
    hourly.push({
      label,
      weatherCode: data.hourly.weathercode[idx],
      temp:        data.hourly.temperature_2m[idx],
      hour:        hourNum,
    });
  }

  return {
    current: {
      temperature: data.current.temperature_2m,
      feelsLike:   data.current.apparent_temperature,
      weatherCode: data.current.weathercode,
      windSpeed:   data.current.windspeed_10m,
      humidity:    data.current.relativehumidity_2m,
      visibility:  data.current.visibility / 1000,
      uvIndex:     data.current.uv_index,
    },
    daily: data.daily.time.map((date, i) => ({
      date,
      tempMax:     data.daily.temperature_2m_max[i],
      tempMin:     data.daily.temperature_2m_min[i],
      weatherCode: data.daily.weathercode[i],
    })),
    hourly,
  };
}
