package com.fitrack.app

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import android.os.SystemClock
import androidx.core.app.NotificationCompat
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class StepCounterForegroundService : Service(), SensorEventListener {

    private lateinit var sensorManager: SensorManager
    private var stepDetectorSensor: Sensor? = null
    private var stepCounterSensor: Sensor? = null
    private var initialStepCount = -1f
    private var isListening = false
    private var isExplicitStop = false
    private var isAppForeground = false

    private lateinit var prefs: SharedPreferences

    companion object {
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "step_counter_channel"
        
        fun getTodayDateString(): String {
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            return sdf.format(Date())
        }

        fun checkAndResetDate(prefs: SharedPreferences, context: Context? = null): Boolean {
            val today = getTodayDateString()
            val storedDate = prefs.getString("date", "") ?: ""
            if (storedDate.isNotEmpty() && storedDate != today) {
                val previousSteps = prefs.getInt("steps", 0)
                val editor = prefs.edit()
                if (previousSteps > 0) {
                    editor.putInt("archived_steps_$storedDate", previousSteps)
                    val pending = prefs.getString("pending_dates", "") ?: ""
                    val pendingList = if (pending.isEmpty()) mutableListOf<String>() else pending.split(",").filter { it.isNotEmpty() }.toMutableList()
                    if (!pendingList.contains(storedDate)) {
                        pendingList.add(storedDate)
                        editor.putString("pending_dates", pendingList.joinToString(","))
                    }
                }
                editor.putString("date", today)
                editor.putInt("steps", 0)
                editor.apply()

                if (context != null) {
                    updateWidget(context)
                }
                return true
            } else if (storedDate.isEmpty()) {
                prefs.edit().putString("date", today).putInt("steps", 0).apply()
                return true
            }
            return false
        }

        fun updateWidget(context: Context) {
            val intent = Intent(context, FitrackStepsWidget::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            }
            val ids = AppWidgetManager.getInstance(context).getAppWidgetIds(ComponentName(context, FitrackStepsWidget::class.java))
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            context.sendBroadcast(intent)
        }
    }

    override fun onCreate() {
        super.onCreate()
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        stepDetectorSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR)
        stepCounterSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        prefs = getSharedPreferences("StepCounterPrefs", Context.MODE_PRIVATE)

        // Check if date has changed on start
        checkAndResetDate()
    }

    private fun checkAndResetDate() {
        val reset = Companion.checkAndResetDate(prefs, this)
        if (reset) {
            initialStepCount = -1f
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        checkAndResetDate()
        
        val action = intent?.action
        if (action == "ACTION_STOP_SERVICE") {
            isExplicitStop = true
            prefs.edit().putBoolean("tracking_active", false).apply()
            unregisterSensors()
            hideForegroundNotification()
            stopSelf()
            return START_NOT_STICKY
        }

        if (action == "ACTION_APP_FOREGROUNDED") {
            isAppForeground = true
            hideForegroundNotification()
            return START_STICKY
        }

        if (action == "ACTION_APP_BACKGROUNDED") {
            isAppForeground = false
            val trackingActive = prefs.getBoolean("tracking_active", false)
            if (trackingActive) {
                startForegroundServiceNotification()
                registerSensors()
            }
            return START_STICKY
        }

        if (action == "ACTION_UPDATE_NOTIFICATION") {
            if (!isAppForeground) {
                updateNotification()
            }
            return START_STICKY
        }

        isExplicitStop = false

        // Determine if app is currently in foreground
        isAppForeground = MainApplication.isAppInForeground

        // Must start foreground service notification on initial start to satisfy Android O+ startForegroundService contract
        startForegroundServiceNotification()
        registerSensors()
        
        // Save status that service is active
        prefs.edit().putBoolean("tracking_active", true).apply()

        // If app is already open in foreground, immediately hide notification
        if (isAppForeground) {
            hideForegroundNotification()
        }

        return START_STICKY
    }

    private fun buildNotification(): Notification {
        val notificationIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val currentSteps = prefs.getInt("steps", 0)
        val goal = prefs.getInt("goal", 10000)
        val stepText = String.format(Locale.getDefault(), "%,d / %,d steps", currentSteps, goal)

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Step Tracker")
            .setContentText(stepText)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    private fun updateNotification() {
        if (isAppForeground) return
        try {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.notify(NOTIFICATION_ID, buildNotification())
        } catch (_: Exception) {}
    }

    private fun hideForegroundNotification() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE)
            } else {
                @Suppress("DEPRECATION")
                stopForeground(true)
            }
        } catch (_: Exception) {}
    }

    private fun startForegroundServiceNotification() {
        try {
            createNotificationChannel()
            val notification = buildNotification()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                // Android 14+ (API 34+) requires explicit FOREGROUND_SERVICE_TYPE_HEALTH
                startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (_: Exception) {
            try {
                if (!isAppForeground) {
                    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                    manager.notify(NOTIFICATION_ID, buildNotification())
                }
            } catch (_: Exception) {}
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Step Counter Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps step counting active in the background"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun registerSensors() {
        if (isListening) return

        var registered = false
        // Prioritize TYPE_STEP_COUNTER because it is hardware-accumulated and battery efficient.
        // Only fall back to TYPE_STEP_DETECTOR if TYPE_STEP_COUNTER is not supported on this device.
        // Registering both causes duplicate counting (2x steps) on devices that have both sensors.
        if (stepCounterSensor != null) {
            registered = sensorManager.registerListener(
                this,
                stepCounterSensor,
                SensorManager.SENSOR_DELAY_NORMAL
            )
        } else if (stepDetectorSensor != null) {
            registered = sensorManager.registerListener(
                this,
                stepDetectorSensor,
                SensorManager.SENSOR_DELAY_NORMAL
            )
        }

        isListening = registered
    }

    private fun unregisterSensors() {
        if (isListening) {
            sensorManager.unregisterListener(this)
            isListening = false
            initialStepCount = -1f
        }
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event == null) return
        checkAndResetDate()

        var stepDelta = 0
        if (event.sensor.type == Sensor.TYPE_STEP_DETECTOR) {
            val stepsVal = event.values[0].toInt()
            stepDelta = if (stepsVal > 0) stepsVal else 1
        } else if (event.sensor.type == Sensor.TYPE_STEP_COUNTER) {
            val totalSensorSteps = event.values[0]
            if (initialStepCount < 0) {
                initialStepCount = totalSensorSteps
            }
            val stepsSinceStart = (totalSensorSteps - initialStepCount).toInt()
            if (stepsSinceStart > 0) {
                stepDelta = stepsSinceStart
                initialStepCount = totalSensorSteps
            }
        }

        if (stepDelta > 0) {
            val currentSteps = prefs.getInt("steps", 0)
            prefs.edit().putInt("steps", currentSteps + stepDelta).apply()
            Companion.updateWidget(this)
            if (!isAppForeground) {
                updateNotification()
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    private fun updateWidget() {
        Companion.updateWidget(this)
    }

    private fun scheduleRestartWatchdog() {
        try {
            val trackingActive = prefs.getBoolean("tracking_active", false)
            if (!trackingActive) return

            val restartIntent = Intent(applicationContext, StepCounterRestartReceiver::class.java).apply {
                action = "com.fitrack.app.RESTART_STEP_COUNTER"
            }
            val pendingIntent = PendingIntent.getBroadcast(
                applicationContext,
                NOTIFICATION_ID,
                restartIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val alarmManager = getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager?.setExactAndAllowWhileIdle(
                    AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    SystemClock.elapsedRealtime() + 500,
                    pendingIntent
                )
            } else {
                alarmManager?.set(
                    AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    SystemClock.elapsedRealtime() + 500,
                    pendingIntent
                )
            }
        } catch (_: Exception) {}
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        isAppForeground = false
        val trackingActive = prefs.getBoolean("tracking_active", false)
        if (trackingActive) {
            // Keep foreground notification and sensors active
            startForegroundServiceNotification()
            registerSensors()

            // Schedule a restart via broadcast receiver watchdog in case the OS terminates the application process
            scheduleRestartWatchdog()
        }
    }

    override fun onDestroy() {
        unregisterSensors()
        if (isExplicitStop) {
            prefs.edit().putBoolean("tracking_active", false).apply()
        } else {
            // Service killed by system/recents swipe, not by user request
            scheduleRestartWatchdog()
        }
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
