// File: screens/ARCalibrationScreen.js - CALIBRAZIONE AR COMPLETA
import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';

// Context & Services
import { AppContext } from '../context/AppContext';
import ARCalibrationService from '../services/ARCalibrationService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ARCalibrationScreen = ({ navigation }) => {
  const { panelsData } = useContext(AppContext);
  
  // States
  const [hasPermission, setHasPermission] = useState(null);
  const [calibrationService] = useState(() => new ARCalibrationService());
  const [calibrationStep, setCalibrationStep] = useState(0);
  const [calibrationPoints, setCalibrationPoints] = useState([]);
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationResult, setCalibrationResult] = useState(null);
  const [suitablePanels, setSuitablePanels] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [deviceOrientation, setDeviceOrientation] = useState({ x: 0, y: 0, z: 0 });
  
  // Animations
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;

  // Steps per la calibrazione
  const calibrationSteps = [
    {
      id: 0,
      title: 'Preparazione',
      description: 'Controllo sensori e posizione',
      icon: 'settings-outline'
    },
    {
      id: 1,
      title: 'Seleziona Pannello',
      description: 'Scegli un pannello che puoi vedere',
      icon: 'locate-outline'
    },
    {
      id: 2,
      title: 'Posizionamento',
      description: 'Punta il dispositivo verso il pannello',
      icon: 'camera-outline'
    },
    {
      id: 3,
      title: 'Calibrazione',
      description: 'Raccolta dati di calibrazione',
      icon: 'scan-outline'
    },
    {
      id: 4,
      title: 'Completato',
      description: 'Calibrazione completata',
      icon: 'checkmark-circle-outline'
    }
  ];

  // Request permissions and initialize
  useEffect(() => {
    initializeCalibration();
  }, []);

  // Check suitable panels when location is available
  useEffect(() => {
    if (userLocation && panelsData.length > 0) {
      checkSuitablePanels();
    }
  }, [userLocation, panelsData]);

  // Start animations
  useEffect(() => {
    if (calibrationStep === 2 || calibrationStep === 3) {
      startPulseAnimation();
    }
    
    Animated.timing(fadeAnimation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [calibrationStep]);

  const initializeCalibration = async () => {
    try {
      // Camera permission
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(cameraStatus === 'granted');
      
      if (cameraStatus !== 'granted') {
        Alert.alert(
          'Permessi Necessari',
          'La calibrazione AR richiede l\'accesso alla fotocamera e alla posizione.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      // Location permission
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus === 'granted') {
        getCurrentLocation();
      } else {
        Alert.alert(
          'GPS Richiesto',
          'La calibrazione AR richiede l\'accesso alla posizione per funzionare correttamente.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error initializing calibration:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude,
        heading: location.coords.heading
      });
      
      // Proceed to next step
      setCalibrationStep(1);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(
        'Errore GPS',
        'Impossibile ottenere la posizione. Controlla che il GPS sia attivo.',
        [{ text: 'Riprova', onPress: getCurrentLocation }]
      );
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const checkSuitablePanels = () => {
    const validation = calibrationService.validateCalibrationLocation(userLocation, panelsData);
    
    if (validation.valid) {
      setSuitablePanels(validation.suitablePanels);
      if (validation.suitablePanels.length === 1) {
        setSelectedPanel(validation.suitablePanels[0]);
      }
    } else {
      Alert.alert(
        'Posizione Non Adatta',
        validation.message,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  };

  const selectPanel = (panel) => {
    setSelectedPanel(panel);
    setCalibrationStep(2);
  };

  const startCalibration = async () => {
    if (!selectedPanel || !userLocation) {
      Alert.alert('Errore', 'Pannello o posizione non disponibili');
      return;
    }

    setIsCalibrating(true);
    setCalibrationStep(3);

    try {
      // Start calibration process
      const started = await calibrationService.startCalibration();
      if (!started) {
        throw new Error('Calibrazione annullata dall\'utente');
      }

      // Simulate calibration point collection
      const calibrationPromise = new Promise((resolve, reject) => {
        let pointsCollected = 0;
        const maxPoints = calibrationService.requiredCalibrationPoints;
        
        const collectPoint = () => {
          // Simulate screen tap for calibration point
          const screenPosition = {
            x: screenWidth / 2,
            y: screenHeight / 2
          };
          
          const result = calibrationService.addCalibrationPoint(
            userLocation,
            selectedPanel,
            deviceOrientation,
            screenPosition
          );
          
          if (result.success) {
            pointsCollected++;
            setCalibrationPoints(prev => [...prev, {
              id: pointsCollected,
              timestamp: Date.now(),
              panel: selectedPanel.name
            }]);
            
            if (result.needsMorePoints) {
              setTimeout(collectPoint, 2000);
            } else {
              resolve(result);
            }
          } else {
            reject(new Error(result.message));
          }
        };
        
        collectPoint();
      });

      const result = await calibrationPromise;
      
      if (result.success && result.isCalibrated) {
        setCalibrationResult(result);
        setCalibrationStep(4);
        
        // Show success message
        setTimeout(() => {
          Alert.alert(
            'Calibrazione Completata!',
            `Accuratezza: ${result.accuracy}%\nL'AR è ora calibrato e pronto per l'uso.`,
            [
              {
                text: 'Testa AR',
                onPress: () => navigation.navigate('ARView')
              },
              {
                text: 'Chiudi',
                onPress: () => navigation.goBack()
              }
            ]
          );
        }, 1000);
      } else {
        throw new Error(result.message || 'Calibrazione fallita');
      }

    } catch (error) {
      console.error('Calibration error:', error);
      Alert.alert(
        'Errore Calibrazione',
        error.message || 'La calibrazione è fallita. Riprova.',
        [{ text: 'OK' }]
      );
      setCalibrationStep(2);
    } finally {
      setIsCalibrating(false);
    }
  };

  const renderStepIndicator = () => {
    return (
      <View style={styles.stepIndicator}>
        {calibrationSteps.map((step, index) => (
          <View key={step.id} style={styles.stepItem}>
            <View style={[
              styles.stepCircle,
              {
                backgroundColor: index <= calibrationStep ? '#4CAF50' : '#E0E0E0',
                borderColor: index === calibrationStep ? '#2196F3' : 'transparent',
                borderWidth: index === calibrationStep ? 2 : 0
              }
            ]}>
              <Ionicons 
                name={step.icon} 
                size={16} 
                color={index <= calibrationStep ? '#fff' : '#999'} 
              />
            </View>
            {index < calibrationSteps.length - 1 && (
              <View style={[
                styles.stepLine,
                { backgroundColor: index < calibrationStep ? '#4CAF50' : '#E0E0E0' }
              ]} />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderStepContent = () => {
    const currentStep = calibrationSteps[calibrationStep];
    
    return (
      <Animated.View style={[styles.stepContent, { opacity: fadeAnimation }]}>
        <Text style={styles.stepTitle}>{currentStep.title}</Text>
        <Text style={styles.stepDescription}>{currentStep.description}</Text>
        
        {calibrationStep === 0 && renderPreparationStep()}
        {calibrationStep === 1 && renderPanelSelectionStep()}
        {calibrationStep === 2 && renderPositioningStep()}
        {calibrationStep === 3 && renderCalibrationStep()}
        {calibrationStep === 4 && renderCompletionStep()}
      </Animated.View>
    );
  };

  const renderPreparationStep = () => {
    return (
      <View style={styles.preparationContainer}>
        <View style={styles.statusRow}>
          <Ionicons name="location-outline" size={24} color="#2196F3" />
          <Text style={styles.statusText}>Rilevamento posizione GPS...</Text>
        </View>
        
        <View style={styles.statusRow}>
          <Ionicons name="compass-outline" size={24} color="#2196F3" />
          <Text style={styles.statusText}>Inizializzazione sensori...</Text>
        </View>
        
        <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
      </View>
    );
  };

  const renderPanelSelectionStep = () => {
    return (
      <View style={styles.panelSelectionContainer}>
        <Text style={styles.selectionTitle}>Pannelli disponibili per calibrazione:</Text>
        
        {suitablePanels.map((panel) => (
          <TouchableOpacity
            key={panel.id}
            style={[
              styles.panelOption,
              selectedPanel?.id === panel.id && styles.selectedPanelOption
            ]}
            onPress={() => selectPanel(panel)}
          >
            <View style={styles.panelOptionContent}>
              <Text style={styles.panelOptionName}>{panel.name}</Text>
              <Text style={styles.panelOptionDistance}>
                {Math.round(calibrationService.calculateDistance(
                  userLocation.latitude, userLocation.longitude,
                  panel.location.lat, panel.location.lon
                ))}m di distanza
              </Text>
            </View>
            {selectedPanel?.id === panel.id && (
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderPositioningStep = () => {
    return (
      <View style={styles.positioningContainer}>
        <Text style={styles.positioningTitle}>
          Punta il dispositivo verso: {selectedPanel?.name}
        </Text>
        
        <View style={styles.orientationInfo}>
          <Text style={styles.orientationText}>
            Tieni il dispositivo stabile e punta verso il pannello
          </Text>
        </View>

        <Animated.View style={[
          styles.targetReticle,
          { transform: [{ scale: pulseAnimation }] }
        ]}>
          <Ionicons name="scan-outline" size={60} color="#2196F3" />
        </Animated.View>

        <TouchableOpacity 
          style={styles.calibrateButton}
          onPress={startCalibration}
        >
          <Text style={styles.calibrateButtonText}>Inizia Calibrazione</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCalibrationStep = () => {
    return (
      <View style={styles.calibrationContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.calibrationText}>
          Calibrazione in corso...
        </Text>
        <Text style={styles.calibrationSubtext}>
          Punti raccolti: {calibrationPoints.length}/{calibrationService.requiredCalibrationPoints}
        </Text>
        
        <View style={styles.calibrationProgress}>
          {Array.from({ length: calibrationService.requiredCalibrationPoints }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                {
                  backgroundColor: calibrationPoints.length > index ? '#4CAF50' : '#E0E0E0'
                }
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  const renderCompletionStep = () => {
    return (
      <View style={styles.completionContainer}>
        <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
        <Text style={styles.completionTitle}>Calibrazione Completata!</Text>
        
        {calibrationResult && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultText}>
              Accuratezza: {calibrationResult.accuracy}%
            </Text>
            <Text style={styles.resultText}>
              Offset calibrazione: {Math.round(calibrationResult.calibrationOffset?.heading || 0)}°
            </Text>
          </View>
        )}

        <View style={styles.completionButtons}>
          <TouchableOpacity 
            style={styles.testARButton}
            onPress={() => navigation.navigate('ARView')}
          >
            <Text style={styles.testARButtonText}>Testa AR</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.closeButtonText}>Chiudi</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (hasPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Inizializzazione calibrazione AR...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="camera-reverse-outline" size={60} color="#F44336" />
        <Text style={styles.errorText}>Accesso fotocamera negato</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Torna indietro</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calibrazione AR</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Camera View (solo per step 2 e 3) */}
      {(calibrationStep === 2 || calibrationStep === 3) && (
        <View style={styles.cameraContainer}>
          <Camera style={styles.camera} />
        </View>
      )}

      {/* Step Content */}
      <View style={styles.contentContainer}>
        {renderStepContent()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },

  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLine: {
    width: 30,
    height: 2,
    marginHorizontal: 5,
  },

  // Camera
  cameraContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },

  // Content
  contentContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 30,
    minHeight: 200,
  },
  stepContent: {
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },

  // Preparation Step
  preparationContainer: {
    width: '100%',
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    width: '100%',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
  loader: {
    marginTop: 30,
  },

  // Panel Selection
  panelSelectionContainer: {
    width: '100%',
  },
  selectionTitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  panelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPanelOption: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  panelOptionContent: {
    flex: 1,
  },
  panelOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  panelOptionDistance: {
    fontSize: 14,
    color: '#666',
  },

  // Positioning Step
  positioningContainer: {
    alignItems: 'center',
    width: '100%',
  },
  positioningTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  orientationInfo: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 30,
    width: '100%',
  },
  orientationText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  targetReticle: {
    marginBottom: 30,
  },
  calibrateButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  calibrateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Calibration Step
  calibrationContainer: {
    alignItems: 'center',
    width: '100%',
  },
  calibrationText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  calibrationSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
  },
  calibrationProgress: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 5,
  },

  // Completion Step
  completionContainer: {
    alignItems: 'center',
    width: '100%',
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 20,
    marginBottom: 30,
  },
  resultContainer: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 30,
    width: '100%',
  },
  resultText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  completionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  testARButton: {
    backgroundColor: '#2196F3',
    flex: 1,
    paddingVertical: 15,
    borderRadius: 25,
    marginRight: 10,
  },
  testARButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#f0f0f0',
    flex: 1,
    paddingVertical: 15,
    borderRadius: 25,
    marginLeft: 10,
  },
  closeButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ARCalibrationScreen;