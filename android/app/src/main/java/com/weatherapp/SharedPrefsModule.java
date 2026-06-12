package com.weatherapp;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.module.annotations.ReactModule;
import com.weatherapp.widget.WeatherWidgetProvider;

@ReactModule(name = SharedPrefsModule.NAME)
public class SharedPrefsModule extends ReactContextBaseJavaModule {

    public static final String NAME = "WeatherSharedPrefs";
    public static final String PREFS_NAME = "WeatherWidgetPrefs";

    public SharedPrefsModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @NonNull
    @Override
    public String getName() {
        return NAME;
    }

    /**
     * Write all weather + AQI + pollen + hourly + settings fields to SharedPreferences.
     * Automatically triggers a widget update broadcast so the home screen widget
     * reflects the new data without any additional JS calls.
     */
    @ReactMethod
    public void writeWeatherData(ReadableMap data, Promise promise) {
        try {
            SharedPreferences prefs = getReactApplicationContext()
                    .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor ed = prefs.edit();

            // Location / city
            if (data.hasKey("cityName"))      ed.putString("city_name",      data.getString("cityName"));
            if (data.hasKey("latitude"))      ed.putFloat("latitude",        (float) data.getDouble("latitude"));
            if (data.hasKey("longitude"))     ed.putFloat("longitude",       (float) data.getDouble("longitude"));

            // Current weather
            if (data.hasKey("temperature"))   ed.putFloat("temperature",     (float) data.getDouble("temperature"));
            if (data.hasKey("feelsLike"))     ed.putFloat("feels_like",      (float) data.getDouble("feelsLike"));
            if (data.hasKey("humidity"))      ed.putFloat("humidity",        (float) data.getDouble("humidity"));
            if (data.hasKey("windSpeed"))     ed.putFloat("wind_speed",      (float) data.getDouble("windSpeed"));
            if (data.hasKey("uvIndex"))       ed.putFloat("uv_index",        (float) data.getDouble("uvIndex"));
            if (data.hasKey("visibility"))    ed.putFloat("visibility",      (float) data.getDouble("visibility"));
            if (data.hasKey("weatherCode"))   ed.putInt("weather_code",      data.getInt("weatherCode"));
            if (data.hasKey("weatherLabel"))  ed.putString("weather_label",  data.getString("weatherLabel"));

            // Daily high/low for H: / L: display
            if (data.hasKey("dailyHigh"))     ed.putFloat("daily_high",      (float) data.getDouble("dailyHigh"));
            if (data.hasKey("dailyLow"))      ed.putFloat("daily_low",       (float) data.getDouble("dailyLow"));

            // Air quality
            if (data.hasKey("aqi"))           ed.putFloat("aqi",             (float) data.getDouble("aqi"));
            if (data.hasKey("pm25"))          ed.putFloat("pm25",            (float) data.getDouble("pm25"));
            if (data.hasKey("pm10"))          ed.putFloat("pm10",            (float) data.getDouble("pm10"));

            // Pollen
            if (data.hasKey("grassPollen"))   ed.putFloat("grass_pollen",    (float) data.getDouble("grassPollen"));
            if (data.hasKey("treePollen"))    ed.putFloat("tree_pollen",     (float) data.getDouble("treePollen"));
            if (data.hasKey("weedPollen"))    ed.putFloat("weed_pollen",     (float) data.getDouble("weedPollen"));

            // Hourly forecast — 6 slots, each with label, pre-computed emoji icon, temp
            for (int i = 0; i < 6; i++) {
                String lk = "hour" + i + "Label";
                String ik = "hour" + i + "Icon";
                String tk = "hour" + i + "Temp";
                if (data.hasKey(lk)) ed.putString("hour" + i + "_label", data.getString(lk));
                if (data.hasKey(ik)) ed.putString("hour" + i + "_icon",  data.getString(ik));
                if (data.hasKey(tk)) ed.putFloat("hour"  + i + "_temp",  (float) data.getDouble(tk));
            }

            // Widget display preferences
            if (data.hasKey("tempUnit"))      ed.putString("temp_unit",      data.getString("tempUnit"));
            if (data.hasKey("widgetDisplay")) ed.putString("widget_display", data.getString("widgetDisplay"));
            if (data.hasKey("widgetTheme"))   ed.putString("widget_theme",   data.getString("widgetTheme"));

            ed.putLong("last_updated", System.currentTimeMillis());
            ed.apply();

            triggerWidgetUpdate();
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("WRITE_ERROR", e.getMessage(), e);
        }
    }

    /**
     * Read the full weather snapshot stored by the app.
     * Called by the JS widget task handler so it never needs to hit the network.
     */
    @ReactMethod
    public void readWeatherData(Promise promise) {
        try {
            SharedPreferences prefs = getReactApplicationContext()
                    .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

            WritableMap out = Arguments.createMap();
            out.putString("cityName",      prefs.getString("city_name",      ""));
            out.putDouble("latitude",      prefs.getFloat("latitude",        0f));
            out.putDouble("longitude",     prefs.getFloat("longitude",       0f));
            out.putDouble("temperature",   prefs.getFloat("temperature",     0f));
            out.putDouble("feelsLike",     prefs.getFloat("feels_like",      0f));
            out.putDouble("humidity",      prefs.getFloat("humidity",        0f));
            out.putDouble("windSpeed",     prefs.getFloat("wind_speed",      0f));
            out.putDouble("uvIndex",       prefs.getFloat("uv_index",        0f));
            out.putDouble("visibility",    prefs.getFloat("visibility",      0f));
            out.putInt("weatherCode",      prefs.getInt("weather_code",      0));
            out.putString("weatherLabel",  prefs.getString("weather_label",  ""));
            out.putDouble("dailyHigh",     prefs.getFloat("daily_high",      0f));
            out.putDouble("dailyLow",      prefs.getFloat("daily_low",       0f));
            out.putDouble("aqi",           prefs.getFloat("aqi",             0f));
            out.putDouble("pm25",          prefs.getFloat("pm25",            0f));
            out.putDouble("pm10",          prefs.getFloat("pm10",            0f));
            out.putDouble("grassPollen",   prefs.getFloat("grass_pollen",    0f));
            out.putDouble("treePollen",    prefs.getFloat("tree_pollen",     0f));
            out.putDouble("weedPollen",    prefs.getFloat("weed_pollen",     0f));
            out.putString("tempUnit",      prefs.getString("temp_unit",      "C"));
            out.putString("widgetDisplay", prefs.getString("widget_display", "temp_condition_aqi"));
            out.putString("widgetTheme",   prefs.getString("widget_theme",   "dark"));
            out.putDouble("lastUpdated",   (double) prefs.getLong("last_updated", 0L));

            // Hourly array
            WritableArray hourlyArr = Arguments.createArray();
            for (int i = 0; i < 6; i++) {
                WritableMap h = Arguments.createMap();
                h.putString("label", prefs.getString("hour" + i + "_label", "--"));
                h.putString("icon",  prefs.getString("hour" + i + "_icon",  "⛅"));
                h.putDouble("temp",  prefs.getFloat("hour"  + i + "_temp",  0f));
                hourlyArr.pushMap(h);
            }
            out.putArray("hourly", hourlyArr);

            promise.resolve(out);
        } catch (Exception e) {
            promise.reject("READ_ERROR", e.getMessage(), e);
        }
    }

    /**
     * Write only widget display settings (tempUnit, widgetDisplay, widgetTheme).
     * Called from SettingsScreen when the user changes a widget preference so
     * the widget updates its look without waiting for the next weather fetch.
     */
    @ReactMethod
    public void writeSettings(ReadableMap settings, Promise promise) {
        try {
            SharedPreferences prefs = getReactApplicationContext()
                    .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor ed = prefs.edit();

            if (settings.hasKey("tempUnit"))      ed.putString("temp_unit",      settings.getString("tempUnit"));
            if (settings.hasKey("widgetDisplay")) ed.putString("widget_display", settings.getString("widgetDisplay"));
            if (settings.hasKey("widgetTheme"))   ed.putString("widget_theme",   settings.getString("widgetTheme"));

            ed.apply();
            triggerWidgetUpdate();
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("WRITE_SETTINGS_ERROR", e.getMessage(), e);
        }
    }

    /**
     * Broadcast ACTION_APPWIDGET_UPDATE to all WeatherWidget instances.
     * WeatherWidgetProvider.onUpdate() will (1) immediately paint native RemoteViews
     * from SharedPreferences, then (2) launch the JS HeadlessTask for the full render.
     */
    private void triggerWidgetUpdate() {
        Context ctx = getReactApplicationContext();
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        ComponentName provider = new ComponentName(ctx, WeatherWidgetProvider.class);
        int[] ids = mgr.getAppWidgetIds(provider);
        if (ids.length == 0) {
            return;
        }
        Intent intent = new Intent(ctx, WeatherWidgetProvider.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        ctx.sendBroadcast(intent);
    }
}
