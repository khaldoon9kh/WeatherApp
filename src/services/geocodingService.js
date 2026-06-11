const BASE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

export async function searchCities(query, count = 6) {
  if (!query || query.trim().length < 2) {
    return [];
  }
  const params = new URLSearchParams({
    name: query.trim(),
    count,
    language: 'en',
    format: 'json',
  });

  const res = await fetch(`${BASE_URL}?${params}`);
  if (!res.ok) {
    throw new Error(`Geocoding API error: ${res.status}`);
  }
  const data = await res.json();

  if (!data.results) {
    return [];
  }

  return data.results.map(r => ({
    id: r.id,
    name: r.name,
    region: r.admin1 || '',
    country: r.country || '',
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone || 'auto',
  }));
}
