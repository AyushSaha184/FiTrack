package com.fitrack.app

import android.app.Activity
import android.app.Application
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader

class MainApplication : Application(), ReactApplication {

  companion object {
    @Volatile
    var isAppInForeground: Boolean = false
      private set
  }

  private var startedActivities = 0

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              add(StepCounterPackage())
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, OpenSourceMergedSoMapping)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }

    registerActivityLifecycleCallbacks(object : ActivityLifecycleCallbacks {
      override fun onActivityStarted(activity: Activity) {
        startedActivities++
        if (startedActivities == 1) {
          isAppInForeground = true
          notifyServiceAppVisibility(true)
        }
      }

      override fun onActivityStopped(activity: Activity) {
        startedActivities--
        if (startedActivities <= 0) {
          startedActivities = 0
          isAppInForeground = false
          notifyServiceAppVisibility(false)
        }
      }

      override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
      override fun onActivityResumed(activity: Activity) {}
      override fun onActivityPaused(activity: Activity) {}
      override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
      override fun onActivityDestroyed(activity: Activity) {}
    })
  }

  private fun notifyServiceAppVisibility(isForeground: Boolean) {
    try {
      val prefs = getSharedPreferences("StepCounterPrefs", Context.MODE_PRIVATE)
      val trackingActive = prefs.getBoolean("tracking_active", false)
      if (!trackingActive) return

      val intent = Intent(this, StepCounterForegroundService::class.java).apply {
        action = if (isForeground) "ACTION_APP_FOREGROUNDED" else "ACTION_APP_BACKGROUNDED"
      }
      if (isForeground) {
        startService(intent)
      } else {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          startForegroundService(intent)
        } else {
          startService(intent)
        }
      }
    } catch (_: Exception) {}
  }
}
