// File: context/AppContext.js - VERSIONE CORRETTA CON SALVATAGGIO FUNZIONANTE
import React, { createContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
  // Stato principale dell'app
  const [panelsData, setPanelsData] = useState([]);
  const [systemStatus, setSystemStatus] = useState({
    totalProduction: 0,
    efficiency: 0,
    alerts: [],
    aiImpact: {
      analyzedPanels: 0,
      totalEfficiencyLoss: 0,
      economicImpact: 0
    }
  });
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  // Stato per l'analisi AI
  const [aiAnalysisResults, setAiAnalysisResults] = useState({});
  const [lastAnalysisTime, setLastAnalysisTime] = useState(null);

  // 🆕 STATO AR COMPLETO
  const [arSettings, setArSettings] = useState({
    calibrationData: null,
    lastGPSPosition: null,
    showTutorial: true,
    markerDistance: 500,
    enableVibration: true,
    compassOffset: 0,
    gpsAccuracyThreshold: 10, // metri
    panelDetectionRange: { min: 5, max: 500 }, // metri
    lastCalibrationDate: null,
    arPermissions: {
      camera: false,
      location: false,
      sensors: false
    }
  });

  const [arRuntimeData, setArRuntimeData] = useState({
    isActive: false,
    nearbyPanels: [],
    currentLocation: null,
    deviceOrientation: { heading: 0, pitch: 0, roll: 0 },
    gpsAccuracy: null,
    sensorsActive: false
  });

  // 🆕 Ref per tracciare il primo caricamento
  const isFirstLoad = useRef(true);
 
  const forceStorageSave = async () => {
    try {
      // Prima prova a leggere i dati per capire se ci sono problemi
      console.log('🔄 Tentativo di lettura dati dal storage...');
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('📋 Chiavi in storage:', allKeys);
      
      // Salva forzatamente i dati dei pannelli
      if (panelsData.length > 0) {
        console.log('🔄 Salvataggio forzato dei pannelli:', panelsData.length);
        const jsonData = JSON.stringify(panelsData);
        await AsyncStorage.setItem('panelsData', jsonData);
        
        // Verifica che il salvataggio sia avvenuto correttamente
        const savedData = await AsyncStorage.getItem('panelsData');
        const parsedData = JSON.parse(savedData);
        console.log('✅ Pannelli salvati con successo:', parsedData.length);
        
        // Aggiorna anche lo stato del sistema
        calculateSystemStatus();
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Errore durante il salvataggio forzato:', error);
      return false;
    }
  };
  
  // Carica i dati salvati all'avvio dell'app
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Carica i pannelli salvati dall'utente
        const savedPanelsData = await AsyncStorage.getItem('panelsData');
        if (savedPanelsData) {
          const panels = JSON.parse(savedPanelsData);
          const panelsWithDefaults = panels.map(panel => initializePanelWithDefaults(panel));
          setPanelsData(panelsWithDefaults);
        }

        // Carica le info utente se presente
        const savedUser = await AsyncStorage.getItem('user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
        
        // Carica i dati delle analisi AI precedenti
        const savedAnalysis = await AsyncStorage.getItem('aiAnalysisData');
        if (savedAnalysis) {
          const { results, timestamp } = JSON.parse(savedAnalysis);
          setAiAnalysisResults(results);
          setLastAnalysisTime(timestamp);
        }

        // 🆕 CARICA IMPOSTAZIONI AR
        const savedArSettings = await AsyncStorage.getItem('arSettings');
        if (savedArSettings) {
          const arData = JSON.parse(savedArSettings);
          setArSettings(prevSettings => ({
            ...prevSettings,
            ...arData
          }));
        }

        setLoading(false);
        
      } catch (error) {
        console.error('Errore nel caricamento dati:', error);
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // 🆕 NUOVO useEffect per salvare automaticamente quando panelsData cambia
  useEffect(() => {
    // Skip il primo render e quando loading è true
    if (isFirstLoad.current || loading) {
      isFirstLoad.current = false;
      return;
    }
    
    // Salva solo se ci sono pannelli
    if (panelsData.length > 0) {
      const saveData = async () => {
        try {
          await AsyncStorage.setItem('panelsData', JSON.stringify(panelsData));
          console.log('✅ Pannelli salvati automaticamente:', panelsData.length);
          calculateSystemStatus();
        } catch (error) {
          console.error('❌ Errore nel salvataggio automatico:', error);
        }
      };
      saveData();
    }
  }, [panelsData, loading]);

  // 🆕 SALVA IMPOSTAZIONI AR QUANDO CAMBIANO
  useEffect(() => {
    const saveArSettings = async () => {
      try {
        await AsyncStorage.setItem('arSettings', JSON.stringify(arSettings));
      } catch (error) {
        console.error('Errore nel salvataggio impostazioni AR:', error);
      }
    };

    if (!loading) {
      saveArSettings();
    }
  }, [arSettings, loading]);

  // 🔧 FUNZIONE PER INIZIALIZZARE PANNELLO CON VALORI DEFAULT
  const initializePanelWithDefaults = (panel) => {
    if (!panel.baseEfficiency) {
      panel.baseEfficiency = panel.efficiency || 95;
    }
    
    // 🆕 AGGIUNGI COMPATIBILITÀ AR
    const hasGPS = panel.location && panel.location.lat && panel.location.lon;
    
    return {
      ...panel,
      alerts: panel.alerts || [],
      performanceHistory: panel.performanceHistory || [],
      currentProduction: panel.currentProduction || Math.round(panel.capacity * 0.75),
      efficiency: panel.efficiency || panel.baseEfficiency || 95,
      status: panel.status || 'optimal',
      // Campi AI
      aiAnalysisDate: panel.aiAnalysisDate || null,
      aiHealthScore: panel.aiHealthScore || null,
      aiCondition: panel.aiCondition || null,
      aiConfidence: panel.aiConfidence || null,
      // 🆕 CAMPI AR
      arCompatible: hasGPS,
      arLastSeen: panel.arLastSeen || null,
      arDistance: panel.arDistance || null
    };
  };

  // 📊 FUNZIONE PER CALCOLARE LO STATO DEL SISTEMA (AGGIORNATA)
  const calculateSystemStatus = () => {
    if (panelsData.length === 0) {
      setSystemStatus({
        totalProduction: 0,
        efficiency: 0,
        alerts: [],
        aiImpact: {
          analyzedPanels: 0,
          totalEfficiencyLoss: 0,
          economicImpact: 0
        }
      });
      return;
    }

    let totalProd = 0;
    let totalEfficiency = 0;
    let activeAlerts = [];
    
    // 🤖 Calcoli per l'impatto AI
    let analyzedPanels = 0;
    let totalEfficiencyLoss = 0;
    let economicImpact = 0;

    panelsData.forEach(panel => {
      totalProd += panel.currentProduction || 0;
      totalEfficiency += panel.efficiency || 0;
      
      // Conta pannelli analizzati dall'AI
      if (panel.aiAnalysisDate) {
        analyzedPanels++;
        
        const baseEff = panel.baseEfficiency || panel.efficiency;
        const currentEff = panel.efficiency;
        const efficiencyLoss = Math.max(0, baseEff - currentEff);
        totalEfficiencyLoss += efficiencyLoss;
        
        const yearlyLoss = (panel.capacity / 1000) * (efficiencyLoss / 100) * 1460 * 0.25;
        economicImpact += yearlyLoss;
      }
      
      if (panel.alerts && panel.alerts.length > 0) {
        activeAlerts = [...activeAlerts, ...panel.alerts.map(alert => ({
          ...alert,
          panelId: panel.id,
          panelName: panel.name
        }))];
      }
    });

    const avgEfficiency = panelsData.length > 0 && totalEfficiency > 0 ? 
      (totalEfficiency / panelsData.length) : 0;

    // Sort alerts by priority and date
    activeAlerts.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.severity] || 1;
      const bPriority = priorityOrder[b.severity] || 1;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return new Date(b.date) - new Date(a.date);
    });

    setSystemStatus({
      totalProduction: totalProd,
      efficiency: avgEfficiency,
      alerts: activeAlerts,
      aiImpact: {
        analyzedPanels,
        totalEfficiencyLoss: Math.round(totalEfficiencyLoss * 10) / 10,
        economicImpact: Math.round(economicImpact * 100) / 100
      }
    });
  };

  // 🔧 FUNZIONE HELPER PER CHIAMARE MANUALMENTE IL CALCOLO DELLO STATO
  const updateSystemStatusManually = () => {
    calculateSystemStatus();
  };

  // 🔧 FUNZIONE HELPER PER SALVARE I PANNELLI MANUALMENTE (MODIFICATA)
  const savePanelsDataManually = async (dataToSave = null) => {
    const data = dataToSave || panelsData;
    if (data.length > 0) {
      try {
        const jsonData = JSON.stringify(data);
        await AsyncStorage.setItem('panelsData', jsonData);
        console.log('✅ Pannelli salvati manualmente:', data.length);
        calculateSystemStatus();
        return true;
      } catch (error) {
        console.error('❌ Errore nel salvataggio pannelli:', error);
        return false;
      }
    }
    return false;
  };

  // 🆕 ===== FUNZIONI AR COMPLETE =====

  // Aggiorna impostazioni AR
  const updateARSettings = (newSettings) => {
    setArSettings(prevSettings => ({
      ...prevSettings,
      ...newSettings
    }));
  };

  // Salva calibrazione AR
  const saveARCalibration = (calibrationData) => {
    const calibrationWithTimestamp = {
      ...calibrationData,
      timestamp: new Date().toISOString(),
      deviceId: 'default' // Potrebbe essere utile per multi-device
    };

    setArSettings(prevSettings => ({
      ...prevSettings,
      calibrationData: calibrationWithTimestamp,
      lastCalibrationDate: new Date().toISOString()
    }));
  };

  // Ottieni pannelli compatibili con AR
  const getARCompatiblePanels = () => {
    return panelsData.filter(panel => 
      panel.arCompatible && 
      panel.location && 
      panel.location.lat && 
      panel.location.lon
    );
  };

  // Ottieni pannelli nelle vicinanze per AR
  const getNearbyPanelsForAR = (userLocation, maxDistance = null) => {
    const distance = maxDistance || arSettings.markerDistance;
    const compatiblePanels = getARCompatiblePanels();

    if (!userLocation) return [];

    return compatiblePanels.map(panel => {
      // Calcola distanza (formula Haversine semplificata)
      const R = 6371e3; // raggio Terra in metri
      const φ1 = userLocation.latitude * Math.PI / 180;
      const φ2 = panel.location.lat * Math.PI / 180;
      const Δφ = (panel.location.lat - userLocation.latitude) * Math.PI / 180;
      const Δλ = (panel.location.lon - userLocation.longitude) * Math.PI / 180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distanceInMeters = R * c;

      return {
        ...panel,
        arDistance: Math.round(distanceInMeters),
        isNearby: distanceInMeters <= distance
      };
    }).filter(panel => panel.isNearby);
  };

  // Aggiorna runtime data AR
  const updateARRuntimeData = (newData) => {
    setArRuntimeData(prevData => ({
      ...prevData,
      ...newData
    }));
  };

  // Attiva/disattiva modalità AR
  const setARActive = (isActive) => {
    setArRuntimeData(prevData => ({
      ...prevData,
      isActive
    }));
  };

  // Aggiorna posizione utente per AR
  const updateARUserLocation = (location) => {
    setArRuntimeData(prevData => ({
      ...prevData,
      currentLocation: location
    }));

    // Aggiorna pannelli nelle vicinanze
    const nearbyPanels = getNearbyPanelsForAR(location);
    setArRuntimeData(prevData => ({
      ...prevData,
      nearbyPanels
    }));

    // Salva ultima posizione GPS
    setArSettings(prevSettings => ({
      ...prevSettings,
      lastGPSPosition: {
        ...location,
        timestamp: new Date().toISOString()
      }
    }));
  };

  // Aggiorna orientamento dispositivo
  const updateARDeviceOrientation = (orientation) => {
    // Applica offset compass se presente
    const adjustedOrientation = {
      ...orientation,
      heading: (orientation.heading + arSettings.compassOffset) % 360
    };

    setArRuntimeData(prevData => ({
      ...prevData,
      deviceOrientation: adjustedOrientation
    }));
  };

  // Reset tutorial AR
  const resetARTutorial = async () => {
    try {
      await AsyncStorage.removeItem('ar_tutorial_completed');
      await AsyncStorage.removeItem('ar_tutorial_skipped');
      setArSettings(prevSettings => ({
        ...prevSettings,
        showTutorial: true
      }));
    } catch (error) {
      console.error('Errore nel reset tutorial AR:', error);
    }
  };

  // Ottieni statistiche AR
  const getARStatistics = () => {
    const compatiblePanels = getARCompatiblePanels();
    const totalPanels = panelsData.length;
    const compatibilityPercentage = totalPanels > 0 ? 
      Math.round((compatiblePanels.length / totalPanels) * 100) : 0;

    return {
      totalPanels,
      arCompatiblePanels: compatiblePanels.length,
      compatibilityPercentage,
      lastCalibration: arSettings.lastCalibrationDate,
      hasCalibration: !!arSettings.calibrationData,
      nearbyPanelsCount: arRuntimeData.nearbyPanels.length,
      isARActive: arRuntimeData.isActive
    };
  };

  // 🔄 FUNZIONE PER AGGIORNARE PANNELLO CON RISULTATI AI (MODIFICATA)
  const updatePanelWithAIResults = (panelId, aiResults) => {
    setPanelsData(prevPanels => {
      const newPanels = prevPanels.map(panel => {
        if (panel.id === panelId) {
          const efficiencyReduction = aiResults.efficiencyImpact?.efficiencyReduction || 0;
          const baseEfficiency = panel.baseEfficiency || panel.efficiency;
          const newEfficiency = Math.max(30, Math.round(baseEfficiency - efficiencyReduction));
          
          const newStatus = mapConditionToStatus(aiResults.condition);
          const efficiencyRatio = newEfficiency / baseEfficiency;
          const newProduction = Math.round((panel.capacity * efficiencyRatio * 0.75));
          
          const updatedPanel = {
            ...panel,
            baseEfficiency: baseEfficiency,
            efficiency: newEfficiency,
            currentProduction: newProduction,
            status: newStatus,
            lastInspection: new Date().toISOString(),
            aiAnalysisDate: new Date().toISOString(),
            aiHealthScore: aiResults.healthScore,
            aiCondition: aiResults.condition,
            aiConfidence: aiResults.confidence
          };
          
          return updatedPanel;
        }
        return panel;
      });
      
      // Salvataggio non necessario qui grazie al useEffect
      return newPanels;
    });
  };

  // Funzioni esistenti (mantenute)
  const mapConditionToStatus = (condition) => {
    switch (condition) {
      case 'optimal': return 'optimal';
      case 'dust_accumulated': return 'needs_cleaning';
      case 'discoloration': return 'needs_inspection';
      case 'micro_cracks': 
      case 'severe_degradation': 
      default: return 'issue';
    }
  };

  // MODIFICATA: updatePanelData
  const updatePanelData = (panelId, newData) => {
    setPanelsData(prevPanels => {
      const newPanels = prevPanels.map(panel => {
        if (panel.id === panelId) {
          const updatedPanel = { ...panel, ...newData };
          
          if (updatedPanel.alerts) {
            updatedPanel.alerts = updatedPanel.alerts.map(alert => ({
              ...alert,
              id: alert.id || `alert_${Date.now()}_${Math.random()}`,
              date: alert.date || new Date().toISOString(),
              source: alert.source || 'unknown'
            }));
          }
          
          return updatedPanel;
        }
        return panel;
      });
      
      // Salvataggio non necessario qui grazie al useEffect
      return newPanels;
    });
  };

  // MODIFICATA: addAlertToPanel
  const addAlertToPanel = (panelId, alert) => {
    const alertWithDefaults = {
      id: `alert_${Date.now()}_${Math.random()}`,
      date: new Date().toISOString(),
      source: 'system',
      ...alert
    };

    setPanelsData(prevPanels => {
      const newPanels = prevPanels.map(panel => {
        if (panel.id === panelId) {
          const currentAlerts = panel.alerts || [];
          return {
            ...panel,
            alerts: [alertWithDefaults, ...currentAlerts]
          };
        }
        return panel;
      });
      
      // Salvataggio non necessario qui grazie al useEffect
      return newPanels;
    });
  };

  // MODIFICATA: removeAlertFromPanel
  const removeAlertFromPanel = (panelId, alertId) => {
    setPanelsData(prevPanels => {
      const newPanels = prevPanels.map(panel => {
        if (panel.id === panelId && panel.alerts) {
          return {
            ...panel,
            alerts: panel.alerts.filter(alert => alert.id !== alertId)
          };
        }
        return panel;
      });
      
      // Salvataggio non necessario qui grazie al useEffect
      return newPanels;
    });
  };

  // MODIFICATA: clearAIAlertsFromPanel
  const clearAIAlertsFromPanel = (panelId) => {
    setPanelsData(prevPanels => {
      const newPanels = prevPanels.map(panel => {
        if (panel.id === panelId && panel.alerts) {
          return {
            ...panel,
            alerts: panel.alerts.filter(alert => alert.source !== 'computer_vision')
          };
        }
        return panel;
      });
      
      // Salvataggio non necessario qui grazie al useEffect
      return newPanels;
    });
  };
  
  const checkStorageStatus = async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('📋 Tutte le chiavi in AsyncStorage:', allKeys);
      
      if (allKeys.includes('panelsData')) {
        const panelsDataStr = await AsyncStorage.getItem('panelsData');
        const panelsDataObj = JSON.parse(panelsDataStr);
        console.log('📊 Dati pannelli in storage:', panelsDataObj.length);
        console.log('📊 Dati pannelli in memoria:', panelsData.length);
      } else {
        console.log('❌ Nessun dato pannelli trovato in AsyncStorage');
      }
      
      return allKeys.includes('panelsData');
    } catch (error) {
      console.error('Errore durante il controllo dello storage:', error);
      return false;
    }
  };

  // MODIFICATA: addPanel
  const addPanel = (newPanel) => {
    const panelWithDefaults = initializePanelWithDefaults({
      ...newPanel,
      id: Date.now().toString(),
      alerts: [],
      performanceHistory: [],
      currentProduction: Math.round(newPanel.capacity * 0.75),
      efficiency: newPanel.efficiency || 95,
      baseEfficiency: newPanel.efficiency || 95,
      status: 'optimal'
    });
    
    setPanelsData(prevPanels => {
      const newPanels = [...prevPanels, panelWithDefaults];
      // Salvataggio non necessario qui grazie al useEffect
      return newPanels;
    });
  };

  // MODIFICATA: removePanel
  const removePanel = (panelId) => {
    setPanelsData(prevPanels => {
      const newPanels = prevPanels.filter(panel => panel.id !== panelId);
      // Salvataggio non necessario qui grazie al useEffect
      return newPanels;
    });
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      setUser(null);
    } catch (error) {
      console.error('Errore durante il logout:', error);
    }
  };
  
  const saveAnalysisResults = (panelId, results) => {
    setAiAnalysisResults(prev => ({
      ...prev,
      [panelId]: results
    }));
    
    const timestamp = new Date().toISOString();
    setLastAnalysisTime(timestamp);
    
    try {
      const newResults = {
        ...aiAnalysisResults,
        [panelId]: results
      };
      
      const analysisData = {
        results: newResults,
        timestamp: timestamp
      };
      
      AsyncStorage.setItem('aiAnalysisData', JSON.stringify(analysisData));
    } catch (error) {
      console.error('Errore nel salvataggio dell\'analisi:', error);
    }
  };
  
  const getCachedAnalysis = (panelId) => {
    return aiAnalysisResults[panelId] || null;
  };

  const getSystemStatistics = () => {
    const totalPanels = panelsData.length;
    
    if (totalPanels === 0) {
      return {
        totalPanels: 0,
        totalAlerts: 0,
        aiAlerts: 0,
        statusCounts: { optimal: 0, needs_cleaning: 0, needs_inspection: 0, issue: 0 },
        avgEfficiency: 0
      };
    }

    const totalAlerts = panelsData.reduce((sum, panel) => sum + (panel.alerts?.length || 0), 0);
    const aiAlerts = panelsData.reduce((sum, panel) => {
      const aiCount = panel.alerts ? panel.alerts.filter(alert => alert.source === 'computer_vision').length : 0;
      return sum + aiCount;
    }, 0);
    
    const statusCounts = panelsData.reduce((counts, panel) => {
      const status = panel.status || 'optimal';
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {});

    const avgEfficiency = panelsData.reduce((sum, panel) => sum + (panel.efficiency || 0), 0) / totalPanels;

    return {
      totalPanels,
      totalAlerts,
      aiAlerts,
      statusCounts,
      avgEfficiency: Math.round(avgEfficiency)
    };
  };

  // 🎯 CONTEXT VALUE COMPLETO CON AR
  const contextValue = {
    // Stato base
    panelsData,
    setPanelsData,
    systemStatus,
    weatherData,
    setWeatherData,
    loading,
    user,
    checkStorageStatus,
    
    // Funzioni base
    updatePanelData,
    addPanel,
    removePanel,
    setUser,
    logout,
    
    // Alert management
    addAlertToPanel,
    removeAlertFromPanel,
    clearAIAlertsFromPanel,
    
    // AI Analysis
    aiAnalysisResults,
    lastAnalysisTime,
    saveAnalysisResults,
    getCachedAnalysis,
    updatePanelWithAIResults,
    
    // Statistics
    getSystemStatistics,
    
    // 🔧 FUNZIONI HELPER PER EVITARE LOOP
    updateSystemStatusManually,
    savePanelsDataManually,

    // 🆕 AR FUNCTIONS COMPLETE
    arSettings,
    arRuntimeData,
    updateARSettings,
    saveARCalibration,
    getARCompatiblePanels,
    getNearbyPanelsForAR,
    updateARRuntimeData,
    setARActive,
    updateARUserLocation,
    updateARDeviceOrientation,
    resetARTutorial,
    getARStatistics
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};