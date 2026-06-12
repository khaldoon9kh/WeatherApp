package com.weatherapp.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.widget.RemoteViews;

import com.reactnativeandroidwidget.RNAndroidWidgetProvider;
import com.weatherapp.MainActivity;
import com.weatherapp.R;
import com.weatherapp.SharedPrefsModule;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;

/**
 * Premium 4×2 weather widget: gradient background, split clock/weather header,
 * glassmorphism hourly forecast strip. Native RemoteViews are painted synchronously
 * from SharedPreferences before the JS HeadlessTask finishes booting.
 */
public class WeatherWidgetProvider extends RNAndroidWidgetProvider {

    public static final String WIDGET_NAME = "WeatherWidget";

    @Override
    public String getWidgetName() {
        return WIDGET_NAME;
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        SharedPreferences prefs = context.getSharedPreferences(
                SharedPrefsModule.PREFS_NAME, Context.MODE_PRIVATE);

        if (prefs.contains("city_name")) {
            RemoteViews views = buildNativeRemoteViews(context, prefs);
            for (int id : appWidgetIds) {
                appWidgetManager.updateAppWidget(id, views);
            }
        }

        super.onUpdate(context, appWidgetManager, appWidgetIds);
    }

    // -------------------------------------------------------------------------
    // Native RemoteViews builder
    // -------------------------------------------------------------------------

    public static RemoteViews buildNativeRemoteViews(Context context, SharedPreferences prefs) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.weather_widget_layout);

        // --- System clock ---
        Calendar cal = Calendar.getInstance();
        int sysHour = cal.get(Calendar.HOUR_OF_DAY);
        int sysMin  = cal.get(Calendar.MINUTE);
        String timeStr  = String.format(Locale.US, "%02d:%02d", sysHour, sysMin);
        String dayDate  = new SimpleDateFormat("EEEE, MMMM d", Locale.getDefault()).format(cal.getTime());

        // --- SharedPreferences ---
        float  tempC     = prefs.getFloat("temperature",  0f);
        String label     = prefs.getString("weather_label", "");
        int    code      = prefs.getInt("weather_code",   0);
        float  dailyHi   = prefs.getFloat("daily_high",   0f);
        float  dailyLo   = prefs.getFloat("daily_low",    0f);
        String unit      = prefs.getString("temp_unit",   "C");

        // --- Temp conversion ---
        int temp = toUnit(tempC, unit);
        int hi   = toUnit(dailyHi, unit);
        int lo   = toUnit(dailyLo, unit);

        // --- Background: always the sunset gradient ---
        views.setInt(R.id.widget_root, "setBackgroundResource", R.drawable.widget_bg_gradient);

        // --- Top left: time + day/date ---
        views.setTextViewText(R.id.tv_time,     timeStr);
        views.setTextViewText(R.id.tv_day_date, dayDate);

        // --- Top right: icon + temp + condition + H/L ---
        views.setTextViewText(R.id.tv_weather_icon, weatherEmoji(code, isDaytime(sysHour)));
        views.setTextViewText(R.id.tv_temperature,  temp + "°" + unit);
        views.setTextViewText(R.id.tv_condition,    label);
        views.setTextViewText(R.id.tv_hi_lo,        "H: " + hi + "°  L: " + lo + "°");

        // --- Hourly strip ---
        int[] labelIds = {
            R.id.tv_hour0_label, R.id.tv_hour1_label, R.id.tv_hour2_label,
            R.id.tv_hour3_label, R.id.tv_hour4_label, R.id.tv_hour5_label,
        };
        int[] iconIds = {
            R.id.tv_hour0_icon, R.id.tv_hour1_icon, R.id.tv_hour2_icon,
            R.id.tv_hour3_icon, R.id.tv_hour4_icon, R.id.tv_hour5_icon,
        };
        int[] tempIds = {
            R.id.tv_hour0_temp, R.id.tv_hour1_temp, R.id.tv_hour2_temp,
            R.id.tv_hour3_temp, R.id.tv_hour4_temp, R.id.tv_hour5_temp,
        };

        for (int i = 0; i < 6; i++) {
            String hLabel = prefs.getString("hour" + i + "_label", "--");
            String hIcon  = prefs.getString("hour" + i + "_icon",  "⛅");
            float  hTempC = prefs.getFloat("hour"  + i + "_temp",  0f);
            int    hTemp  = toUnit(hTempC, unit);

            views.setTextViewText(labelIds[i], hLabel);
            views.setTextViewText(iconIds[i],  hIcon);
            views.setTextViewText(tempIds[i],  hTemp + "°");
        }

        // --- Tap → open app ---
        Intent launch = new Intent(context, MainActivity.class);
        launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(
                context, 0, launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, pi);

        return views;
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private static int toUnit(float celsius, String unit) {
        return "F".equals(unit)
                ? Math.round(celsius * 9f / 5f + 32)
                : Math.round(celsius);
    }

    private static boolean isDaytime(int hour) {
        return hour >= 6 && hour < 20;
    }

    /** Returns a weather emoji for the given WMO code. isDaytime switches sun ↔ moon. */
    private static String weatherEmoji(int code, boolean isDaytime) {
        if (code == 0 || code == 1)              return isDaytime ? "☀️" : "🌙";
        if (code == 2)                           return isDaytime ? "⛅" : "☁️";
        if (code == 3)                           return "☁️";
        if (code == 45 || code == 48)            return "🌫️";
        if (code >= 51 && code <= 55)            return "🌦️";
        if (code >= 61 && code <= 65)            return "🌧️";
        if (code >= 71 && code <= 77)            return "❄️";
        if (code >= 80 && code <= 82)            return "🌩️";
        if (code >= 85 && code <= 86)            return "🌨️";
        if (code >= 95)                          return "⛈️";
        return isDaytime ? "⛅" : "🌙";
    }
}
