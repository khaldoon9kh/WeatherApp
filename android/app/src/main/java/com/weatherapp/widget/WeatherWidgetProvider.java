package com.weatherapp.widget;

import com.reactnativeandroidwidget.RNAndroidWidgetProvider;

public class WeatherWidgetProvider extends RNAndroidWidgetProvider {

  public static final String WIDGET_NAME = "WeatherWidget";

  @Override
  public String getWidgetName() {
    return WIDGET_NAME;
  }
}
