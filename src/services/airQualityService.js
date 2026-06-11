const BASE_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

export const AQI_LEVELS = [
  {max: 20,       label: 'Good',           color: '#22C55E', bg: 'rgba(34,197,94,0.2)'},
  {max: 40,       label: 'Fair',           color: '#84CC16', bg: 'rgba(132,204,22,0.2)'},
  {max: 60,       label: 'Moderate',       color: '#EAB308', bg: 'rgba(234,179,8,0.2)'},
  {max: 80,       label: 'Poor',           color: '#F97316', bg: 'rgba(249,115,22,0.2)'},
  {max: 100,      label: 'Very Poor',      color: '#EF4444', bg: 'rgba(239,68,68,0.2)'},
  {max: Infinity, label: 'Hazardous',      color: '#A855F7', bg: 'rgba(168,85,247,0.2)'},
];

export const POLLEN_LEVELS = [
  {max: 10,       label: 'Low',       color: '#22C55E', bg: 'rgba(34,197,94,0.15)'},
  {max: 50,       label: 'Medium',    color: '#EAB308', bg: 'rgba(234,179,8,0.15)'},
  {max: 200,      label: 'High',      color: '#F97316', bg: 'rgba(249,115,22,0.15)'},
  {max: Infinity, label: 'Very High', color: '#EF4444', bg: 'rgba(239,68,68,0.15)'},
];

export function getAQIInfo(aqi) {
  return AQI_LEVELS.find(l => aqi <= l.max) ?? AQI_LEVELS[AQI_LEVELS.length - 1];
}

export function getPollenInfo(value) {
  if (value == null || isNaN(value)) {
    return POLLEN_LEVELS[0];
  }
  return POLLEN_LEVELS.find(l => value <= l.max) ?? POLLEN_LEVELS[POLLEN_LEVELS.length - 1];
}

export function buildAllergySummary(grass, tree, weed) {
  const highItems = [];
  const veryHighItems = [];

  if (grass > 200) {veryHighItems.push('grass pollen');}
  else if (grass > 50) {highItems.push('grass pollen');}

  if (tree > 200) {veryHighItems.push('tree pollen');}
  else if (tree > 50) {highItems.push('tree pollen');}

  if (weed > 200) {veryHighItems.push('weed pollen');}
  else if (weed > 50) {highItems.push('weed pollen');}

  if (veryHighItems.length > 0) {
    return `Very high ${veryHighItems.join(' and ')} — consider antihistamines and limit outdoor time.`;
  }
  if (highItems.length > 0) {
    return `High ${highItems.join(' and ')} today — consider antihistamines if you are sensitive.`;
  }
  if (grass > 10 || tree > 10 || weed > 10) {
    return 'Moderate pollen levels — sensitive individuals may want to limit outdoor exposure.';
  }
  return 'Low pollen today — great day for outdoor activities!';
}

export async function fetchAirQuality(latitude, longitude) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: [
      'pm2_5',
      'pm10',
      'european_aqi',
      'grass_pollen',
      'tree_pollen',
      'weed_pollen',
    ].join(','),
    timezone: 'auto',
  });

  const res = await fetch(`${BASE_URL}?${params}`);
  if (!res.ok) {
    throw new Error(`Air quality API error: ${res.status}`);
  }
  const data = await res.json();
  const c = data.current;

  return {
    pm25: c.pm2_5,
    pm10: c.pm10,
    aqi: c.european_aqi,
    grassPollen: c.grass_pollen,
    treePollen: c.tree_pollen,
    weedPollen: c.weed_pollen,
  };
}
