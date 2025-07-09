// File: services/ARService.js - VERSIONE MIGLIORATA
import { Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export class ARService {
  constructor() {
    this.fovHorizontal = 60; // Campo visivo orizzontale in gradi
    this.fovVertical = 45;   // Campo visivo verticale in gradi
    this.maxDistance = 1000; // Distanza massima in metri (aumentata)
    this.minDistance = 2;    // Distanza minima in metri (ridotta)
    
    // Parametri per smooth dei dati
    this.positionHistory = new Map();
    this.smoothingFactor = 0.7;
    
    // Cache per i calcoli
    this.calculationCache = new Map();
    this.cacheTimeout = 1000; // 1 secondo
    
    // Compensazione declinazione magnetica (approssimativa per l'Italia)
    this.magneticDeclination = 2.5; // gradi
  }

  /**
   * Calcola la distanza tra due punti GPS con maggiore precisione
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Raggio della Terra in metri (più preciso)
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

  /**
   * Calcola l'angolo di bearing con compensazione magnetica
   */
  calculateBearing(lat1, lon1, lat2, lon2, compensateMagnetic = true) {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const x = Math.sin(Δλ) * Math.cos(φ2);
    const y = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    let θ = Math.atan2(x, y);
    let bearing = (θ * 180 / Math.PI + 360) % 360;
    
    // Compensazione declinazione magnetica
    if (compensateMagnetic) {
      bearing = (bearing + this.magneticDeclination) % 360;
    }
    
    return bearing;
  }

  /**
   * Calcola l'elevazione con considerazione della curvatura terrestre
   */
  calculateElevation(distance, heightDiff = 0, useEarthCurvature = true) {
    let adjustedHeightDiff = heightDiff;
    
    if (useEarthCurvature && distance > 100) {
      // Compensazione per curvatura terrestre su distanze maggiori
      const earthRadius = 6371000;
      const curvatureCorrection = (distance * distance) / (2 * earthRadius);
      adjustedHeightDiff += curvatureCorrection;
    }
    
    return Math.atan2(adjustedHeightDiff, distance) * 180 / Math.PI;
  }

  /**
   * Normalizza un angolo tra 0 e 360 gradi
   */
  normalizeAngle(angle) {
    while (angle < 0) angle += 360;
    while (angle >= 360) angle -= 360;
    return angle;
  }

  /**
   * Smooth dei dati di posizione per ridurre jitter
   */
  smoothPosition(panelId, newPosition, timestamp) {
    const historyKey = panelId;
    const history = this.positionHistory.get(historyKey) || [];
    
    // Aggiungi nuova posizione
    history.push({
      ...newPosition,
      timestamp
    });
    
    // Mantieni solo le ultime 5 posizioni
    if (history.length > 5) {
      history.shift();
    }
    
    this.positionHistory.set(historyKey, history);
    
    // Se abbiamo abbastanza dati, applica smoothing
    if (history.length >= 3) {
      const weights = [0.5, 0.3, 0.2]; // Più peso alle posizioni recenti
      let smoothedX = 0, smoothedY = 0;
      
      for (let i = 0; i < Math.min(history.length, weights.length); i++) {
        const pos = history[history.length - 1 - i];
        smoothedX += pos.x * weights[i];
        smoothedY += pos.y * weights[i];
      }
      
      return {
        ...newPosition,
        x: smoothedX,
        y: smoothedY
      };
    }
    
    return newPosition;
  }

  /**
   * Verifica se la posizione è valida e stabile
   */
  isPositionStable(panelId) {
    const history = this.positionHistory.get(panelId);
    if (!history || history.length < 3) return false;
    
    // Calcola varianza delle posizioni recenti
    const recentPositions = history.slice(-3);
    const avgX = recentPositions.reduce((sum, pos) => sum + pos.x, 0) / recentPositions.length;
    const avgY = recentPositions.reduce((sum, pos) => sum + pos.y, 0) / recentPositions.length;
    
    const variance = recentPositions.reduce((sum, pos) => {
      return sum + Math.pow(pos.x - avgX, 2) + Math.pow(pos.y - avgY, 2);
    }, 0) / recentPositions.length;
    
    return variance < 100; // Soglia di stabilità in pixel²
  }

  /**
   * Calcola la posizione AR di un pannello con miglioramenti
   */
  calculateARPosition(userLocation, panel, deviceHeading = 0, devicePitch = 0, timestamp = Date.now()) {
    if (!userLocation || !panel.location) {
      return { x: 0, y: 0, visible: false, distance: 0, bearing: 0, confidence: 0 };
    }

    // Crea cache key
    const cacheKey = `${panel.id}_${Math.round(userLocation.latitude * 1000000)}_${Math.round(userLocation.longitude * 1000000)}_${Math.round(deviceHeading)}_${Math.round(devicePitch)}`;
    
    // Controlla cache
    const cached = this.calculationCache.get(cacheKey);
    if (cached && timestamp - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }

    // Calcola distanza e bearing
    const distance = this.calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      panel.location.lat,
      panel.location.lon
    );

    const bearing = this.calculateBearing(
      userLocation.latitude,
      userLocation.longitude,
      panel.location.lat,
      panel.location.lon
    );

    // Controlla se il pannello è nella distanza visibile
    if (distance < this.minDistance || distance > this.maxDistance) {
      const result = { x: 0, y: 0, visible: false, distance, bearing, confidence: 0 };
      this.calculationCache.set(cacheKey, { result, timestamp });
      return result;
    }

    // Calcola l'angolo relativo rispetto all'orientamento del dispositivo
    let relativeBearing = this.normalizeAngle(bearing - deviceHeading);
    
    // Converte a range -180 a +180 per il calcolo della posizione
    if (relativeBearing > 180) {
      relativeBearing -= 360;
    }

    // Controlla se il pannello è nel campo visivo orizzontale
    const halfFovH = this.fovHorizontal / 2;
    if (Math.abs(relativeBearing) > halfFovH) {
      const result = { x: 0, y: 0, visible: false, distance, bearing, confidence: 0 };
      this.calculationCache.set(cacheKey, { result, timestamp });
      return result;
    }

    // Calcola posizione X sullo schermo con correzione non-lineare
    const normalizedX = relativeBearing / halfFovH; // Range -1 a +1
    const screenX = (screenWidth / 2) + (normalizedX * screenWidth / 2);

    // Calcola elevazione con altezza stimata del pannello
    const estimatedPanelHeight = this.estimatePanelHeight(panel, distance);
    const elevation = this.calculateElevation(distance, estimatedPanelHeight);
    
    // Calcola l'angolo di elevazione relativo al pitch del dispositivo
    const relativeElevation = elevation - devicePitch;
    
    // Controlla se il pannello è nel campo visivo verticale
    const halfFovV = this.fovVertical / 2;
    if (Math.abs(relativeElevation) > halfFovV) {
      const result = { x: screenX, y: 0, visible: false, distance, bearing, confidence: 0 };
      this.calculationCache.set(cacheKey, { result, timestamp });
      return result;
    }

    // Calcola posizione Y sullo schermo
    const normalizedY = -relativeElevation / halfFovV; // Range -1 a +1 (invertito per coordinate schermo)
    const screenY = (screenHeight / 2) + (normalizedY * screenHeight / 2);

    // Calcola confidenza basata su accuratezza GPS e distanza
    const gpsAccuracy = userLocation.accuracy || 10;
    const distanceConfidence = Math.max(0, 1 - (distance / this.maxDistance));
    const accuracyConfidence = Math.max(0, 1 - (gpsAccuracy / 20));
    const stabilityConfidence = this.isPositionStable(panel.id) ? 1 : 0.5;
    const confidence = (distanceConfidence * accuracyConfidence * stabilityConfidence);

    // Crea risultato base
    const baseResult = {
      x: screenX,
      y: screenY,
      visible: true,
      distance,
      bearing,
      elevation,
      relativeBearing,
      relativeElevation,
      confidence: Math.round(confidence * 100) / 100,
      estimatedHeight: estimatedPanelHeight
    };

    // Applica smoothing se abbiamo dati precedenti
    const smoothedResult = this.smoothPosition(panel.id, baseResult, timestamp);

    // Salva in cache
    this.calculationCache.set(cacheKey, { result: smoothedResult, timestamp });

    return smoothedResult;
  }

  /**
   * Stima l'altezza del pannello basata su tipo e installazione
   */
  estimatePanelHeight(panel, distance) {
    // Altezza base stimata in base al tipo di installazione
    let baseHeight = 3; // metri sopra il suolo (default)
    
    // Aggiustamenti basati sul tipo di pannello o informazioni aggiuntive
    if (panel.installationType) {
      switch (panel.installationType.toLowerCase()) {
        case 'roof':
        case 'tetto':
          baseHeight = 5; // Installazione su tetto
          break;
        case 'ground':
        case 'terra':
          baseHeight = 2; // Installazione a terra
          break;
        case 'pole':
        case 'palo':
          baseHeight = 4; // Installazione su palo
          break;
      }
    }
    
    // Aggiustamento basato sulla distanza (correzione prospettiva)
    const perspectiveAdjustment = Math.min(1, distance / 100) * 0.5;
    
    return baseHeight + perspectiveAdjustment;
  }

  /**
   * Filtra e ordina i pannelli visibili con priorità intelligente
   */
  getVisiblePanels(userLocation, panels, deviceHeading = 0, devicePitch = 0) {
    if (!userLocation || !panels || panels.length === 0) {
      return [];
    }

    const timestamp = Date.now();
    const visiblePanels = [];

    for (const panel of panels) {
      const arPosition = this.calculateARPosition(
        userLocation, 
        panel, 
        deviceHeading, 
        devicePitch,
        timestamp
      );
      
      if (arPosition.visible && arPosition.confidence > 0.1) {
        visiblePanels.push({
          ...panel,
          arPosition
        });
      }
    }

    // Ordina per priorità: confidenza, distanza, stato del pannello
    return visiblePanels.sort((a, b) => {
      // Prima priorità: pannelli con problemi
      const aHasIssues = a.status !== 'optimal' ? 1 : 0;
      const bHasIssues = b.status !== 'optimal' ? 1 : 0;
      if (aHasIssues !== bHasIssues) {
        return bHasIssues - aHasIssues;
      }
      
      // Seconda priorità: confidenza
      const confidenceDiff = b.arPosition.confidence - a.arPosition.confidence;
      if (Math.abs(confidenceDiff) > 0.1) {
        return confidenceDiff;
      }
      
      // Terza priorità: distanza (più vicini prima)
      return a.arPosition.distance - b.arPosition.distance;
    });
  }

  /**
   * Ottiene informazioni dettagliate sulla direzione verso un pannello
   */
  getDirectionToPanel(userLocation, panel) {
    if (!userLocation || !panel.location) {
      return null;
    }

    const distance = this.calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      panel.location.lat,
      panel.location.lon
    );

    const bearing = this.calculateBearing(
      userLocation.latitude,
      userLocation.longitude,
      panel.location.lat,
      panel.location.lon
    );

    // Converte il bearing in direzione cardinale
    const getCardinalDirection = (bearing) => {
      const directions = [
        'N', 'NNE', 'NE', 'ENE',
        'E', 'ESE', 'SE', 'SSE',
        'S', 'SSW', 'SW', 'WSW',
        'W', 'WNW', 'NW', 'NNW'
      ];
      const index = Math.round(bearing / 22.5) % 16;
      return directions[index];
    };

    // Calcola istruzioni di navigazione
    const getNavigationInstruction = (bearing, distance) => {
      if (distance < 5) return "Sei molto vicino al pannello";
      if (distance < 20) return "Il pannello è nelle immediate vicinanze";
      if (distance < 50) return `Cammina ${Math.round(distance)}m verso ${getCardinalDirection(bearing)}`;
      if (distance < 200) return `Il pannello è a ${Math.round(distance)}m verso ${getCardinalDirection(bearing)}`;
      return `Il pannello è a ${Math.round(distance/1000 * 10)/10}km verso ${getCardinalDirection(bearing)}`;
    };

    return {
      distance,
      bearing,
      cardinalDirection: getCardinalDirection(bearing),
      navigationInstruction: getNavigationInstruction(bearing, distance),
      isNearby: distance <= 100,
      isVisible: distance >= this.minDistance && distance <= this.maxDistance,
      canBeTracked: distance <= this.maxDistance,
      accuracy: this.getDirectionAccuracy(distance, userLocation.accuracy)
    };
  }

  /**
   * Calcola l'accuratezza della direzione basata su distanza e precisione GPS
   */
  getDirectionAccuracy(distance, gpsAccuracy = 10) {
    if (distance < gpsAccuracy * 2) return 'low';
    if (distance < gpsAccuracy * 5) return 'medium';
    return 'high';
  }

  /**
   * Calibra l'AR basandosi sulla posizione nota di un pannello
   */
  calibrateAR(userLocation, knownPanel, observedPosition, deviceHeading) {
    if (!userLocation || !knownPanel.location) {
      return null;
    }

    const actualBearing = this.calculateBearing(
      userLocation.latitude,
      userLocation.longitude,
      knownPanel.location.lat,
      knownPanel.location.lon,
      false // Non compensare magneticamente per la calibrazione
    );

    // Calcola l'offset del bearing basandosi sulla posizione osservata
    const screenCenterX = screenWidth / 2;
    const offsetX = observedPosition.x - screenCenterX;
    const estimatedBearingFromScreen = (offsetX / screenCenterX) * (this.fovHorizontal / 2);
    const estimatedActualBearing = deviceHeading + estimatedBearingFromScreen;

    const calibrationOffset = actualBearing - estimatedActualBearing;

    // Calcola accuratezza della calibrazione
    const distance = this.calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      knownPanel.location.lat,
      knownPanel.location.lon
    );

    const accuracy = this.calculateCalibrationAccuracy(
      distance, 
      Math.abs(offsetX), 
      userLocation.accuracy
    );

    return {
      bearingOffset: this.normalizeAngle(calibrationOffset),
      accuracy,
      calibrated: accuracy > 0.5,
      distance,
      confidence: Math.min(1, accuracy * 2),
      recommendedAction: this.getCalibrationRecommendation(accuracy, distance)
    };
  }

  /**
   * Calcola l'accuratezza della calibrazione
   */
  calculateCalibrationAccuracy(distance, screenOffset, gpsAccuracy = 10) {
    // Fattori che influenzano l'accuratezza
    const distanceFactor = Math.max(0, Math.min(1, (distance - 10) / 90)); // Migliore tra 10-100m
    const screenFactor = Math.max(0, 1 - (screenOffset / (screenWidth / 2))); // Migliore al centro
    const gpsFactor = Math.max(0, 1 - (gpsAccuracy / 20)); // Migliore con GPS preciso
    
    return (distanceFactor + screenFactor + gpsFactor) / 3;
  }

  /**
   * Fornisce raccomandazioni per migliorare la calibrazione
   */
  getCalibrationRecommendation(accuracy, distance) {
    if (accuracy > 0.8) return "Calibrazione ottimale";
    if (accuracy > 0.6) return "Calibrazione buona";
    if (distance < 10) return "Allontanati dal pannello per una migliore calibrazione";
    if (distance > 100) return "Avvicinati al pannello per una migliore calibrazione";
    return "Posiziona il pannello al centro dello schermo per calibrare";
  }

  /**
   * Pulisce la cache e i dati di posizione obsoleti
   */
  cleanup() {
    const now = Date.now();
    
    // Pulisce cache di calcolo
    for (const [key, value] of this.calculationCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout * 5) {
        this.calculationCache.delete(key);
      }
    }
    
    // Pulisce cronologia posizioni
    for (const [key, history] of this.positionHistory.entries()) {
      const recentHistory = history.filter(pos => now - pos.timestamp < 30000); // 30 secondi
      if (recentHistory.length === 0) {
        this.positionHistory.delete(key);
      } else {
        this.positionHistory.set(key, recentHistory);
      }
    }
  }

  /**
   * Ottiene informazioni di debug avanzate per l'AR
   */
  getARDebugInfo(userLocation, deviceHeading, devicePitch) {
    return {
      userLocation: userLocation ? {
        lat: Math.round(userLocation.latitude * 1000000) / 1000000,
        lon: Math.round(userLocation.longitude * 1000000) / 1000000,
        accuracy: userLocation.accuracy,
        altitude: userLocation.altitude
      } : null,
      deviceOrientation: {
        heading: Math.round(deviceHeading * 10) / 10,
        pitch: Math.round(devicePitch * 10) / 10,
        magneticDeclination: this.magneticDeclination
      },
      arSettings: {
        fov: {
          horizontal: this.fovHorizontal,
          vertical: this.fovVertical
        },
        distances: {
          min: this.minDistance,
          max: this.maxDistance
        },
        smoothingFactor: this.smoothingFactor
      },
      screen: {
        width: screenWidth,
        height: screenHeight
      },
      performance: {
        cacheSize: this.calculationCache.size,
        historySize: this.positionHistory.size,
        cacheTimeout: this.cacheTimeout
      }
    };
  }

  /**
   * Aggiorna i parametri AR dinamicamente
   */
  updateARParameters(params) {
    if (params.fovHorizontal) this.fovHorizontal = params.fovHorizontal;
    if (params.fovVertical) this.fovVertical = params.fovVertical;
    if (params.maxDistance) this.maxDistance = params.maxDistance;
    if (params.minDistance) this.minDistance = params.minDistance;
    if (params.smoothingFactor) this.smoothingFactor = params.smoothingFactor;
    if (params.magneticDeclination) this.magneticDeclination = params.magneticDeclination;
    
    // Pulisce cache dopo aggiornamento parametri
    this.calculationCache.clear();
  }

  /**
   * Verifica la qualità del tracking AR
   */
  getTrackingQuality(userLocation, visiblePanels) {
    if (!userLocation) return { quality: 'poor', issues: ['No GPS location'] };
    
    const issues = [];
    let qualityScore = 1.0;
    
    // Verifica accuratezza GPS
    const gpsAccuracy = userLocation.accuracy || 999;
    if (gpsAccuracy > 20) {
      issues.push('GPS accuracy is poor');
      qualityScore *= 0.5;
    } else if (gpsAccuracy > 10) {
      issues.push('GPS accuracy is moderate');
      qualityScore *= 0.8;
    }
    
    // Verifica numero di pannelli visibili
    if (visiblePanels.length === 0) {
      issues.push('No panels visible');
      qualityScore *= 0.3;
    } else if (visiblePanels.length < 2) {
      issues.push('Few panels for tracking');
      qualityScore *= 0.7;
    }
    
    // Verifica confidenza media dei pannelli
    if (visiblePanels.length > 0) {
      const avgConfidence = visiblePanels.reduce((sum, panel) => 
        sum + (panel.arPosition?.confidence || 0), 0) / visiblePanels.length;
      
      if (avgConfidence < 0.3) {
        issues.push('Low tracking confidence');
        qualityScore *= 0.4;
      } else if (avgConfidence < 0.6) {
        issues.push('Moderate tracking confidence');
        qualityScore *= 0.7;
      }
    }
    
    // Determina qualità finale
    let quality;
    if (qualityScore > 0.8) quality = 'excellent';
    else if (qualityScore > 0.6) quality = 'good';
    else if (qualityScore > 0.4) quality = 'fair';
    else quality = 'poor';
    
    return {
      quality,
      score: Math.round(qualityScore * 100) / 100,
      issues,
      recommendations: this.getTrackingRecommendations(issues)
    };
  }

  /**
   * Fornisce raccomandazioni per migliorare il tracking
   */
  getTrackingRecommendations(issues) {
    const recommendations = [];
    
    if (issues.some(issue => issue.includes('GPS'))) {
      recommendations.push('Spostarsi in area aperta per migliorare segnale GPS');
      recommendations.push('Attendere che il GPS si stabilizzi');
    }
    
    if (issues.some(issue => issue.includes('panels'))) {
      recommendations.push('Avvicinarsi ai pannelli solari');
      recommendations.push('Orientarsi verso i pannelli');
    }
    
    if (issues.some(issue => issue.includes('confidence'))) {
      recommendations.push('Muoversi lentamente per stabilizzare il tracking');
      recommendations.push('Calibrare il compass se necessario');
    }
    
    return recommendations;
  }
}

export default ARService;