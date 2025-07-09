// File: hooks/useARSensors.js - AR Sensors Hook
import { useState, useEffect, useRef } from 'react';
import { Accelerometer, Gyroscope, Magnetometer } from 'expo-sensors';
import * as Location from 'expo-location';

export const useARSensors = () => {
  // States
  const [deviceOrientation, setDeviceOrientation] = useState({
    heading: 0,
    pitch: 0,
    roll: 0
  });
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [sensorsActive, setSensorsActive] = useState(false);
  const [locationTracking, setLocationTracking] = useState(false);

  // Refs for sensor subscriptions
  const accelerometerSubscription = useRef(null);
  const gyroscopeSubscription = useRef(null);
  const magnetometerSubscription = useRef(null);
  const locationSubscription = useRef(null);

  // Sensor data storage
  const sensorData = useRef({
    accelerometer: { x: 0, y: 0, z: 0 },
    gyroscope: { x: 0, y: 0, z: 0 },
    magnetometer: { x: 0, y: 0, z: 0 }
  });

  // Request location permission
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  // Start sensor monitoring
  const startSensors = async () => {
    if (sensorsActive) return;

    try {
      // Set update intervals
      Accelerometer.setUpdateInterval(100); // 10Hz
      Gyroscope.setUpdateInterval(100);     // 10Hz
      Magnetometer.setUpdateInterval(200);  // 5Hz

      // Start accelerometer
      accelerometerSubscription.current = Accelerometer.addListener(data => {
        sensorData.current.accelerometer = data;
        updateOrientation();
      });

      // Start gyroscope
      gyroscopeSubscription.current = Gyroscope.addListener(data => {
        sensorData.current.gyroscope = data;
        updateOrientation();
      });

      // Start magnetometer
      magnetometerSubscription.current = Magnetometer.addListener(data => {
        sensorData.current.magnetometer = data;
        updateOrientation();
      });

      setSensorsActive(true);
    } catch (error) {
      console.error('Error starting sensors:', error);
    }
  };

  // Stop sensor monitoring
  const stopSensors = () => {
    if (accelerometerSubscription.current) {
      accelerometerSubscription.current.remove();
      accelerometerSubscription.current = null;
    }
    if (gyroscopeSubscription.current) {
      gyroscopeSubscription.current.remove();
      gyroscopeSubscription.current = null;
    }
    if (magnetometerSubscription.current) {
      magnetometerSubscription.current.remove();
      magnetometerSubscription.current = null;
    }
    setSensorsActive(false);
  };

  // Start location tracking
  const startLocationTracking = async () => {
    if (!locationPermission || locationTracking) return;

    try {
      // Get initial location
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      setUserLocation({
        latitude: initialLocation.coords.latitude,
        longitude: initialLocation.coords.longitude,
        altitude: initialLocation.coords.altitude,
        heading: initialLocation.coords.heading,
        accuracy: initialLocation.coords.accuracy,
        timestamp: initialLocation.timestamp
      });

      // Start watching location changes
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000, // Update every second
          distanceInterval: 1, // Update every meter
        },
        (location) => {
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude,
            heading: location.coords.heading,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp
          });
        }
      );

      setLocationTracking(true);
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };

  // Stop location tracking
  const stopLocationTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setLocationTracking(false);
  };

  // Update device orientation based on sensor data
  const updateOrientation = () => {
    const { accelerometer, magnetometer } = sensorData.current;

    // Calculate pitch and roll from accelerometer
    const pitch = Math.atan2(
      accelerometer.y,
      Math.sqrt(accelerometer.x * accelerometer.x + accelerometer.z * accelerometer.z)
    ) * 180 / Math.PI;

    const roll = Math.atan2(
      -accelerometer.x,
      accelerometer.z
    ) * 180 / Math.PI;

    // Calculate heading from magnetometer (compass)
    let heading = Math.atan2(magnetometer.y, magnetometer.x) * 180 / Math.PI;
    if (heading < 0) heading += 360;

    // Smooth the values to reduce noise
    setDeviceOrientation(prevOrientation => ({
      heading: smoothValue(prevOrientation.heading, heading, 0.1),
      pitch: smoothValue(prevOrientation.pitch, pitch, 0.2),
      roll: smoothValue(prevOrientation.roll, roll, 0.2)
    }));
  };

  // Smooth sensor values to reduce noise
  const smoothValue = (oldValue, newValue, alpha) => {
    // Handle angle wraparound for heading
    if (Math.abs(newValue - oldValue) > 180) {
      if (newValue > oldValue) {
        oldValue += 360;
      } else {
        newValue += 360;
      }
    }
    
    const smoothed = alpha * newValue + (1 - alpha) * oldValue;
    return smoothed < 0 ? smoothed + 360 : smoothed % 360;
  };
/*
  // Initialize sensors and location on mount
  useEffect(() => {
    const initializeAR = async () => {
      const hasLocationPermission = await requestLocationPermission();
      if (hasLocationPermission) {
        await startLocationTracking();
      }
      await startSensors();
    };

    initializeAR();

    // Cleanup on unmount
    return () => {
      stopSensors();
      stopLocationTracking();
    };
  }, []);
  */
/*
  // Cleanup subscriptions when permissions change
  useEffect(() => {
    if (locationPermission && !locationTracking) {
      startLocationTracking();
    } else if (!locationPermission && locationTracking) {
      stopLocationTracking();
    }
  }, [locationPermission]);
*/
  // Get current sensor status
  const getSensorStatus = () => ({
    sensorsActive,
    locationTracking,
    locationPermission,
    hasLocation: !!userLocation,
    locationAccuracy: userLocation?.accuracy || null,
    lastUpdate: userLocation?.timestamp || null
  });

  // Calibrate compass
  const calibrateCompass = async () => {
    return new Promise((resolve) => {
      // Reset magnetometer readings for calibration
      let calibrationCount = 0;
      const calibrationReadings = [];
      
      const calibrationSubscription = Magnetometer.addListener(data => {
        calibrationReadings.push(data);
        calibrationCount++;
        
        if (calibrationCount >= 50) { // Collect 50 readings
          calibrationSubscription.remove();
          
          // Calculate average offset
          const avgX = calibrationReadings.reduce((sum, reading) => sum + reading.x, 0) / calibrationReadings.length;
          const avgY = calibrationReadings.reduce((sum, reading) => sum + reading.y, 0) / calibrationReadings.length;
          
          resolve({
            success: true,
            offset: { x: avgX, y: avgY },
            message: 'Compass calibrated successfully'
          });
        }
      });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        calibrationSubscription.remove();
        resolve({
          success: false,
          message: 'Calibration timeout'
        });
      }, 10000);
    });
  };

  return {
    // State
    deviceOrientation,
    userLocation,
    locationPermission,
    sensorsActive,
    locationTracking,
    
    // Methods
    startSensors,
    stopSensors,
    startLocationTracking,
    stopLocationTracking,
    requestLocationPermission,
    getSensorStatus,
    calibrateCompass,
    
    // Utilities
    isReady: sensorsActive && locationPermission && !!userLocation
  };
};

export default useARSensors;