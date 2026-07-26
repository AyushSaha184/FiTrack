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
import android.os.SystemClock
import android.widget.RemoteViews

class FitrackStepsWidget : AppWidgetProvider() {

    companion object {
        const val ACTION_REFRESH_AND_OPEN = "com.fitrack.app.REFRESH_AND_OPEN"
        private const val WIDGET_ALARM_INTERVAL_MS = 15 * 60 * 1000L // 15 minutes

        fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val prefs = context.getSharedPreferences("StepCounterPrefs", Context.MODE_PRIVATE)
            val today = StepCounterForegroundService.getTodayDateString()
            val storedDate = prefs.getString("date", "")
            val steps = if (storedDate == today) prefs.getInt("steps", 0) else 0
            val goal = prefs.getInt("goal", 10000)

            val views = RemoteViews(context.packageName, R.layout.widget_steps)
            views.setTextViewText(R.id.widget_step_count, steps.toString())

            val ringBitmap = drawProgressRing(steps, goal)
            views.setImageViewBitmap(R.id.widget_progress_ring, ringBitmap)

            // Setup click PendingIntent to send our REFRESH_AND_OPEN broadcast action
            val clickIntent = Intent(context, FitrackStepsWidget::class.java).apply {
                action = ACTION_REFRESH_AND_OPEN
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                0,
                clickIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_steps_root, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun drawProgressRing(steps: Int, goal: Int): Bitmap {
            val size = 200
            val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)

            val trackPaint = Paint().apply {
                color = Color.parseColor("#222222") // AMOLED dark track
                style = Paint.Style.STROKE
                strokeWidth = 16f
                isAntiAlias = true
            }

            val progressPaint = Paint().apply {
                color = Color.WHITE
                style = Paint.Style.STROKE
                strokeWidth = 16f
                strokeCap = Paint.Cap.ROUND
                isAntiAlias = true
            }

            val padding = 16f
            val rect = RectF(padding, padding, size - padding, size - padding)

            // Draw track
            canvas.drawCircle(size / 2f, size / 2f, (size - 2f * padding) / 2f, trackPaint)

            // Draw progress arc anticlockwise from 12 o'clock (-90 degrees)
            val progress = if (goal > 0) Math.min(1.0f, steps.toFloat() / goal.toFloat()) else 0.0f
            val sweepAngle = -360f * progress
            canvas.drawArc(rect, -90f, sweepAngle, false, progressPaint)

            return bitmap
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == AppWidgetManager.ACTION_APPWIDGET_UPDATE) {
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
