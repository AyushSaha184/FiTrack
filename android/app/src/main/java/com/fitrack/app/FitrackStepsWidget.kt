package com.fitrack.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.os.Build
import android.os.Bundle
import android.os.SystemClock
import android.util.SizeF
import android.widget.RemoteViews

class FitrackStepsWidget : AppWidgetProvider() {

    companion object {
        const val ACTION_REFRESH_AND_OPEN = "com.fitrack.app.REFRESH_AND_OPEN"
        const val ACTION_REFRESH_WIDGET = "com.fitrack.app.REFRESH_WIDGET"
        private const val WIDGET_ALARM_INTERVAL_MS = 15 * 60 * 1000L // 15 minutes

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
            options: Bundle? = null
        ) {
            val prefs = context.getSharedPreferences("StepCounterPrefs", Context.MODE_PRIVATE)
            StepCounterForegroundService.checkAndResetDate(prefs, context)
            val today = StepCounterForegroundService.getTodayDateString()
            val storedDate = prefs.getString("date", "")
            val steps = if (storedDate == today) prefs.getInt("steps", 0) else 0
            val goal = prefs.getInt("goal", 10000)
            val weightKg = prefs.getFloat("user_weight_kg", 70f)
            val caloriesBurned = Math.round((steps * 0.04f * weightKg) / 60f)

            val ringBitmap = drawProgressRing(steps, goal)

            // Setup click PendingIntent for top-right Refresh button (refreshes widget only)
            val refreshIntent = Intent(context, FitrackStepsWidget::class.java).apply {
                action = ACTION_REFRESH_WIDGET
            }
            val refreshPendingIntent = PendingIntent.getBroadcast(
                context,
                1,
                refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Setup click PendingIntent for opening app
            val clickIntent = Intent(context, FitrackStepsWidget::class.java).apply {
                action = ACTION_REFRESH_AND_OPEN
            }
            val clickPendingIntent = PendingIntent.getBroadcast(
                context,
                0,
                clickIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            fun bindViews(layoutResId: Int): RemoteViews {
                return RemoteViews(context.packageName, layoutResId).apply {
                    setTextViewText(R.id.widget_step_count, steps.toString())
                    setTextViewText(R.id.widget_calories_count, caloriesBurned.toString())
                    setImageViewBitmap(R.id.widget_progress_ring, ringBitmap)
                    setOnClickPendingIntent(R.id.widget_refresh_button, refreshPendingIntent)
                    setOnClickPendingIntent(R.id.widget_steps_root, clickPendingIntent)
                }
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                // Android 12+ responsive layout map (smooth realtime scaling on modern Android & HyperOS)
                val viewMapping = mapOf(
                    SizeF(110f, 40f) to bindViews(R.layout.widget_steps_slim),
                    SizeF(110f, 95f) to bindViews(R.layout.widget_steps_compact),
                    SizeF(220f, 80f) to bindViews(R.layout.widget_steps)
                )
                appWidgetManager.updateAppWidget(appWidgetId, RemoteViews(viewMapping))
            } else {
                val widgetOptions = options ?: appWidgetManager.getAppWidgetOptions(appWidgetId)
                val minWidth = widgetOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250)
                val minHeight = widgetOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 100)

                val selectedLayout = when {
                    minHeight in 1..85 -> R.layout.widget_steps_slim
                    minWidth in 1..210 -> R.layout.widget_steps_compact
                    else -> R.layout.widget_steps
                }
                appWidgetManager.updateAppWidget(appWidgetId, bindViews(selectedLayout))
            }
        }

        private fun drawProgressRing(steps: Int, goal: Int): Bitmap {
            val size = 320
            val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)

            val strokeWidth = 24f
            val padding = 20f

            val trackPaint = Paint().apply {
                color = Color.parseColor("#1F1F1F") // AMOLED dark track
                style = Paint.Style.STROKE
                this.strokeWidth = strokeWidth
                isAntiAlias = true
            }

            val progressPaint = Paint().apply {
                color = Color.WHITE
                style = Paint.Style.STROKE
                this.strokeWidth = strokeWidth
                strokeCap = Paint.Cap.ROUND
                isAntiAlias = true
            }

            val rect = RectF(padding, padding, size - padding, size - padding)

            // Draw track
            canvas.drawCircle(size / 2f, size / 2f, (size - 2f * padding) / 2f, trackPaint)

            // Draw progress arc clockwise from 12 o'clock (-90 degrees)
            val progress = if (goal > 0) Math.min(1.0f, steps.toFloat() / goal.toFloat()) else 0.0f
            val sweepAngle = 360f * progress
            canvas.drawArc(rect, -90f, sweepAngle, false, progressPaint)

            return bitmap
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle
    ) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
        updateAppWidget(context, appWidgetManager, appWidgetId, newOptions)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == AppWidgetManager.ACTION_APPWIDGET_UPDATE || intent.action == ACTION_REFRESH_WIDGET) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val thisWidget = ComponentName(context, FitrackStepsWidget::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
            onUpdate(context, appWidgetManager, appWidgetIds)
        } else if (intent.action == ACTION_REFRESH_AND_OPEN) {
            // 1. Force refresh widget steps
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val thisWidget = ComponentName(context, FitrackStepsWidget::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
            onUpdate(context, appWidgetManager, appWidgetIds)

            // 2. Start MainActivity to open the app
            val launchIntent = Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            context.startActivity(launchIntent)
        }
    }

    override fun onEnabled(context: Context) {
        // Setup AlarmManager to refresh widget every 15 minutes
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, FitrackStepsWidget::class.java).apply {
            action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val triggerAt = SystemClock.elapsedRealtime() + WIDGET_ALARM_INTERVAL_MS
        alarmManager.setRepeating(
            AlarmManager.ELAPSED_REALTIME,
            triggerAt,
            WIDGET_ALARM_INTERVAL_MS,
            pendingIntent
        )
    }

    override fun onDisabled(context: Context) {
        // Cancel AlarmManager updates
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, FitrackStepsWidget::class.java).apply {
            action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            0,
            intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )
        if (pendingIntent != null) {
            alarmManager.cancel(pendingIntent)
        }
    }
}
