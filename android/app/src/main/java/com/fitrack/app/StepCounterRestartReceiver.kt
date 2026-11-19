package com.fitrack.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class StepCounterRestartReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val prefs = context.getSharedPreferences("StepCounterPrefs", Context.MODE_PRIVATE)
        val trackingActive = prefs.getBoolean("tracking_active", false)
        if (trackingActive) {
            val serviceIntent = Intent(context, StepCounterForegroundService::class.java).apply {
                action = "ACTION_APP_BACKGROUNDED"
            }
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }
            } catch (_: Exception) {}
        }
    }
}

