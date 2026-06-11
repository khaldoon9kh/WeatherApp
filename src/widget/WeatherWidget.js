import React from 'react';
import {FlexWidget, TextWidget} from 'react-native-android-widget';
import {readWeatherData} from '../services/sharedPrefsService';
import {loadPrefs} from '../storage/prefsStorage';
import {getWeatherInfo, convertTemp} from '../services/weatherService';
import {getAQIInfo, getPollenInfo} from '../services/airQualityService';

// ---------------------------------------------------------------------------
// Theme palette (mirrors HomeScreen dark theme)
// ---------------------------------------------------------------------------
const THEMES = {
  dark:        {bg: '#0F172A', text: '#FFFFFF', sub: '#94A3B8'},
  light:       {bg: '#F1F5F9', text: '#0F172A', sub: '#64748B'},
  transparent: {bg: 'transparent', text: '#FFFFFF', sub: '#CBD5E1'},
};

// ---------------------------------------------------------------------------
// Widget UI component
// ---------------------------------------------------------------------------
function WeatherWidgetView({city, temp, unit, condition, aqi, topPollen, theme, display}) {
  const colors = THEMES[theme] || THEMES.dark;
  const aqiInfo = aqi != null && aqi > 0 ? getAQIInfo(aqi) : null;
  const showCondition = display === 'temp_condition' || display === 'temp_condition_aqi';
  const showAqi = display === 'temp_condition_aqi';

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

      {/* City */}
      <TextWidget
        text={city || 'Weather'}
        style={{color: colors.sub, fontSize: 13, fontWeight: '600'}}
      />

      {/* Temperature */}
      <FlexWidget style={{flexDirection: 'row', alignItems: 'flex-end'}}>
        <TextWidget
          text={`${temp}°${unit}`}
          style={{color: colors.text, fontSize: 42, fontWeight: 'bold'}}
        />
      </FlexWidget>

      {/* Condition */}
      {showCondition && condition ? (
        <TextWidget
          text={condition}
          style={{color: colors.sub, fontSize: 13}}
        />
      ) : null}

      {/* AQI pill */}
      {showAqi && aqiInfo ? (
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: aqiInfo.bg,
            borderRadius: 10,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}>
          <TextWidget
            text={`AQI ${Math.round(aqi)}  ${aqiInfo.label}`}
            style={{color: aqiInfo.color, fontSize: 11, fontWeight: 'bold'}}
          />
        </FlexWidget>
      ) : null}

      {/* Top pollen */}
      {showAqi && topPollen ? (
        <TextWidget
          text={topPollen}
          style={{color: colors.sub, fontSize: 11}}
        />
      ) : null}

    </FlexWidget>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a SharedPreferences snapshot (from readWeatherData) into the props
 * that WeatherWidgetView expects.
 */
function snapshotToViewProps(d) {
  const unit = d.tempUnit || 'C';
  const temp = String(convertTemp(d.temperature || 0, unit));
  const info = getWeatherInfo(d.weatherCode || 0);

  // Pick the single highest pollen type
  let topPollen = null;
  const pollens = [
    {label: 'Grass', val: d.grassPollen || 0},
    {label: 'Tree',  val: d.treePollen  || 0},
    {label: 'Weed',  val: d.weedPollen  || 0},
  ];
  const highest = pollens.reduce((a, b) => (a.val > b.val ? a : b));
  if (highest.val > 10) {
    const pi = getPollenInfo(highest.val);
    topPollen = `${highest.label} pollen: ${pi.label}`;
  }

  return {
    city:      d.cityName     || '',
    temp,
    unit,
    condition: d.weatherLabel || info.label,
    aqi:       d.aqi   > 0   ? d.aqi   : null,
    topPollen,
    theme:     d.widgetTheme  || 'dark',
    display:   d.widgetDisplay || 'temp_condition_aqi',
  };
}

const STALE_THRESHOLD_MS = 3 * 60 * 60 * 1000; // 3 hours

// ---------------------------------------------------------------------------
// Widget task handler — registered in index.js as the HeadlessTask handler.
// This function is the ONLY place widget data originates from; it reads
// SharedPreferences written by the app and never makes network calls.
// ---------------------------------------------------------------------------
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
    const snapshot = await readWeatherData();
    const hasData  = snapshot && snapshot.cityName && snapshot.cityName.length > 0;
    const isFresh  = hasData && (Date.now() - snapshot.lastUpdated) < STALE_THRESHOLD_MS;

    if (isFresh) {
      // Fast path — paint directly from the snapshot the app already wrote
      renderWidget(<WeatherWidgetView {...snapshotToViewProps(snapshot)} />);
      return;
    }

    if (hasData) {
      // Stale snapshot — still show last-known data rather than a blank widget.
      // The widget will update properly next time the app fetches fresh data.
      renderWidget(<WeatherWidgetView {...snapshotToViewProps(snapshot)} />);
      return;
    }

    // No snapshot at all — the app hasn't run yet. Show an "open app" prompt
    // using whatever preferences are available from AsyncStorage.
    const prefs = await loadPrefs();
    renderWidget(
      <WeatherWidgetView
        city="Open app to load"
        temp="--"
        unit={prefs.tempUnit}
        condition=""
        aqi={null}
        topPollen={null}
        theme={prefs.widgetTheme}
        display={prefs.widgetDisplay}
      />,
    );
  } catch {
    renderWidget(
      <WeatherWidgetView
        city="Weather"
        temp="--"
        unit="C"
        condition="—"
        aqi={null}
        topPollen={null}
        theme="dark"
        display="temp_condition"
      />,
    );
  }
}
