package com.fitrack.app

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import android.hardware.Sensor
import android.hardware.SensorManager
import android.appwidget.AppWidgetManager
import android.content.ComponentName

class StepCounterModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val prefs: SharedPreferences =
        reactContext.getSharedPreferences("StepCounterPrefs", Context.MODE_PRIVATE)

    private val sensorManager: SensorManager =
        reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private var stepDetectorSensor: Sensor? =
        sensorManager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR)
    private var stepCounterSensor: Sensor? =
        sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)

    override fun getName(): String = "StepCounterModule"

    @ReactMethod
    fun isSensorAvailable(promise: Promise) {
        val available = (stepDetectorSensor != null || stepCounterSensor != null)
        promise.resolve(available)
    }

    @ReactMethod
    fun startStepCounter(promise: Promise) {
        try {
            val context = reactApplicationContext
            val intent = Intent(context, StepCounterForegroundService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_SERVICE_FAILED", e.message)
        }
    }

    @ReactMethod
    fun stopStepCounter(promise: Promise) {
        try {
            val context = reactApplicationContext
            val intent = Intent(context, StepCounterForegroundService::class.java)
            context.stopService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_SERVICE_FAILED", e.message)
        }
    }

    @ReactMethod
    fun updateAppVisibility(isForeground: Boolean, promise: Promise) {
        try {
            val context = reactApplicationContext
            val intent = Intent(context, StepCounterForegroundService::class.java).apply {
                action = if (isForeground) "ACTION_APP_FOREGROUNDED" else "ACTION_APP_BACKGROUNDED"
            }
            if (isForeground) {
                context.startService(intent)
            } else {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("UPDATE_VISIBILITY_FAILED", e.message)
        }
    }

    @ReactMethod
    fun getTodaySteps(promise: Promise) {
        val today = StepCounterForegroundService.getTodayDateString()
        val storedDate = prefs.getString("date", "")
        val steps = if (storedDate == today) prefs.getInt("steps", 0) else 0
        promise.resolve(steps)
    }

    @ReactMethod
    fun getTodayDate(promise: Promise) {
        val today = StepCounterForegroundService.getTodayDateString()
        val storedDate = prefs.getString("date", today)
        promise.resolve(storedDate)
    }

    @ReactMethod
    fun setInitialSteps(steps: Int, promise: Promise) {
        val today = StepCounterForegroundService.getTodayDateString()
        prefs.edit().apply {
            putInt("steps", steps)
            putString("date", today)
            apply()
        }
        updateWidget()
        promise.resolve(true)
    }

    @ReactMethod
    fun setGoal(goal: Int, promise: Promise) {
        prefs.edit().putInt("goal", goal).apply()
        updateWidget()
        promise.resolve(true)
    }

    private fun updateWidget() {
        val context = reactApplicationContext
        val intent = Intent(context, FitrackStepsWidget::class.java).apply {
            action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
        }
        val ids = AppWidgetManager.getInstance(context).getAppWidgetIds(ComponentName(context, FitrackStepsWidget::class.java))
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        context.sendBroadcast(intent)
    }
}
