import React from 'react';
import {FlexWidget, TextWidget, ImageWidget} from 'react-native-android-widget';
import {loadPrefs} from '../storage/prefsStorage';
import {loadCities} from '../storage/citiesStorage';
import {fetchWeather, getWeatherInfo, convertTemp} from '../services/weatherService';
import {fetchAirQuality, getAQIInfo, getPollenInfo} from '../services/airQualityService';

const THEME_COLORS = {
  dark: {
    bg: '#0F172A',
    text: '#FFFFFF',
    sub: '#94A3B8',
    border: 'rgba(255,255,255,0.1)',
  },
  light: {
    bg: '#F1F5F9',
    text: '#0F172A',
    sub: '#64748B',
    border: 'rgba(0,0,0,0.1)',
  },
  transparent: {
    bg: 'transparent',
    text: '#FFFFFF',
    sub: 'rgba(255,255,255,0.7)',
    border: 'rgba(255,255,255,0.15)',
  },
};

function WeatherWidgetView({city, temp, unit, condition, aqi, topPollen, theme, display}) {
  const colors = THEME_COLORS[theme] || THEME_COLORS.dark;
  const aqiInfo = aqi != null ? getAQIInfo(aqi) : null;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        backgroundColor: colors.bg,
        borderRadius: 20,
        padding: 16,
      }}
      clickAction="OPEN_APP">
      {/* City name */}
      <TextWidget
        text={city || 'Weather'}
        style={{
          color: colors.sub,
          fontSize: 13,
          fontWeight: '600',
        }}
      />

      {/* Temperature */}
      <FlexWidget style={{flexDirection: 'row', alignItems: 'center'}}>
        <TextWidget
          text={`${temp}°${unit}`}
          style={{
            color: colors.text,
            fontSize: 42,
            fontWeight: 'bold',
          }}
        />
      </FlexWidget>

      {/* Condition (if display includes it) */}
      {(display === 'temp_condition' || display === 'temp_condition_aqi') && (
        <TextWidget
          text={condition || ''}
          style={{
            color: colors.sub,
            fontSize: 13,
          }}
        />
      )}

      {/* AQI + Pollen (if display is temp_condition_aqi) */}
      {display === 'temp_condition_aqi' && aqiInfo && (
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: aqiInfo.bg,
            borderRadius: 10,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}>
          <TextWidget
            text={`AQI ${Math.round(aqi)}  ${aqiInfo.label}`}
            style={{
              color: aqiInfo.color,
              fontSize: 11,
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>
      )}

      {display === 'temp_condition_aqi' && topPollen && (
        <TextWidget
          text={topPollen}
          style={{
            color: colors.sub,
            fontSize: 11,
          }}
        />
      )}
    </FlexWidget>
  );
}

export async function widgetTaskHandler(props) {
  const {widgetAction, renderWidget} = props;

  if (
    widgetAction !== 'WIDGET_ADDED' &&
    widgetAction !== 'WIDGET_UPDATE' &&
    widgetAction !== 'WIDGET_RESIZED'
  ) {
    return;
  }

  try {
    const prefs = await loadPrefs();
    const {tempUnit: unit, widgetTheme: theme, widgetDisplay: display} = prefs;

    const savedCities = await loadCities();
    const hasCity = savedCities.length > 0;

    let cityName = 'Weather';
    let lat = 0;
    let lon = 0;

    if (hasCity) {
      const city = savedCities[0];
      cityName = city.name;
      lat = city.latitude;
      lon = city.longitude;
    } else {
      renderWidget(
        <WeatherWidgetView
          city="Add a city"
          temp="--"
          unit={unit}
          condition=""
          aqi={null}
          topPollen={null}
          theme={theme}
          display={display}
        />,
      );
      return;
    }

    const [weather, airQuality] = await Promise.all([
      fetchWeather(lat, lon),
      fetchAirQuality(lat, lon),
    ]);

    const current = weather.current;
    const info = getWeatherInfo(current.weatherCode);
    const temp = convertTemp(current.temperature, unit);

    let topPollen = null;
    if (airQuality) {
      const pollens = [
        {label: 'Grass', val: airQuality.grassPollen},
        {label: 'Tree', val: airQuality.treePollen},
        {label: 'Weed', val: airQuality.weedPollen},
      ];
      const highest = pollens.reduce((a, b) => ((a.val || 0) > (b.val || 0) ? a : b));
      const pollenInfo = getPollenInfo(highest.val);
      if (highest.val > 10) {
        topPollen = `${highest.label}: ${pollenInfo.label}`;
      }
    }

    renderWidget(
      <WeatherWidgetView
        city={cityName}
        temp={String(temp)}
        unit={unit}
        condition={info.label}
        aqi={airQuality?.aqi}
        topPollen={topPollen}
        theme={theme}
        display={display}
      />,
    );
  } catch {
    renderWidget(
      <WeatherWidgetView
        city="Weather"
        temp="--"
        unit="C"
        condition="Error loading"
        aqi={null}
        topPollen={null}
        theme="dark"
        display="temp_condition"
      />,
    );
  }
}

export async function requestWidgetRefresh() {
  const {requestWidgetUpdate} = require('react-native-android-widget');
  const prefs = await loadPrefs();

  try {
    await requestWidgetUpdate({
      widgetName: 'WeatherWidget',
      renderWidget: (info) => <WeatherWidgetView
        city="Updating..."
        temp="--"
        unit={prefs.tempUnit}
        condition=""
        aqi={null}
        topPollen={null}
        theme={prefs.widgetTheme}
        display={prefs.widgetDisplay}
      />,
      widgetNotFound: () => {},
    });
  } catch {
    // Widget not placed on home screen
  }
}
