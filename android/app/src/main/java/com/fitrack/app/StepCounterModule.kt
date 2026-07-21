package com.fitrack.app

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class StepCounterModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), SensorEventListener {

    private val sensorManager: SensorManager =
        reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private var stepDetectorSensor: Sensor? =
        sensorManager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR)
    private var stepCounterSensor: Sensor? =
        sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)

    private var isListening = false
    private var initialStepCount = -1f

    override fun getName(): String = "StepCounterModule"

    @ReactMethod
    fun isSensorAvailable(promise: Promise) {
        val available = (stepDetectorSensor != null || stepCounterSensor != null)
        promise.resolve(available)
    }

    @ReactMethod
    fun startStepCounter(promise: Promise) {
        if (isListening) {
            promise.resolve(true)
            return
        }

        var registered = false
        if (stepDetectorSensor != null) {
            registered = sensorManager.registerListener(
                this,
                stepDetectorSensor,
                SensorManager.SENSOR_DELAY_UI
            )
        }

        if (stepCounterSensor != null) {
            val counterRegistered = sensorManager.registerListener(
                this,
                stepCounterSensor,
                SensorManager.SENSOR_DELAY_UI
            )
            registered = registered || counterRegistered
        }

        if (registered) {
            isListening = true
            promise.resolve(true)
        } else {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun stopStepCounter(promise: Promise) {
        if (isListening) {
            sensorManager.unregisterListener(this)
            isListening = false
            initialStepCount = -1f
        }
        promise.resolve(true)
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event == null) return

        val params = Arguments.createMap()

        if (event.sensor.type == Sensor.TYPE_STEP_DETECTOR) {
            val stepCount = event.values[0].toInt()
            params.putInt("stepDelta", if (stepCount > 0) stepCount else 1)
            sendEvent("onStepDetected", params)
        } else if (event.sensor.type == Sensor.TYPE_STEP_COUNTER) {
            val totalSensorSteps = event.values[0]
            if (initialStepCount < 0) {
                initialStepCount = totalSensorSteps
            }
            val stepsSinceStart = (totalSensorSteps - initialStepCount).toInt()
            if (stepsSinceStart > 0) {
                params.putInt("stepDelta", stepsSinceStart)
                initialStepCount = totalSensorSteps
                sendEvent("onStepDetected", params)
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // Not needed
    }

    private fun sendEvent(eventName: String, params: Any?) {
        if (reactApplicationContext.hasActiveReactInstance()) {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN EventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN EventEmitter
    }
}
