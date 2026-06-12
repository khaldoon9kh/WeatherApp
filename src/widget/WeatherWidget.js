import React from 'react';
import {FlexWidget, TextWidget} from 'react-native-android-widget';
import {readWeatherData} from '../services/sharedPrefsService';
import {loadPrefs} from '../storage/prefsStorage';
import {getWeatherInfo, convertTemp, weatherEmoji} from '../services/weatherService';

// ---------------------------------------------------------------------------
// Widget UI — premium 4×2 gradient design
// ---------------------------------------------------------------------------

function HourColumn({label, icon, temp}) {
  return (
    <FlexWidget style={{flex: 1, flexDirection: 'column', alignItems: 'center'}}>
      <TextWidget text={label} style={{color: '#A8C4DC', fontSize: 8}} />
      <TextWidget text={icon}  style={{fontSize: 14}} />
      <TextWidget text={`${Math.round(temp)}°`} style={{color: '#FFFFFF', fontSize: 9, fontWeight: 'bold'}} />
    </FlexWidget>
  );
}

function WeatherWidgetView({time, dayDate, temp, unit, condition, weatherIcon, hiLo, hourly}) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width:  'match_parent',
        flexDirection: 'column',
        backgroundColor: '#1B3354',
        borderRadius: 28,
        padding: 14,
      }}
      clickAction="OPEN_APP">

      {/* Top section: left clock | right weather */}
      <FlexWidget style={{flex: 1, flexDirection: 'row', alignItems: 'center'}}>

        {/* Left: large time + day/date */}
        <FlexWidget
          style={{flex: 1, flexDirection: 'column', justifyContent: 'center', paddingRight: 10}}>
          <TextWidget
            text={time}
            style={{color: '#FFFFFF', fontSize: 34, fontWeight: 'bold'}}
          />
          <TextWidget
            text={dayDate}
            style={{color: '#A8C4DC', fontSize: 10}}
          />
        </FlexWidget>

        {/* Right: emoji icon + temp/condition + H/L */}
        <FlexWidget
          style={{flex: 1, flexDirection: 'column', justifyContent: 'center', paddingLeft: 10}}>
          <FlexWidget style={{flexDirection: 'row', alignItems: 'center'}}>
            <TextWidget text={weatherIcon} style={{fontSize: 28, paddingRight: 6}} />
            <FlexWidget style={{flexDirection: 'column'}}>
              <TextWidget
                text={`${temp}°${unit}`}
                style={{color: '#FFFFFF', fontSize: 26, fontWeight: 'bold'}}
              />
              <TextWidget
                text={condition}
                style={{color: '#A8C4DC', fontSize: 10}}
              />
            </FlexWidget>
          </FlexWidget>
          <TextWidget
            text={hiLo}
            style={{color: '#7AAEC8', fontSize: 9}}
          />
        </FlexWidget>

      </FlexWidget>

      {/* Bottom: glassmorphism hourly strip */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          backgroundColor: '#2A4A6A',
          borderRadius: 14,
          paddingHorizontal: 4,
          paddingVertical: 7,
        }}>
        {(hourly || []).slice(0, 6).map((h, i) => (
          <HourColumn key={String(i)} label={h.label} icon={h.icon} temp={h.temp} />
        ))}
      </FlexWidget>

    </FlexWidget>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildCurrentTime() {
  const now  = new Date();
  const h    = String(now.getHours()).padStart(2, '0');
  const m    = String(now.getMinutes()).padStart(2, '0');
  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MONS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
  return {
    time:    `${h}:${m}`,
    dayDate: `${DAYS[now.getDay()]}, ${MONS[now.getMonth()]} ${now.getDate()}`,
    hour:    now.getHours(),
  };
}

function snapshotToViewProps(d) {
  const unit = d.tempUnit || 'C';
  const temp = convertTemp(d.temperature || 0, unit);
  const hi   = convertTemp(d.dailyHigh   || 0, unit);
  const lo   = convertTemp(d.dailyLow    || 0, unit);
  const info = getWeatherInfo(d.weatherCode || 0);
  const {time, dayDate, hour} = buildCurrentTime();

  const hourly = (Array.isArray(d.hourly) ? d.hourly : []).map(h => ({
    label: h.label || '--',
    icon:  h.icon  || '⛅',
    temp:  convertTemp(h.temp || 0, unit),
  }));

  return {
    time,
    dayDate,
    temp,
    unit,
    condition:   d.weatherLabel || info.label,
    weatherIcon: weatherEmoji(d.weatherCode || 0, hour >= 6 && hour < 20),
    hiLo:        `H: ${hi}°  L: ${lo}°`,
    hourly,
  };
}

const STALE_THRESHOLD_MS = 3 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Widget task handler — reads SharedPreferences, never makes network calls
// ---------------------------------------------------------------------------
export async function widgetTaskHandler(props) {
  const {widgetAction, renderWidget} = props;

  if (
    widgetAction !== 'WIDGET_ADDED'   &&
    widgetAction !== 'WIDGET_UPDATE'  &&
    widgetAction !== 'WIDGET_RESIZED'
  ) {
    return;
  }

  try {
    const snapshot = await readWeatherData();
    const hasData  = snapshot && snapshot.cityName && snapshot.cityName.length > 0;
    const isFresh  = hasData && (Date.now() - snapshot.lastUpdated) < STALE_THRESHOLD_MS;

    if (isFresh || hasData) {
      renderWidget(<WeatherWidgetView {...snapshotToViewProps(snapshot)} />);
      return;
    }

    const prefs = await loadPrefs();
    const {time, dayDate} = buildCurrentTime();
    renderWidget(
      <WeatherWidgetView
        time={time}
        dayDate={dayDate}
        temp="--"
        unit={prefs.tempUnit}
        condition="Open app to load"
        weatherIcon="⛅"
        hiLo=""
        hourly={[]}
      />,
    );
  } catch {
    const {time, dayDate} = buildCurrentTime();
    renderWidget(
      <WeatherWidgetView
        time={time}
        dayDate={dayDate}
        temp="--"
        unit="C"
        condition="Weather"
        weatherIcon="⛅"
        hiLo=""
        hourly={[]}
      />,
    );
  }
}
