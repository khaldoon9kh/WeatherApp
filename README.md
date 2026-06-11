# WeatherApp — React Native Android (Bare Workflow)

A full-featured Android weather app with AQI, pollen tracking, multi-city support, a home screen widget, and background updates.

## Tech Stack

| Package | Purpose |
|---|---|
| `react-native` 0.73 | Core framework (bare workflow) |
| `@react-navigation/native` + `bottom-tabs` | Tab navigation |
| `react-native-android-widget` | Home screen widget |
| `@react-native-community/geolocation` | GPS location |
| `@react-native-async-storage/async-storage` | Local persistence |
| `react-native-background-fetch` | Periodic weather refresh |
| `react-native-vector-icons` (MaterialCommunityIcons) | Weather & UI icons |
| **Open-Meteo** | Free weather + air quality API (no key needed) |

---

## Prerequisites

- **Node.js** ≥ 18
- **JDK 17** (`brew install openjdk@17` on Mac)
- **Android SDK** with API 34 (install via Android Studio SDK Manager)
- **Android Studio** with an AVD or a physical device with USB debugging enabled
- **React Native CLI** (`npm install -g react-native`)

Set your `ANDROID_HOME` environment variable:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk          # macOS
export ANDROID_HOME=$HOME/Android/Sdk                  # Linux
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
```

---

## Installation

```bash
# 1. Install JS dependencies
cd WeatherApp
npm install

# 2. Generate a debug keystore (if not present)
cd android/app
keytool -genkey -v -keystore debug.keystore \
  -storepass android -alias androiddebugkey -keypass android \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Android Debug,O=Android,C=US"
cd ../..

# 3. Auto-link native dependencies
npx react-native link

# 4. (Vector icons) Confirm the fonts.gradle line is in android/app/build.gradle:
# apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"
```

---

## Build & Run

### Development (hot reload)

```bash
# Terminal 1 — Metro bundler
npx react-native start

# Terminal 2 — build and install on device/emulator
npx react-native run-android
```

### Release APK

```bash
cd android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

---

## Project Structure

```
WeatherApp/
├── index.js                        # App entry + widget task handler registration
├── src/
│   ├── App.js                      # Root component + background fetch init
│   ├── navigation/
│   │   └── AppNavigator.js         # Bottom tab navigator (Home | Cities | Settings)
│   ├── screens/
│   │   ├── HomeScreen.js           # Full weather dashboard with AQI & pollen
│   │   ├── CitiesScreen.js         # Swipeable multi-city view
│   │   └── SettingsScreen.js       # All user preferences
│   ├── components/
│   │   ├── ClockDisplay.js         # Live updating clock + date
│   │   ├── ForecastStrip.js        # Horizontal 5-day forecast row
│   │   ├── WeatherCard.js          # Single stat card (humidity, wind, etc.)
│   │   ├── AQIBadge.js             # Color-coded AQI badge
│   │   ├── PollenCard.js           # Grass / Tree / Weed pollen card
│   │   ├── CitySearchModal.js      # Geocoding search bottom sheet
│   │   └── CityWeatherPage.js      # Single city weather page (used in swipe view)
│   ├── services/
│   │   ├── weatherService.js       # Open-Meteo weather API
│   │   ├── airQualityService.js    # Open-Meteo air quality + pollen API
│   │   ├── geocodingService.js     # Open-Meteo geocoding (city search)
│   │   └── locationService.js      # GPS location + permission handling
│   ├── storage/
│   │   ├── prefsStorage.js         # AsyncStorage: settings persistence
│   │   └── citiesStorage.js        # AsyncStorage: saved cities CRUD
│   └── widget/
│       └── WeatherWidget.js        # Widget component + task handler
└── android/
    └── app/src/main/
        ├── AndroidManifest.xml     # Permissions + widget receiver declaration
        ├── java/com/weatherapp/
        │   ├── MainActivity.java
        │   ├── MainApplication.java
        │   └── widget/
        │       └── WeatherWidgetProvider.java
        └── res/
            └── xml/weather_widget_info.xml
```

---

## Features

### Home Screen
- **Split header**: live clock (updates every second) alongside current temperature
- **Weather stats**: feels like, humidity, wind speed, UV index, visibility
- **AQI badge**: color-coded (Good → Hazardous) using European AQI from Open-Meteo
- **Pollen cards**: Grass / Tree / Weed with Low → Very High color coding
- **Allergy summary**: plain-English recommendation based on pollen levels
- **5-day forecast**: scrollable strip with icons and high/low temps
- **Pull-to-refresh**: re-fetches all data

### Cities Screen
- Horizontally swipeable full-screen pages (like iOS Weather)
- First page is always GPS / current location
- Tap **+** → search modal (live results from Open-Meteo geocoding)
- Long-press any saved city to remove it
- Dot page indicators at the bottom

### Settings Screen
- Temperature unit: °C / °F
- Widget display: Temp only / Temp + Condition / Temp + AQI + Pollen
- Widget theme: Dark / Light / Transparent
- Location precision: Exact GPS / Privacy mode (±1 km)
- Update frequency: 30 min / 1 hr / 3 hrs
- Allergy alerts toggle (push notification on high pollen)

### Android Home Screen Widget
- Shows: city, temperature, condition, AQI badge, top pollen risk
- Layout adapts to Settings preferences
- Tap widget → opens the app
- Updated whenever background fetch runs

---

## API Reference (Open-Meteo — no key required)

| Endpoint | URL |
|---|---|
| Weather | `https://api.open-meteo.com/v1/forecast` |
| Air Quality | `https://air-quality-api.open-meteo.com/v1/air-quality` |
| Geocoding | `https://geocoding-api.open-meteo.com/v1/search` |

Fields fetched:
- **Weather current**: `temperature_2m`, `apparent_temperature`, `weathercode`, `windspeed_10m`, `relativehumidity_2m`, `visibility`, `uv_index`
- **Weather daily** (5 days): `temperature_2m_max`, `temperature_2m_min`, `weathercode`
- **Air quality**: `pm2_5`, `pm10`, `european_aqi`, `grass_pollen`, `tree_pollen`, `weed_pollen`

---

## AQI Color Scale (European AQI)

| Range | Label | Color |
|---|---|---|
| 0–20 | Good | 🟢 Green |
| 21–40 | Fair | 🟡 Yellow-green |
| 41–60 | Moderate | 🟡 Yellow |
| 61–80 | Poor | 🟠 Orange |
| 81–100 | Very Poor | 🔴 Red |
| 101+ | Hazardous | 🟣 Purple |

## Pollen Scale

| Range | Label | Color |
|---|---|---|
| 0–10 | Low | 🟢 Green |
| 11–50 | Medium | 🟡 Yellow |
| 51–200 | High | 🟠 Orange |
| 201+ | Very High | 🔴 Red |

---

## Android Permissions

| Permission | Reason |
|---|---|
| `ACCESS_FINE_LOCATION` | GPS weather for current location |
| `ACCESS_COARSE_LOCATION` | Fallback location |
| `INTERNET` | API calls |
| `FOREGROUND_SERVICE` | Background updates |
| `POST_NOTIFICATIONS` | Pollen alerts |
| `RECEIVE_BOOT_COMPLETED` | Re-schedule background fetch after reboot |

---

## Troubleshooting

**Metro bundler port conflict**
```bash
npx react-native start --port 8082
```

**Build fails — Gradle JVM**
```bash
# In android/gradle.properties add:
org.gradle.java.home=/Library/Java/JavaVirtualMachines/openjdk-17.jdk/Contents/Home
```

**Vector icons not showing**
Check `android/app/build.gradle` ends with:
```gradle
apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"
```
Then run a clean build:
```bash
cd android && ./gradlew clean && cd .. && npx react-native run-android
```

**Widget not appearing in picker**
- After first install, long-press home screen → Widgets → search "Weather"
- The widget refreshes when background fetch fires or you pull-to-refresh on the Home screen

**Location permission denied**
Go to Android Settings → Apps → WeatherApp → Permissions → Location → Allow
