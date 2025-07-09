// File: components/ARPanelSimulator.js
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  PanResponder,
  Dimensions,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ARPanelSimulator = ({ 
  onSave,
  onCancel,
  onPosition,
  deviceOrientation = { heading: 0, pitch: 0, roll: 0 },
  userLocation = null
}) => {
  // Stati per il pannello virtuale
  const [panelPosition, setPanelPosition] = useState({ 
    x: screenWidth / 2 - 100, 
    y: screenHeight / 2 - 100 
  });
  const [panelSize, setPanelSize] = useState({ width: 200, height: 120 });
  const [panelRotation, setPanelRotation] = useState(0);
  const [isPanelPlaced, setIsPanelPlaced] = useState(false);
  const [panelType, setPanelType] = useState('monocristallino'); // 'monocristallino', 'policristallino', 'thinFilm'
  const [estimatedPower, setEstimatedPower] = useState(300); // Watt stimati
  
  // Animations
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0.7)).current;
  
  // Gestione del pannello con drag
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isPanelPlaced,
      onMoveShouldSetPanResponder: () => !isPanelPlaced,
      onPanResponderGrant: () => {
        // Effetto quando inizia il drag
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1.05,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.9,
            duration: 200,
            useNativeDriver: true,
          })
        ]).start();
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!isPanelPlaced) {
          setPanelPosition({
            x: panelPosition.x + gestureState.dx,
            y: panelPosition.y + gestureState.dy,
          });
        }
      },
      onPanResponderRelease: () => {
        // Effetto quando finisce il drag
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.8,
            duration: 200,
            useNativeDriver: true,
          })
        ]).start();
      }
    })
  ).current;

  // Inizializzazione animazioni
  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.8,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Aggiorna la potenza stimata in base al tipo e dimensioni
  useEffect(() => {
    // Fattori di efficienza per tipo di pannello
    const efficiencyFactors = {
      monocristallino: 0.22, // 22% efficienza
      policristallino: 0.18, // 18% efficienza
      thinFilm: 0.12,        // 12% efficienza
    };
    
    // Area del pannello in m² (stima basata su dimensioni UI)
    const panelArea = (panelSize.width / 100) * (panelSize.height / 100);
    
    // Formula: Area (m²) * 1000 W/m² * efficienza
    const estimatedWatts = Math.round(panelArea * 1000 * efficiencyFactors[panelType]);
    
    setEstimatedPower(estimatedWatts);
  }, [panelType, panelSize]);

  // Ruota il pannello
  const rotatePanel = () => {
    setPanelRotation((prevRotation) => (prevRotation + 15) % 360);
  };

  // Cambia il tipo di pannello
  const changePanelType = () => {
    const types = ['monocristallino', 'policristallino', 'thinFilm'];
    const currentIndex = types.indexOf(panelType);
    const nextIndex = (currentIndex + 1) % types.length;
    setPanelType(types[nextIndex]);
  };

  // Cambia dimensione del pannello
  const resizePanel = (bigger = true) => {
    setPanelSize(prevSize => ({
      width: Math.max(100, Math.min(400, prevSize.width + (bigger ? 20 : -20))),
      height: Math.max(60, Math.min(240, prevSize.height + (bigger ? 12 : -12))),
    }));
  };

  // Fissa il pannello nella posizione attuale
  const placePanel = () => {
    setIsPanelPlaced(true);
    
    // Animazione conferma
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
    
    // Notifica il posizionamento (per calcoli geospaziali)
    if (onPosition) {
      const panelData = {
        position: panelPosition,
        size: panelSize,
        rotation: panelRotation,
        type: panelType,
        estimatedPower,
        deviceOrientation,
        userLocation,
        timestamp: new Date().toISOString()
      };
      
      onPosition(panelData);
    }
  };

  // Ripristina il posizionamento
  const resetPanel = () => {
    setIsPanelPlaced(false);
    Animated.timing(opacityAnim, {
      toValue: 0.8,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };
  
  // Conferma e salva il pannello simulato
  const savePanel = () => {
    if (!isPanelPlaced) {
      Alert.alert('Posizionamento richiesto', 'Posiziona e fissa il pannello prima di salvare.');
      return;
    }
    
    const panelData = {
      position: panelPosition,
      size: panelSize,
      rotation: panelRotation,
      type: panelType,
      estimatedPower,
      deviceOrientation,
      userLocation,
      timestamp: new Date().toISOString()
    };
    
    if (onSave) {
      onSave(panelData);
    }
  };
  
  // Ritorna il colore in base al tipo di pannello
  const getPanelColor = (type) => {
    switch (type) {
      case 'monocristallino': return '#1a2940'; // Blu scuro
      case 'policristallino': return '#2c4a7e'; // Blu medio
      case 'thinFilm': return '#444444';        // Grigio scuro
      default: return '#1a2940';
    }
  };
  
  // Ritorna il nome visualizzato del tipo di pannello
  const getPanelTypeName = (type) => {
    switch (type) {
      case 'monocristallino': return 'Monocristallino';
      case 'policristallino': return 'Policristallino';
      case 'thinFilm': return 'Film Sottile';
      default: return 'Monocristallino';
    }
  };

  return (
    <View style={styles.container}>
      {/* Pannello solare virtuale */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.virtualPanel,
          {
            left: panelPosition.x,
            top: panelPosition.y,
            width: panelSize.width,
            height: panelSize.height,
            backgroundColor: getPanelColor(panelType),
            transform: [
              { scale: scaleAnim },
              { rotate: `${panelRotation}deg` }
            ],
            opacity: opacityAnim,
            borderWidth: isPanelPlaced ? 2 : 1,
            borderColor: isPanelPlaced ? '#4CAF50' : 'rgba(255,255,255,0.5)'
          }
        ]}
      >
        {/* Griglia celle del pannello */}
        {panelType !== 'thinFilm' && (
          <View style={styles.panelGrid}>
            {Array(6).fill().map((_, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.panelRow}>
                {Array(10).fill().map((_, colIndex) => (
                  <View 
                    key={`cell-${rowIndex}-${colIndex}`} 
                    style={[
                      styles.panelCell,
                      panelType === 'policristallino' && styles.polyCell
                    ]} 
                  />
                ))}
              </View>
            ))}
          </View>
        )}
        
        {/* Indicatore di energia stimata */}
        <View style={styles.powerIndicator}>
          <Text style={styles.powerText}>{estimatedPower}W</Text>
        </View>
      </Animated.View>
      
      {/* Pannello di controllo */}
      <View style={styles.controlPanel}>
        <Text style={styles.controlTitle}>Simulazione Pannello Solare</Text>
        
        {/* Tipo di pannello */}
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Tipo:</Text>
          <TouchableOpacity style={styles.controlButton} onPress={changePanelType}>
            <Text style={styles.controlButtonText}>{getPanelTypeName(panelType)}</Text>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {/* Dimensioni */}
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Dimensioni:</Text>
          <View style={styles.controlButtonGroup}>
            <TouchableOpacity 
              style={[styles.smallButton, styles.iconButton]} 
              onPress={() => resizePanel(false)}
            >
              <Ionicons name="remove" size={18} color="#fff" />
            </TouchableOpacity>
            
            <Text style={styles.sizeText}>
              {Math.round(panelSize.width/2)}×{Math.round(panelSize.height/2)}cm
            </Text>
            
            <TouchableOpacity 
              style={[styles.smallButton, styles.iconButton]} 
              onPress={() => resizePanel(true)}
            >
              <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Rotazione */}
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Rotazione:</Text>
          <TouchableOpacity 
            style={[styles.controlButton, styles.iconButton]} 
            onPress={rotatePanel}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.controlButtonText}>{panelRotation}°</Text>
          </TouchableOpacity>
        </View>
        
        {/* Potenza stimata */}
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Potenza stimata:</Text>
          <View style={styles.powerBadge}>
            <Ionicons name="flash" size={16} color="#FFC107" />
            <Text style={styles.powerBadgeText}>{estimatedPower}W</Text>
          </View>
        </View>
        
        {/* Azioni */}
        <View style={styles.actionButtons}>
          {!isPanelPlaced ? (
            <TouchableOpacity style={styles.placeButton} onPress={placePanel}>
              <Ionicons name="pin" size={20} color="#fff" />
              <Text style={styles.placeButtonText}>Fissa posizione</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.resetButton} onPress={resetPanel}>
                <Text style={styles.buttonText}>Ripristina</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.saveButton} onPress={savePanel}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.buttonText}>Salva pannello</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        
        {/* Pulsante Annulla */}
        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={onCancel}
        >
          <Text style={styles.cancelButtonText}>Annulla</Text>
        </TouchableOpacity>
      </View>
      
      {/* Istruzioni */}
      {!isPanelPlaced && (
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            Trascina il pannello nella posizione desiderata
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  
  // Pannello Virtuale
  virtualPanel: {
    position: 'absolute',
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  panelGrid: {
    flex: 1,
    flexDirection: 'column',
  },
  panelRow: {
    flex: 1,
    flexDirection: 'row',
  },
  panelCell: {
    flex: 1,
    margin: 1,
    backgroundColor: '#0a1e38',
  },
  polyCell: {
    backgroundColor: '#193766',
  },
  powerIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  powerText: {
    color: '#FFC107',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Pannello di controllo
  controlPanel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 12,
    padding: 15,
  },
  controlTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  controlLabel: {
    color: '#ccc',
    fontSize: 14,
  },
  controlButton: {
    backgroundColor: 'rgba(33,150,243,0.7)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 14,
    marginRight: 4,
  },
  controlButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(33,150,243,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeText: {
    color: '#fff',
    fontSize: 14,
    marginHorizontal: 8,
  },
  powerBadge: {
    backgroundColor: 'rgba(76,175,80,0.7)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  powerBadgeText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  
  // Pulsanti azione
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  placeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  resetButton: {
    backgroundColor: '#FF9800',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  cancelButton: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    color: '#F44336',
    fontSize: 14,
  },
  
  // Istruzioni
  instructions: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#fff',
    fontSize: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
});

export default ARPanelSimulator;