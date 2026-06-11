package com.weatherapp.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.view.View;
import android.widget.RemoteViews;

import com.reactnativeandroidwidget.RNAndroidWidgetProvider;
import com.weatherapp.MainActivity;
import com.weatherapp.R;
import com.weatherapp.SharedPrefsModule;

/**
 * Android AppWidgetProvider for the home screen weather widget.
 *
 * onUpdate() strategy:
 *   1. If SharedPreferences already contain a weather snapshot written by the app,
 *      immediately paint a native RemoteViews so the widget is never blank while
 *      the JS HeadlessTask is booting (fast path, synchronous, ~0 ms).
 *   2. Call super.onUpdate() so react-native-android-widget starts its HeadlessTask,
 *      which calls widgetTaskHandler() in WeatherWidget.js.  That handler reads the
 *      same SharedPreferences — it NEVER makes network calls independently.
 *   3. The JS-rendered widget then replaces the native one with the full-fidelity
 *      glassmorphism layout once the RN engine is ready.
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

        // Only paint natively if the app has written at least one snapshot
        if (prefs.contains("city_name")) {
            RemoteViews views = buildNativeRemoteViews(context, prefs);
            for (int id : appWidgetIds) {
                appWidgetManager.updateAppWidget(id, views);
            }
        }

        // Start the JS HeadlessTask for the full RN render (reads same SharedPrefs)
        super.onUpdate(context, appWidgetManager, appWidgetIds);
    }

    // -------------------------------------------------------------------------
    // Native RemoteViews builder — reads SharedPreferences, never the network
    // -------------------------------------------------------------------------

    public static RemoteViews buildNativeRemoteViews(Context context, SharedPreferences prefs) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.weather_widget_layout);

        // --- Read all fields from SharedPreferences ---
        String city        = prefs.getString("city_name",      "Weather");
        float  tempC       = prefs.getFloat("temperature",     0f);
        String label       = prefs.getString("weather_label",  "");
        float  aqi         = prefs.getFloat("aqi",             0f);
        float  grass       = prefs.getFloat("grass_pollen",    0f);
        float  tree        = prefs.getFloat("tree_pollen",     0f);
        float  weed        = prefs.getFloat("weed_pollen",     0f);
        String unit        = prefs.getString("temp_unit",      "C");
        String display     = prefs.getString("widget_display", "temp_condition_aqi");
        String theme       = prefs.getString("widget_theme",   "dark");

        // --- Temperature conversion ---
        int temp = "F".equals(unit)
                ? Math.round(tempC * 9f / 5f + 32)
                : Math.round(tempC);

        // --- Theme-dependent styling ---
        int bgRes;
        int textColor;
        int subColor;
        switch (theme) {
            case "light":
                bgRes     = R.drawable.widget_bg_light;
                textColor = Color.parseColor("#0F172A");
                subColor  = Color.parseColor("#64748B");
                break;
            case "transparent":
                bgRes     = R.drawable.widget_bg_transparent;
                textColor = Color.WHITE;
                subColor  = Color.parseColor("#CBD5E1");
                break;
            default: // dark
                bgRes     = R.drawable.widget_bg_dark;
                textColor = Color.WHITE;
                subColor  = Color.parseColor("#94A3B8");
                break;
        }
        views.setInt(R.id.widget_root, "setBackgroundResource", bgRes);

        // --- City ---
        views.setTextViewText(R.id.tv_city, city);
        views.setTextColor(R.id.tv_city, subColor);

        // --- Temperature ---
        views.setTextViewText(R.id.tv_temperature, temp + "°" + unit);
        views.setTextColor(R.id.tv_temperature, textColor);

        // --- Condition ---
        boolean showCondition = "temp_condition".equals(display) || "temp_condition_aqi".equals(display);
        views.setTextViewText(R.id.tv_condition, showCondition ? label : "");
        views.setTextColor(R.id.tv_condition, subColor);

        // --- AQI pill ---
        boolean showAqi = "temp_condition_aqi".equals(display) && aqi > 0;
        if (showAqi) {
            int aqiColor = aqiColor((int) aqi);
            String aqiText = "AQI " + Math.round(aqi) + "  " + aqiLabel((int) aqi);
            views.setViewVisibility(R.id.ll_aqi, View.VISIBLE);
            views.setTextViewText(R.id.tv_aqi, aqiText);
            views.setTextColor(R.id.tv_aqi, aqiColor);
        } else {
            views.setViewVisibility(R.id.ll_aqi, View.GONE);
        }

        // --- Pollen summary ---
        if ("temp_condition_aqi".equals(display)) {
            String pollenText = topPollenSummary(grass, tree, weed);
            views.setTextViewText(R.id.tv_pollen, pollenText);
            views.setTextColor(R.id.tv_pollen, subColor);
        } else {
            views.setTextViewText(R.id.tv_pollen, "");
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
    // Pure-Java helpers (mirror the JS airQualityService logic)
    // -------------------------------------------------------------------------

    private static String aqiLabel(int aqi) {
        if (aqi <= 20)  return "Good";
        if (aqi <= 40)  return "Fair";
        if (aqi <= 60)  return "Moderate";
        if (aqi <= 80)  return "Poor";
        if (aqi <= 100) return "Very Poor";
        return "Hazardous";
    }

    private static int aqiColor(int aqi) {
        if (aqi <= 20)  return Color.parseColor("#22C55E");
        if (aqi <= 40)  return Color.parseColor("#84CC16");
        if (aqi <= 60)  return Color.parseColor("#EAB308");
        if (aqi <= 80)  return Color.parseColor("#F97316");
        if (aqi <= 100) return Color.parseColor("#EF4444");
        return Color.parseColor("#A855F7");
    }

    private static String topPollenSummary(float grass, float tree, float weed) {
        float max = Math.max(grass, Math.max(tree, weed));
        if (max < 10) return "";
        String type = (max == grass) ? "Grass" : (max == tree ? "Tree" : "Weed");
        String level;
        if      (max > 200) level = "Very High";
        else if (max > 50)  level = "High";
        else                level = "Medium";
        return type + " pollen: " + level;
    }
}
