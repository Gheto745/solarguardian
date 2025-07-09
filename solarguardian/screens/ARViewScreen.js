// File: screens/ARViewScreen.js - Aggiornato con simulazione pannelli
import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Vibration, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Magnetometer, Accelerometer } from 'expo-sensors';

// Context & Services
import { AppContext } from '../context/AppContext';
import ARService from '../services/ARService';

// Componenti
import AROverlay from '../components/AROverlay';
import ARPanelMarker from '../components/ARPanelMarker';
import ARPanelSimulator from '../components/ARPanelSimulator';

const ARViewScreen = ({ navigation, route }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const { 
    panelsData, 
    arSettings,
    arRuntimeData,
    updateARRuntimeData,
    updateARUserLocation,
    updateARDeviceOrientation
  } = useContext(AppContext);
  
  // AR Service
  const [arService] = useState(() => new ARService());
  
  // Stati per AR 
  const [userLocation, setUserLocation] = useState(null);
  const [deviceOrientation, setDeviceOrientation] = useState({
    heading: 0, pitch: 0, roll: 0
  });
  const [sensorsReady, setSensorsReady] = useState(false);
  const [visiblePanels, setVisiblePanels] = useState([]);
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [trackingQuality, setTrackingQuality] = useState(null);
  
  // Stato simulazione pannelli
  const [simulationMode, setSimulationMode] = useState(false);
  const [simulatedPanels, setSimulatedPanels] = useState([]);
  
  // Location watcher
  const locationWatcherId = useRef(null);
  
  // Inizializza sensori AR
  useEffect(() => {
    if (!permission) {
      requestPermission();
    } else if (permission.granted) {
      initializeSensors();
    }
    
    return () => cleanupSensors();
  }, [permission]);
  
  // Aggiorna pannelli visibili quando cambiano posizione e orientamento
  useEffect(() => {
    if (userLocation && sensorsReady && scanning) {
      updateVisiblePanels();
    }
  }, [userLocation, deviceOrientation, scanning]);
  
  // Sincronizza con AppContext
  useEffect(() => {
    if (userLocation) {
      updateARUserLocation(userLocation);
    }
    
    if (sensorsReady) {
      updateARRuntimeData({
        isActive: scanning,
        deviceOrientation,
        sensorsActive: sensorsReady,
        gpsAccuracy: userLocation?.accuracy || null
      });
    }
  }, [userLocation, deviceOrientation, sensorsReady, scanning]);

  const initializeSensors = async () => {
    try {
      console.log('🚀 Inizializzazione sensori AR...');
      
      // 1. GPS con monitoraggio continuo
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        // Prima posizione immediata
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        
        const locationData = {
          latitude: initialLocation.coords.latitude,
          longitude: initialLocation.coords.longitude,
          accuracy: initialLocation.coords.accuracy,
          altitude: initialLocation.coords.altitude,
          timestamp: new Date().toISOString()
        };
        
        setUserLocation(locationData);
        
        // Avvia monitoraggio continuo
        locationWatcherId.current = await Location.watchPositionAsync(
          { 
            accuracy: Location.Accuracy.High,
            distanceInterval: 1, // Aggiorna ogni metro
            timeInterval: 1000   // Massimo un aggiornamento al secondo
          },
          (location) => {
            const newLocationData = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              accuracy: location.coords.accuracy,
              altitude: location.coords.altitude,
              timestamp: new Date().toISOString()
            };
            
            setUserLocation(newLocationData);
          }
        );
        
        console.log('📍 GPS attivo e monitoraggio avviato');
      }
      
      // 2. MAGNETOMETER (Compass/Heading)
      const magnetometerAvailable = await Magnetometer.isAvailableAsync();
      if (magnetometerAvailable) {
        Magnetometer.setUpdateInterval(100);
        const magnetometerSubscription = Magnetometer.addListener((data) => {
          const heading = Math.atan2(data.y, data.x) * (180 / Math.PI);
          const normalizedHeading = (heading + 360) % 360;
          
          // Applica offset di calibrazione se presente
          const calibratedHeading = (normalizedHeading + (arSettings.compassOffset || 0)) % 360;
          
          setDeviceOrientation(prev => ({
            ...prev,
            heading: calibratedHeading
          }));
        });
        
        window.magnetometerSubscription = magnetometerSubscription;
        console.log('🧭 Magnetometer attivo');
      }
      
      // 3. ACCELEROMETER (Pitch & Roll)  
      const accelerometerAvailable = await Accelerometer.isAvailableAsync();
      if (accelerometerAvailable) {
        Accelerometer.setUpdateInterval(100);
        const accelerometerSubscription = Accelerometer.addListener((data) => {
          const pitch = Math.atan2(-data.x, Math.sqrt(data.y * data.y + data.z * data.z)) * (180 / Math.PI);
          const roll = Math.atan2(data.y, data.z) * (180 / Math.PI);
          
          setDeviceOrientation(prev => ({
            ...prev,
            pitch: pitch,
            roll: roll
          }));
        });
        
        window.accelerometerSubscription = accelerometerSubscription;
        console.log('📐 Accelerometer attivo');
      }
      
      // Tutti i sensori inizializzati
      setSensorsReady(true);
      console.log('✅ Sensori AR pronti!');
      
      // Avvia scanning automaticamente se specificato nei parametri
      if (route.params?.autoScan) {
        setTimeout(() => setScanning(true), 1000);
      }
      
    } catch (error) {
      console.error('❌ Errore inizializzazione sensori:', error);
      Alert.alert(
        'Errore Sensori', 
        'Impossibile inizializzare i sensori AR. Riprova più tardi.'
      );
    }
  };

  const cleanupSensors = () => {
    // Ferma la scansione
    setScanning(false);
    
    // Pulisci le sottoscrizioni ai sensori
    if (window.magnetometerSubscription) {
      window.magnetometerSubscription.remove();
    }
    if (window.accelerometerSubscription) {
      window.accelerometerSubscription.remove();
    }
    
    // Ferma il monitoraggio della posizione
    if (locationWatcherId.current) {
      locationWatcherId.current.remove();
    }
    
    console.log('🧹 Sensori AR puliti');
  };

  const updateVisiblePanels = () => {
    // Nessun aggiornamento se non stiamo scansionando
    if (!scanning) return;
    
    // Ottieni pannelli vicini dal contesto
    const nearbyPanels = panelsData.filter(panel => {
      if (!panel.location || !panel.location.lat || !panel.location.lon) {
        return false;
      }
      
      // Calcola distanza
      const distance = arService.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        panel.location.lat,
        panel.location.lon
      );
      
      // Controlla se è nel range di visibilità
      return distance <= arSettings.panelDetectionRange.max;
    });
    
    // Usa l'arService per calcolare quali pannelli sono visibili
    const visiblePanelsWithPosition = arService.getVisiblePanels(
      userLocation,
      nearbyPanels,
      deviceOrientation.heading,
      deviceOrientation.pitch
    );
    
    // Imposta i pannelli visibili
    setVisiblePanels(visiblePanelsWithPosition);
    
    // Verifica la qualità del tracking
    const trackingQualityInfo = arService.getTrackingQuality(
      userLocation, 
      visiblePanelsWithPosition
    );
    setTrackingQuality(trackingQualityInfo);
    
    // Feedback aptico se abilitato nelle impostazioni e ci sono pannelli visibili
    if (arSettings.enableVibration && visiblePanelsWithPosition.length > 0) {
      // Vibrazione breve solo al primo rilevamento
      if (visiblePanels.length === 0) {
        if (Platform.OS === 'ios') {
          // Vibrazione leggera per iOS
          Vibration.vibrate([0, 30]);
        } else {
          // Vibrazione normale per Android
          Vibration.vibrate(50);
        }
      }
    }
  };

  // Avvia/interrompe la scansione AR
  const toggleScanning = () => {
    setScanning(prevScanning => !prevScanning);
  };

  // Gestisce la selezione di un pannello
  const handlePanelSelect = (panel) => {
    setSelectedPanel(panel);
    
    // Feedback aptico
    if (arSettings.enableVibration) {
      if (Platform.OS === 'ios') {
        Vibration.vibrate([0, 60]);
      } else {
        Vibration.vibrate(80);
      }
    }
  };

  // Avvia la modalità simulazione
  const startSimulationMode = () => {
    // Verifica che i sensori siano pronti
    if (!sensorsReady || !userLocation) {
      Alert.alert(
        'Impossibile avviare simulazione',
        'Assicurati che GPS e sensori siano attivi e calibrati.'
      );
      return;
    }
    
    // Ferma la scansione se attiva
    if (scanning) {
      setScanning(false);
    }
    
    // Attiva modalità simulazione
    setSimulationMode(true);
  };

  // Salva un pannello simulato
  const savePanelSimulation = (panelData) => {
    // Crea nuovo pannello con i dati simulati
    const newSimulatedPanel = {
      id: `sim_${Date.now()}`,
      name: `Pannello simulato ${simulatedPanels.length + 1}`,
      type: panelData.type,
      capacity: panelData.estimatedPower,
      status: 'optimal',
      efficiency: 100,
      currentProduction: Math.round(panelData.estimatedPower * 0.8), // Stima
      location: {
        lat: userLocation.latitude,
        lon: userLocation.longitude
      },
      installationAngle: panelData.rotation,
      installationType: 'simulated',
      arCompatible: true,
      arSimulated: true,
      arData: panelData
    };
    
    // Aggiunge alla lista dei pannelli simulati
    setSimulatedPanels(prev => [...prev, newSimulatedPanel]);
    
    // Disattiva modalità simulazione
    setSimulationMode(false);
    
    // Riavvia la scansione
    setTimeout(() => setScanning(true), 500);
    
    // Notifica
    Alert.alert(
      'Simulazione salvata',
      `Nuovo pannello simulato aggiunto: ${newSimulatedPanel.name}`,
      [{ text: 'OK' }]
    );
  };

  // Annulla la simulazione
  const cancelSimulation = () => {
    setSimulationMode(false);
    
    // Riavvia la scansione
    setTimeout(() => setScanning(true), 500);
  };

  // Rendering in base ai permessi
  if (!permission) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff' }}>Caricamento permessi camera...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff', marginBottom: 20 }}>❌ Camera non disponibile</Text>
        <TouchableOpacity 
          onPress={requestPermission}
          style={{ backgroundColor: '#2196F3', padding: 15, borderRadius: 8, marginBottom: 10 }}
        >
          <Text style={{ color: '#fff' }}>Concedi Permessi</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: '#2196F3' }}>Torna indietro</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* 📷 CAMERA REALE */}
      <CameraView style={{ flex: 1 }} facing="back" />
      
      {/* 🎯 OVERLAY AR - POSIZIONAMENTO ASSOLUTO */}
      <SafeAreaView style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'box-none'
      }}>
        {/* Header */}
        <View style={{ 
          padding: 15, 
          backgroundColor: 'rgba(0,0,0,0.7)',
          pointerEvents: 'auto'
        }}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 18, marginLeft: 10 }}>🔥 AR Scanner LIVE</Text>
          </TouchableOpacity>
        </View>
        
        {/* 📊 STATUS SENSORI */}
        <View style={{ 
          position: 'absolute',
          top: 80,
          left: 15,
          right: 15,
          backgroundColor: 'rgba(0,0,0,0.8)',
          padding: 10,
          borderRadius: 8,
          pointerEvents: 'none'
        }}>
          <Text style={{ color: '#fff', fontSize: 12, textAlign: 'center' }}>
            📍 GPS: {userLocation ? `${userLocation.accuracy.toFixed(1)}m` : '⏳'} | 
            🧭 Heading: {Math.round(deviceOrientation.heading)}° | 
            🔧 Sensori: {sensorsReady ? '✅' : '⏳'}
          </Text>
          {userLocation && (
            <Text style={{ color: '#ccc', fontSize: 10, textAlign: 'center', marginTop: 5 }}>
              {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
            </Text>
          )}
        </View>
        
        {/* Overlay AR con elementi comuni */}
        <AROverlay 
          isScanning={scanning}
          deviceOrientation={deviceOrientation}
          panelCount={visiblePanels.length + simulatedPanels.length}
          trackingQuality={trackingQuality}
        >
          {/* Visualizza pannelli rilevati solo se scanning attivo */}
          {scanning && visiblePanels.map((panel, index) => (
            <ARPanelMarker
              key={`panel-${panel.id}`}
              panel={panel}
              position={{
                x: panel.arPosition.x,
                y: panel.arPosition.y
              }}
              distance={panel.arPosition.distance}
              confidence={panel.arPosition.confidence}
              bearing={panel.arPosition.bearing}
              isSelected={selectedPanel?.id === panel.id}
              onPress={handlePanelSelect}
              animationDelay={index * 100}
            />
          ))}
          
          {/* Visualizza pannelli simulati */}
          {scanning && simulatedPanels.map((panel, index) => (
            <ARPanelMarker
              key={`sim-panel-${panel.id}`}
              panel={panel}
              position={{
                x: panel.arData.position.x,
                y: panel.arData.position.y
              }}
              distance={10} // Valore fisso per i pannelli simulati
              confidence={0.9} // Alta confidenza per i pannelli simulati
              isSelected={selectedPanel?.id === panel.id}
              onPress={handlePanelSelect}
              animationDelay={index * 100}
            />
          ))}
        </AROverlay>
        
        {/* Componente simulatore pannelli (visibile solo in modalità simulazione) */}
        {simulationMode && (
          <ARPanelSimulator
            onSave={savePanelSimulation}
            onCancel={cancelSimulation}
            onPosition={(data) => console.log('Pannello posizionato:', data)}
            deviceOrientation={deviceOrientation}
            userLocation={userLocation}
          />
        )}
        
        {/* Pulsanti azione */}
        <View style={{ 
          position: 'absolute',
          bottom: 30,
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        }}>
          {/* Pulsante scansione principale */}
          <TouchableOpacity 
            style={{
              backgroundColor: scanning ? '#F44336' : '#4CAF50',
              width: 70,
              height: 70,
              borderRadius: 35,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
            }}
            onPress={toggleScanning}
          >
            <Ionicons 
              name={scanning ? 'stop' : 'scan'} 
              size={30} 
              color="#fff" 
            />
          </TouchableOpacity>
          
          {/* Pulsante simulazione (visibile solo se non in modalità simulazione) */}
          {!simulationMode && (
            <TouchableOpacity 
              style={{
                backgroundColor: '#673AB7',
                width: 50,
                height: 50,
                borderRadius: 25,
                justifyContent: 'center',
                alignItems: 'center',
                position: 'absolute',
                right: 20,
                bottom: 10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 5,
              }}
              onPress={startSimulationMode}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Status Bottom */}
        <View style={{ 
          position: 'absolute', 
          bottom: 120, 
          alignSelf: 'center',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: 15,
          borderRadius: 8,
          pointerEvents: 'none'
        }}>
          <Text style={{ color: '#fff', textAlign: 'center' }}>
            {scanning ? '🚀 AR SCANNER ATTIVO' : (simulationMode ? '🏗️ MODALITÀ SIMULAZIONE' : '⏳ Scanner in pausa...')}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default ARViewScreen;