package com.weatherapp;

import android.app.Application;
import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactNativeHost;
import com.facebook.soloader.SoLoader;
import com.reactnativeandroidwidget.RNAndroidWidgetPackage;
import java.util.List;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost =
      new DefaultReactNativeHost(this) {
        @Override
        public boolean getUseDeveloperSupport() {
          return BuildConfig.DEBUG;
        }

        @Override
        protected List<ReactPackage> getPackages() {
          List<ReactPackage> packages = new PackageList(this).getPackages();
          // react-native-android-widget requires manual registration with click action
          packages.add(new RNAndroidWidgetPackage(BuildConfig.APPLICATION_ID + ".action.WIDGET_CLICK"));
          return packages;
        }

        @Override
        protected String getJSMainModuleName() {
          return "index";
        }

        @Override
        protected boolean isNewArchEnabled() {
          return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
        }

        @Override
        protected Boolean isHermesEnabled() {
          return BuildConfig.IS_HERMES_ENABLED;
        }
      };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, false);
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      DefaultNewArchitectureEntryPoint.load();
    }
    createNotificationChannels();
  }

  private void createNotificationChannels() {
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
      android.app.NotificationChannel pollenChannel = new android.app.NotificationChannel(
          "pollen_alerts",
          "Pollen Alerts",
          android.app.NotificationManager.IMPORTANCE_DEFAULT
      );
      pollenChannel.setDescription("Alerts when pollen levels are High or Very High");

      android.app.NotificationManager manager = getSystemService(android.app.NotificationManager.class);
      if (manager != null) {
        manager.createNotificationChannel(pollenChannel);
      }
    }
  }
}
