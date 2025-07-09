// File: services/ARCalibrationService.js - AR Calibration Service
import { Alert } from 'react-native';

export class ARCalibrationService {
  constructor() {
    this.isCalibrated = false;
    this.calibrationOffset = { heading: 0, pitch: 0, roll: 0 };
    this.calibrationData = [];
    this.requiredCalibrationPoints = 3;
  }

  /**
   * Starts the calibration process
   * @returns {Promise<boolean>} Success status
   */
  async startCalibration() {
    return new Promise((resolve) => {
      Alert.alert(
        "Calibrazione AR",
        "Per una migliore precisione, calibriamo l'AR. Punta il dispositivo verso un pannello che conosci e tocca 'Calibra'.",
        [
          {
            text: "Annulla",
            style: "cancel",
            onPress: () => resolve(false)
          },
          {
            text: "Continua",
            onPress: () => resolve(true)
          }
        ]
      );
    });
  }

  /**
   * Adds a calibration point
   * @param {Object} userLocation - Current user location
   * @param {Object} knownPanel - Panel used for calibration
   * @param {Object} deviceOrientation - Current device orientation
   * @param {Object} screenPosition - Where the panel appears on screen
   * @returns {Object} Calibration status
   */
  addCalibrationPoint(userLocation, knownPanel, deviceOrientation, screenPosition) {
    if (!userLocation || !knownPanel.location) {
      return { success: false, message: "Dati insufficienti per la calibrazione" };
    }

    // Calculate expected vs actual position
    const expectedBearing = this.calculateBearing(
      userLocation.latitude,
      userLocation.longitude,
      knownPanel.location.lat,
      knownPanel.location.lon
    );

    const actualBearing = deviceOrientation.heading || 0;
    const headingOffset = expectedBearing - actualBearing;

    const calibrationPoint = {
      id: Date.now(),
      userLocation: { ...userLocation },
      knownPanel: { ...knownPanel },
      deviceOrientation: { ...deviceOrientation },
      screenPosition: { ...screenPosition },
      expectedBearing,
      actualBearing,
      headingOffset,
      timestamp: new Date().toISOString()
    };

    this.calibrationData.push(calibrationPoint);

    // Check if we have enough points for calibration
    if (this.calibrationData.length >= this.requiredCalibrationPoints) {
      return this.calculateCalibration();
    }

    return {
      success: true,
      needsMorePoints: true,
      pointsCollected: this.calibrationData.length,
      pointsRequired: this.requiredCalibrationPoints,
      message: `Punto ${this.calibrationData.length}/${this.requiredCalibrationPoints} raccolto`
    };
  }

  /**
   * Calculates the final calibration based on collected points
   * @returns {Object} Calibration result
   */
  calculateCalibration() {
    if (this.calibrationData.length < this.requiredCalibrationPoints) {
      return { success: false, message: "Punti di calibrazione insufficienti" };
    }

    // Calculate average offsets
    const headingOffsets = this.calibrationData.map(point => point.headingOffset);
    const avgHeadingOffset = headingOffsets.reduce((sum, offset) => sum + offset, 0) / headingOffsets.length;

    // Calculate standard deviation to check consistency
    const headingVariance = headingOffsets.reduce((sum, offset) => sum + Math.pow(offset - avgHeadingOffset, 2), 0) / headingOffsets.length;
    const headingStdDev = Math.sqrt(headingVariance);

    // Check if calibration is consistent (low standard deviation)
    const isConsistent = headingStdDev < 10; // Less than 10 degrees variation

    if (!isConsistent) {
      return {
        success: false,
        message: "Calibrazione inconsistente. Riprova con punti di riferimento più precisi.",
        standardDeviation: headingStdDev
      };
    }

    // Apply calibration
    this.calibrationOffset.heading = avgHeadingOffset;
    this.isCalibrated = true;

    return {
      success: true,
      isCalibrated: true,
      calibrationOffset: { ...this.calibrationOffset },
      accuracy: this.calculateAccuracy(headingStdDev),
      message: "Calibrazione completata con successo!"
    };
  }

  /**
   * Applies calibration to device orientation
   * @param {Object} rawOrientation - Raw device orientation
   * @returns {Object} Calibrated orientation
   */
  applyCalibratedOrientation(rawOrientation) {
    if (!this.isCalibrated) {
      return rawOrientation;
    }

    return {
      ...rawOrientation,
      heading: this.normalizeAngle((rawOrientation.heading || 0) + this.calibrationOffset.heading),
      pitch: (rawOrientation.pitch || 0) + this.calibrationOffset.pitch,
      roll: (rawOrientation.roll || 0) + this.calibrationOffset.roll
    };
  }

  /**
   * Calculates bearing between two GPS points
   * @param {number} lat1 - Latitude 1
   * @param {number} lon1 - Longitude 1
   * @param {number} lat2 - Latitude 2
   * @param {number} lon2 - Longitude 2
   * @returns {number} Bearing in degrees
   */
  calculateBearing(lat1, lon1, lat2, lon2) {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const x = Math.sin(Δλ) * Math.cos(φ2);
    const y = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(x, y);
    return this.normalizeAngle(θ * 180 / Math.PI);
  }

  /**
   * Normalizes angle to 0-360 range
   * @param {number} angle - Angle in degrees
   * @returns {number} Normalized angle
   */
  normalizeAngle(angle) {
    while (angle < 0) angle += 360;
    while (angle >= 360) angle -= 360;
    return angle;
  }

  /**
   * Calculates accuracy percentage based on standard deviation
   * @param {number} stdDev - Standard deviation
   * @returns {number} Accuracy percentage (0-100)
   */
  calculateAccuracy(stdDev) {
    // Convert standard deviation to accuracy percentage
    // Lower stdDev = higher accuracy
    const maxStdDev = 20; // Maximum acceptable standard deviation
    const accuracy = Math.max(0, Math.min(100, 100 - (stdDev / maxStdDev) * 100));
    return Math.round(accuracy);
  }

  /**
   * Resets calibration data
   */
  resetCalibration() {
    this.isCalibrated = false;
    this.calibrationOffset = { heading: 0, pitch: 0, roll: 0 };
    this.calibrationData = [];
  }

  /**
   * Gets calibration status
   * @returns {Object} Calibration status
   */
  getCalibrationStatus() {
    return {
      isCalibrated: this.isCalibrated,
      pointsCollected: this.calibrationData.length,
      pointsRequired: this.requiredCalibrationPoints,
      calibrationOffset: { ...this.calibrationOffset },
      lastCalibration: this.calibrationData.length > 0 ? 
        this.calibrationData[this.calibrationData.length - 1].timestamp : null
    };
  }

  /**
   * Validates if current location is suitable for calibration
   * @param {Object} userLocation - User location
   * @param {Array} panels - Available panels
   * @returns {Object} Validation result
   */
  validateCalibrationLocation(userLocation, panels) {
    if (!userLocation) {
      return { valid: false, message: "Posizione GPS non disponibile" };
    }

    if (!panels || panels.length === 0) {
      return { valid: false, message: "Nessun pannello disponibile per la calibrazione" };
    }

    // Check if there are panels within reasonable distance (10-100 meters)
    const suitablePanels = panels.filter(panel => {
      if (!panel.location) return false;
      
      const distance = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        panel.location.lat,
        panel.location.lon
      );
      
      return distance >= 10 && distance <= 100;
    });

    if (suitablePanels.length === 0) {
      return { 
        valid: false, 
        message: "Nessun pannello adatto per la calibrazione nelle vicinanze (10-100m)" 
      };
    }

    return {
      valid: true,
      suitablePanels,
      message: `${suitablePanels.length} pannelli disponibili per la calibrazione`
    };
  }

  /**
   * Calculates distance between two GPS points
   * @param {number} lat1 - Latitude 1
   * @param {number} lon1 - Longitude 1
   * @param {number} lat2 - Latitude 2
   * @param {number} lon2 - Longitude 2
   * @returns {number} Distance in meters
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

export default ARCalibrationService;