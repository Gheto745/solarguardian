// File: components/ARTutorial.js - Tutorial AR Completato
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ARTutorial = ({ visible, onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showSkipButton, setShowSkipButton] = useState(false);
  
  // Animazioni
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const indicatorAnim = useRef(new Animated.Value(0)).current;

  // Passi del tutorial
  const tutorialSteps = [
    {
      id: 'welcome',
      title: 'Benvenuto in AR Scanner',
      description: 'Scopri come utilizzare la realtà aumentata per visualizzare i tuoi pannelli solari in tempo reale.',
      icon: 'scan-outline',
      position: 'center',
      showIndicator: false,
      bgColor: '#2196F3'
    },
    {
      id: 'permissions',
      title: 'Permessi Necessari',
      description: 'Per funzionare correttamente, AR Scanner ha bisogno di accedere a:\n\n📷 Fotocamera\n📍 GPS/Posizione\n📱 Sensori di movimento',
      icon: 'shield-checkmark-outline',
      position: 'center',
      showIndicator: false,
      bgColor: '#4CAF50'
    },
    {
      id: 'gps_accuracy',
      title: 'Accuratezza GPS',
      description: 'Per risultati ottimali, assicurati di essere in un\'area aperta con buona ricezione GPS. L\'indicatore in alto a destra mostra la precisione.',
      icon: 'location-outline',
      position: 'top-right',
      indicatorTarget: { x: screenWidth - 60, y: 100 },
      showIndicator: true,
      bgColor: '#FF9800'
    },
    {
      id: 'compass_calibration',
      title: 'Calibrazione Compass',
      description: 'Il compass in alto a destra indica la direzione. Se i pannelli non appaiono nella posizione corretta, calibra il compass.',
      icon: 'compass-outline',
      position: 'top-right',
      indicatorTarget: { x: screenWidth - 40, y: 60 },
      showIndicator: true,
      bgColor: '#9C27B0'
    },
    {
      id: 'scanning',
      title: 'Avvio Scansione',
      description: 'Tocca il pulsante di scansione in basso per iniziare a rilevare i pannelli solari nelle vicinanze.',
      icon: 'scan',
      position: 'bottom-center',
      indicatorTarget: { x: screenWidth / 2, y: screenHeight - 100 },
      showIndicator: true,
      bgColor: '#673AB7'
    },
    {
      id: 'panel_markers',
      title: 'Marker dei Pannelli',
      description: 'I pannelli solari appariranno come marker colorati:\n\n🟢 Verde: Funzionamento ottimale\n🟡 Arancione: Attenzione richiesta\n🔴 Rosso: Problema rilevato',
      icon: 'solar-panel',
      position: 'center',
      showIndicator: false,
      bgColor: '#4CAF50'
    },
    {
      id: 'interaction',
      title: 'Interazione con i Marker',
      description: 'Tocca un marker per vedere informazioni dettagliate del pannello e navigare alla schermata di analisi completa.',
      icon: 'hand-left-outline',
      position: 'center',
      showIndicator: false,
      bgColor: '#FF5722'
    },
    {
      id: 'tips',
      title: 'Suggerimenti per l\'uso',
      description: '💡 Muoviti lentamente per un tracking stabile\n📱 Mantieni il dispositivo in verticale\n☀️ Funziona meglio con buona illuminazione\n🔄 Calibra periodicamente i sensori',
      icon: 'bulb-outline',
      position: 'center',
      showIndicator: false,
      bgColor: '#FFC107'
    },
    {
      id: 'ready',
      title: 'Sei Pronto!',
      description: 'Ora hai tutte le informazioni per utilizzare AR Scanner efficacemente. Buona scansione!',
      icon: 'checkmark-circle-outline',
      position: 'center',
      showIndicator: false,
      bgColor: '#4CAF50'
    }
  ];

  // Effetti animazioni
  useEffect(() => {
    if (visible) {
      setShowSkipButton(false);
      
      // Animazione di entrata
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Mostra pulsante skip dopo 2 secondi
      const skipTimer = setTimeout(() => {
        setShowSkipButton(true);
      }, 2000);

      // Animazione pulse continua per l'icona
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();

      return () => {
        clearTimeout(skipTimer);
        pulseLoop.stop();
      };
    } else {
      // Reset animazioni quando il modal si chiude
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      pulseAnim.setValue(1);
    }
  }, [visible]);

  // Animazione indicatore
  useEffect(() => {
    if (tutorialSteps[currentStep]?.showIndicator) {
      const indicatorLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(indicatorAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(indicatorAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      indicatorLoop.start();
      
      return () => indicatorLoop.stop();
    }
  }, [currentStep]);

  // Navigazione tra i passi
  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      // Animazione di transizione
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
      
      setCurrentStep(currentStep + 1);
    } else {
      completeTutorial();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const jumpToStep = (stepIndex) => {
    if (stepIndex >= 0 && stepIndex < tutorialSteps.length) {
      setCurrentStep(stepIndex);
    }
  };

  const completeTutorial = async () => {
    try {
      await AsyncStorage.setItem('ar_tutorial_completed', 'true');
      await AsyncStorage.setItem('ar_tutorial_completion_date', new Date().toISOString());
    } catch (error) {
      console.log('Error saving tutorial completion:', error);
    }
    
    // Animazione di uscita
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onComplete) {
        onComplete();
      }
    });
  };

  const skipTutorial = async () => {
    try {
      await AsyncStorage.setItem('ar_tutorial_skipped', 'true');
    } catch (error) {
      console.log('Error saving tutorial skip:', error);
    }
    
    if (onSkip) {
      onSkip();
    }
  };

  // Ottieni stile posizione per il contenuto
  const getContentPosition = (position) => {
    switch (position) {
      case 'top-right':
        return { 
          position: 'absolute', 
          top: 120, 
          right: 20, 
          left: 20 
        };
      case 'bottom-center':
        return { 
          position: 'absolute', 
          bottom: 150, 
          left: 20, 
          right: 20 
        };
      case 'center':
      default:
        return { 
          position: 'absolute', 
          top: '50%', 
          left: 20, 
          right: 20, 
          transform: [{ translateY: -120 }] 
        };
    }
  };

  // Controlla se deve mostrare il tutorial
  const checkShouldShowTutorial = async () => {
    try {
      const completed = await AsyncStorage.getItem('ar_tutorial_completed');
      const skipped = await AsyncStorage.getItem('ar_tutorial_skipped');
      return !completed && !skipped;
    } catch (error) {
      return true;
    }
  };

  if (!visible) return null;

  const currentStepData = tutorialSteps[currentStep];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
      onRequestClose={skipTutorial}
    >
      <View style={[styles.overlay, { backgroundColor: `${currentStepData.bgColor}15` }]}>
        {/* Indicatore target se necessario */}
        {currentStepData.showIndicator && currentStepData.indicatorTarget && (
          <Animated.View
            style={[
              styles.targetIndicator,
              {
                left: currentStepData.indicatorTarget.x - 30,
                top: currentStepData.indicatorTarget.y - 30,
                opacity: indicatorAnim,
                transform: [{ scale: indicatorAnim }]
              }
            ]}
          >
            <View style={[styles.targetRing, { borderColor: currentStepData.bgColor }]} />
            <View style={[styles.targetCenter, { backgroundColor: currentStepData.bgColor }]} />
          </Animated.View>
        )}

        {/* Contenuto tutorial */}
        <Animated.View
          style={[
            styles.content,
            getContentPosition(currentStepData.position),
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <View style={styles.card}>
            {/* Icona principale */}
            <Animated.View
              style={[
                styles.iconContainer,
                { 
                  backgroundColor: `${currentStepData.bgColor}20`,
                  transform: [{ scale: pulseAnim }] 
                }
              ]}
            >
              <Ionicons 
                name={currentStepData.icon} 
                size={40} 
                color={currentStepData.bgColor} 
              />
            </Animated.View>

            {/* Titolo */}
            <Text style={styles.title}>{currentStepData.title}</Text>

            {/* Descrizione */}
            <Text style={styles.description}>{currentStepData.description}</Text>

            {/* Indicatore progresso */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <Animated.View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${((currentStep + 1) / tutorialSteps.length) * 100}%`,
                      backgroundColor: currentStepData.bgColor
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {currentStep + 1} di {tutorialSteps.length}
              </Text>
            </View>

            {/* Pulsanti navigazione */}
            <View style={styles.buttonContainer}>
              {currentStep > 0 && (
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={prevStep}
                >
                  <Ionicons name="chevron-back" size={20} color="#666" />
                  <Text style={styles.secondaryButtonText}>Indietro</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.button, 
                  styles.primaryButton,
                  { backgroundColor: currentStepData.bgColor }
                ]}
                onPress={nextStep}
              >
                <Text style={styles.primaryButtonText}>
                  {currentStep === tutorialSteps.length - 1 ? 'Inizia AR!' : 'Avanti'}
                </Text>
                <Ionicons 
                  name={currentStep === tutorialSteps.length - 1 ? "rocket" : "chevron-forward"} 
                  size={20} 
                  color="#fff" 
                />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Pulsante Skip */}
        {showSkipButton && currentStep < tutorialSteps.length - 1 && (
          <Animated.View
            style={[
              styles.skipButton,
              { opacity: fadeAnim }
            ]}
          >
            <TouchableOpacity
              onPress={skipTutorial}
              style={styles.skipTouchable}
            >
              <Text style={styles.skipButtonText}>Salta tutorial</Text>
              <Ionicons name="close-circle-outline" size={16} color="#666" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Punti di navigazione */}
        <View style={styles.dotsContainer}>
          {tutorialSteps.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dot,
                index === currentStep && [styles.activeDot, { backgroundColor: currentStepData.bgColor }],
                index < currentStep && [styles.completedDot, { backgroundColor: `${currentStepData.bgColor}60` }]
              ]}
              onPress={() => jumpToStep(index)}
            />
          ))}
        </View>

        {/* Informazioni aggiuntive */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            💡 Suggerimento: Puoi riaprire questo tutorial dalle impostazioni AR
          </Text>
        </View>
      </View>
    </Modal>
  );
};

// Hook per controllare se mostrare il tutorial
export const useARTutorial = () => {
  const [shouldShow, setShouldShow] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkTutorialStatus();
  }, []);

  const checkTutorialStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem('ar_tutorial_completed');
      const skipped = await AsyncStorage.getItem('ar_tutorial_skipped');
      setShouldShow(!completed && !skipped);
    } catch (error) {
      setShouldShow(true);
    } finally {
      setLoading(false);
    }
  };

  const resetTutorial = async () => {
    try {
      await AsyncStorage.removeItem('ar_tutorial_completed');
      await AsyncStorage.removeItem('ar_tutorial_skipped');
      setShouldShow(true);
    } catch (error) {
      console.log('Error resetting tutorial:', error);
    }
  };

  return { shouldShow, loading, resetTutorial };
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  content: {
    marginHorizontal: 20,
  },
  
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    minWidth: screenWidth - 40,
    maxWidth: screenWidth - 40,
  },
  
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 25,
  },
  
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 25,
  },
  
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#2196F3',
  },
  
  progressText: {
    fontSize: 12,
    color: '#999',
  },
  
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 15,
  },
  
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  
  primaryButton: {
    backgroundColor: '#2196F3',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  
  secondaryButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
  
  skipTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  
  skipButtonText: {
    color: '#666',
    fontSize: 14,
  },
  
  dotsContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  
  activeDot: {
    width: 24,
    backgroundColor: '#2196F3',
  },
  
  completedDot: {
    backgroundColor: 'rgba(76, 175, 80, 0.6)',
  },
  
  targetIndicator: {
    position: 'absolute',
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  
  targetRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#2196F3',
    position: 'absolute',
  },
  
  targetCenter: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2196F3',
  },
  
  infoContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  
  infoText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default ARTutorial;