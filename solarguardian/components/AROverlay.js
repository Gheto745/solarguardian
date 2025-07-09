// File: components/AROverlay.js
import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const AROverlay = ({ 
  isScanning = false, 
  deviceOrientation = { heading: 0, pitch: 0, roll: 0 },
  panelCount = 0,
  trackingQuality = null,
  children 
}) => {
  // Animazioni
  const scanLineTranslateY = useRef(new Animated.Value(0)).current;
  const gridOpacityAnim = useRef(new Animated.Value(0)).current;
  
  // Avvia animazione griglia di scansione
  useEffect(() => {
    if (isScanning) {
      // Animazione griglia fade in
      Animated.timing(gridOpacityAnim, {
        toValue: 0.3,
        duration: 500,
        useNativeDriver: true
      }).start();
      
      // Animazione linea di scansione con translateY invece di top
      const animateScanLine = () => {
        Animated.sequence([
          Animated.timing(scanLineTranslateY, {
            toValue: screenHeight,
            duration: 2000,
            useNativeDriver: true
          }),
          Animated.timing(scanLineTranslateY, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true
          })
        ]).start(({ finished }) => {
          if (finished && isScanning) {
            animateScanLine();
          }
        });
      };
      
      animateScanLine();
    } else {
      // Fade out griglia quando non in scansione
      Animated.timing(gridOpacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }).start();
    }
    
    return () => {
      // Pulizia animazioni
      scanLineTranslateY.stopAnimation();
      gridOpacityAnim.stopAnimation();
    };
  }, [isScanning]);
  
  // Calcola il colore della qualità del tracking
  const getTrackingQualityColor = () => {
    if (!trackingQuality) return '#ccc';
    
    switch (trackingQuality.quality) {
      case 'excellent': return '#4CAF50';
      case 'good': return '#8BC34A';
      case 'fair': return '#FFC107';
      case 'poor': return '#F44336';
      default: return '#ccc';
    }
  };
  
  return (
    <View style={styles.overlay}>
      {/* Bussola */}
      <View style={styles.compass}>
        <Animated.View 
          style={[
            styles.compassNeedle,
            { transform: [{ rotate: `${-deviceOrientation.heading}deg` }] }
          ]}
        >
          <Ionicons name="navigate" size={24} color="#2196F3" />
        </Animated.View>
        <Text style={styles.compassText}>{Math.round(deviceOrientation.heading)}°</Text>
      </View>
      
      {/* Indicatore di livello */}
      <View style={styles.levelIndicator}>
        <View style={styles.levelBackground}>
          <Animated.View 
            style={[
              styles.levelBubble,
              { 
                transform: [
                  { translateX: deviceOrientation.roll * 0.8 },
                  { translateY: deviceOrientation.pitch * 0.8 }
                ] 
              }
            ]}
          />
        </View>
      </View>
      
      {/* Contatore pannelli */}
      {isScanning && (
        <View style={styles.panelCount}>
          <Ionicons name="sunny" size={16} color="#FFC107" />
          <Text style={styles.panelCountText}>
            {panelCount} {panelCount === 1 ? 'pannello' : 'pannelli'} rilevato
          </Text>
        </View>
      )}
      
      {/* Griglia di scansione (visibile solo durante la scansione) */}
      {isScanning && (
        <Animated.View 
          style={[
            styles.scanGrid,
            { opacity: gridOpacityAnim }
          ]}
        >
          {/* Linee orizzontali */}
          {[0.25, 0.5, 0.75].map((pos, index) => (
            <View 
              key={`h-${index}`} 
              style={[
                styles.gridLine,
                { top: screenHeight * pos }
              ]} 
            />
          ))}
          
          {/* Linee verticali */}
          {[0.25, 0.5, 0.75].map((pos, index) => (
            <View 
              key={`v-${index}`} 
              style={[
                styles.gridLineVertical,
                { left: screenWidth * pos }
              ]} 
            />
          ))}
          
          {/* Linea di scansione animata - CORRETTO usando transform invece di top */}
          <Animated.View 
            style={[
              styles.scanLine, 
              { 
                transform: [{ translateY: scanLineTranslateY }],
              }
            ]} 
          />
        </Animated.View>
      )}
      
      {/* Qualità del tracking */}
      {isScanning && trackingQuality && (
        <View style={[
          styles.trackingQuality,
          { borderColor: getTrackingQualityColor() }
        ]}>
          <Text style={styles.trackingQualityText}>
            Qualità Tracking: <Text style={{ color: getTrackingQualityColor() }}>
              {trackingQuality.quality === 'excellent' ? 'Eccellente' : 
               trackingQuality.quality === 'good' ? 'Buona' :
               trackingQuality.quality === 'fair' ? 'Discreta' : 'Bassa'}
            </Text>
          </Text>
        </View>
      )}
      
      {/* Istruzioni */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          {isScanning ? 
            "Muovi lentamente la camera per rilevare i pannelli"
            : "Tocca 'Scansiona' per iniziare il rilevamento AR"
          }
        </Text>
      </View>
      
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
  
  // Compass
  compass: {
    position: 'absolute',
    top: 100,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  compassNeedle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  compassText: {
    color: '#fff',
    fontSize: 10,
    marginTop: 2,
  },
  
  // Level Indicator
  levelIndicator: {
    position: 'absolute',
    top: 100,
    left: 20,
    width: 60,
    height: 60,
  },
  levelBackground: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelBubble: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  
  // Panel Count
  panelCount: {
    position: 'absolute',
    top: 170,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  panelCountText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 5,
  },
  
  // Tracking Quality
  trackingQuality: {
    position: 'absolute',
    top: 170,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1,
  },
  trackingQualityText: {
    color: '#fff',
    fontSize: 12,
  },
  
  // Scanning Grid
  scanGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#2196F3',
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#2196F3',
  },
  
  // Scan Line - CORRETTO usando position absolute e trasformando translateY
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0, // Posizione iniziale fissa
    height: 2,
    backgroundColor: '#4CAF50',
    opacity: 0.7
  },
  
  // Instructions
  instructions: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  instructionText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
});

export default AROverlay;


