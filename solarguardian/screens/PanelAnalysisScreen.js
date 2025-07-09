// File: screens/PanelAnalysisScreen.js - CORRETTO
import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, BarChart } from 'react-native-chart-kit';

// Context & Services
import { AppContext } from '../context/AppContext';
import SolarAnalysisService from '../services/SolarAnalysisService';
import WeatherService from '../services/WeatherService';

// Utility per la sanitizzazione dei dati dei grafici
import { sanitizeChartData, hasInvalidChartData, createSafeChartData } from '../utils/chartUtils';

const screenWidth = Dimensions.get('window').width;

const PanelAnalysisScreen = ({ navigation, route }) => {
  console.log('🔄 PanelAnalysisScreen: Rendering con parametri:', route.params);
  const { panelsData } = useContext(AppContext);
  const { panelId } = route.params;
  console.log('🔍 PanelAnalysisScreen: panelId =', panelId, 'panelsData.length =', panelsData?.length);
  
  // States
  const [loading, setLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState(null);
  const [rateLimitError, setRateLimitError] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [panel, setPanel] = useState(null);
  const [loadAttempts, setLoadAttempts] = useState(0);
  
  // Services
  const [analysisService] = useState(() => new SolarAnalysisService());
  const [weatherService] = useState(() => WeatherService);
  
  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const loadingTimeoutRef = useRef(null);
  const isLoadingData = useRef(false);

  // Funzione per verificare se l'analisi è valida
  const isAnalysisValid = (analysis) => {
    if (!analysis) return false;
    
    // Verifica che le sezioni principali esistano
    const hasDegradation = analysis.degradation && 
                          typeof analysis.degradation.currentEfficiency === 'number';
    
    const hasOrientation = analysis.orientation && 
                          analysis.orientation.optimalOrientation;
    
    const hasEnvironmental = analysis.environmentalFactors;
    
    const hasWeather = analysis.weatherData && 
                      analysis.weatherData.current &&
                      typeof analysis.weatherData.current.temperature === 'number';
    
    console.log('🔍 Validazione analisi:', { 
      hasDegradation, 
      hasOrientation, 
      hasEnvironmental, 
      hasWeather 
    });
    
    return hasDegradation && hasOrientation && hasEnvironmental && hasWeather;
  };

  const getPanelProblemDescription = (analysisData, panel) => {
    const problems = [];
    
    // Se non ci sono dati di analisi, non possiamo trovare problemi
    if (!analysisData) return problems;
    
    // 1. Verifica orientamento non ottimale
    if (panel && panel.location && panel.location.orientation) {
      const currentOrientation = panel.location.orientation;
      const optimalOrientation = analysisData.orientation?.optimalOrientation || 'Sud';
      
      if (currentOrientation !== optimalOrientation) {
        // Calcola la percentuale di miglioramento basata sulla differenza di orientamento
        const orientationMap = {
          'Nord': { rank: 0 },
          'Nord-Est': { rank: 1 },
          'Est': { rank: 2 },
          'Sud-Est': { rank: 3 },
          'Sud': { rank: 4 },
          'Sud-Ovest': { rank: 3 },
          'Ovest': { rank: 2 },
          'Nord-Ovest': { rank: 1 }
        };
        
        const currentRank = orientationMap[currentOrientation]?.rank || 0;
        const optimalRank = orientationMap[optimalOrientation]?.rank || 4;
        const rankDifference = Math.abs(currentRank - optimalRank);
        
        // Determina la gravità del problema
        const severity = rankDifference >= 3 ? 'grave' : 
                         rankDifference >= 2 ? 'moderato' : 'lieve';
        
        // Stima della perdita di produzione
        const productionLoss = rankDifference * 8; // Circa 8% per livello di differenza
        
        problems.push({
          type: 'orientation',
          severity: severity,
          title: 'Orientamento non ottimale',
          description: `L'orientamento ${currentOrientation} riduce la produzione di circa ${productionLoss}% rispetto all'orientamento ottimale ${optimalOrientation}. Considerare un riposizionamento se possibile.`
        });
      }
    }
    
    // 2. Verifica l'efficienza
    const panelEfficiency = panel?.efficiency || analysisData.degradation?.currentEfficiency;
    const optimalEfficiency = 95; // Valore standard per pannelli moderni
    
    if (panelEfficiency && panelEfficiency < optimalEfficiency) {
      const efficiencyLoss = optimalEfficiency - panelEfficiency;
      
      // Determina la gravità del problema
      const severity = efficiencyLoss >= 15 ? 'grave' : 
                       efficiencyLoss >= 8 ? 'moderato' : 'lieve';
      
      problems.push({
        type: 'efficiency',
        severity: severity,
        title: 'Efficienza ridotta',
        description: `L'efficienza del pannello è al ${panelEfficiency}%, ${efficiencyLoss}% sotto il valore ottimale. Questo può essere causato da degradazione naturale, accumulo di sporco o danni al pannello.`
      });
    }
    
    // 3. Verifica accumulo di polvere
    if (analysisData.environmentalFactors?.dustAccumulation > 0.2) {
      const dustLevel = analysisData.environmentalFactors.dustAccumulation;
      
      // Determina la gravità del problema
      const severity = dustLevel >= 0.5 ? 'grave' : 
                       dustLevel >= 0.3 ? 'moderato' : 'lieve';
      
      // Stima della perdita di produzione
      const productionLoss = Math.round(dustLevel * 100 * 0.8); // Circa 0.8% per ogni % di polvere
      
      problems.push({
        type: 'dust',
        severity: severity,
        title: 'Accumulo di polvere',
        description: `È stato rilevato un accumulo di polvere (livello ${(dustLevel * 100).toFixed(0)}%) che riduce l'efficienza di circa ${productionLoss}%. Si consiglia di pulire il pannello per ripristinare la piena efficienza.`
      });
    }
    
    // 4. Verifica temperature elevate
    if (analysisData.weatherData?.current?.temperature > 30) {
      const currentTemp = analysisData.weatherData.current.temperature;
      
      // Determina la gravità del problema
      const severity = currentTemp >= 40 ? 'grave' : 
                       currentTemp >= 35 ? 'moderato' : 'lieve';
      
      // Stima della perdita di efficienza
      // I pannelli perdono circa 0.5% di efficienza per ogni grado sopra i 25°C
      const efficiencyLoss = Math.round((currentTemp - 25) * 0.5);
      
      if (efficiencyLoss > 3) { // Solo se la perdita è significativa
        problems.push({
          type: 'temperature',
          severity: severity,
          title: 'Temperatura elevata',
          description: `La temperatura attuale di ${currentTemp}°C riduce l'efficienza di circa ${efficiencyLoss}%. Le prestazioni miglioreranno con temperature più basse. Se possibile, migliorare la ventilazione posteriore del pannello.`
        });
      }
    }
    
    // 5. Verifica umidità elevata
    if (analysisData.environmentalFactors?.humidityImpact > 0.3) {
      const humidityImpact = analysisData.environmentalFactors.humidityImpact;
      
      // Determina la gravità del problema
      const severity = humidityImpact >= 0.5 ? 'grave' : 
                       humidityImpact >= 0.4 ? 'moderato' : 'lieve';
      
      problems.push({
        type: 'humidity',
        severity: severity,
        title: 'Umidità elevata',
        description: `L'elevata umidità ambientale (impatto: ${(humidityImpact * 100).toFixed(0)}%) può ridurre le prestazioni e accelerare la degradazione dei componenti. Monitorare eventuali segni di corrosione nei connettori.`
      });
    }
    
    // 6. Verifica età del pannello
    if (panel && panel.installationDate) {
      const installDate = new Date(panel.installationDate);
      const now = new Date();
      const ageInYears = (now - installDate) / (1000 * 60 * 60 * 24 * 365.25);
      
      if (ageInYears > 10) {
        // Determina la gravità del problema
        const severity = ageInYears >= 20 ? 'grave' : 
                         ageInYears >= 15 ? 'moderato' : 'lieve';
        
        // Stima della degradazione naturale
        // I pannelli perdono circa 0.5-1% di efficienza all'anno
        const naturalDegradation = Math.round(ageInYears * 0.7);
        
        problems.push({
          type: 'age',
          severity: severity,
          title: 'Pannello datato',
          description: `Il pannello è in funzione da circa ${Math.floor(ageInYears)} anni. La degradazione naturale ha ridotto l'efficienza di circa ${naturalDegradation}%. Considerare la sostituzione nei prossimi anni per migliorare significativamente le prestazioni.`
        });
      }
    }
    
    // 7. Verifica ombreggiamento (se disponibile)
    if (analysisData.environmentalFactors?.shading > 0.1) {
      const shadingImpact = analysisData.environmentalFactors.shading;
      
      // Determina la gravità del problema
      const severity = shadingImpact >= 0.3 ? 'grave' : 
                       shadingImpact >= 0.2 ? 'moderato' : 'lieve';
      
      // Stima della perdita di produzione
      // L'ombreggiamento ha un impatto non lineare sulla produzione
      const productionLoss = Math.round(shadingImpact * 100 * 1.5); // Fattore 1.5x per rappresentare l'effetto non lineare
      
      problems.push({
        type: 'shading',
        severity: severity,
        title: 'Ombreggiamento rilevato',
        description: `È stato rilevato un ombreggiamento parziale (${(shadingImpact * 100).toFixed(0)}%) che riduce la produzione di circa ${productionLoss}%. Verificare la presenza di ostacoli o crescita di vegetazione nelle vicinanze del pannello.`
      });
    }
    
    // Se non sono stati rilevati problemi ma l'efficienza non è al 100%,
    // aggiungiamo un elemento informativo di base
    if (problems.length === 0 && panelEfficiency && panelEfficiency < 100) {
      problems.push({
        type: 'info',
        severity: 'info',
        title: 'Funzionamento normale',
        description: `Il pannello funziona con un'efficienza del ${panelEfficiency}%, che è nella norma per questa tipologia. La normale degradazione nel tempo è fisiologica e non richiede interventi.`
      });
    }
    
    return problems;
  };

  // Funzione per calcolare il miglioramento in base all'orientamento
  const calculateOrientationImprovement = (currentOrientation, optimalOrientation) => {
    // Mappa di miglioramento percentuale basata sulla differenza di orientamento
    const improvementMap = {
      'Nord': { 'Sud': 38, 'Sud-Est': 32, 'Sud-Ovest': 32, 'Est': 25, 'Ovest': 25 },
      'Nord-Est': { 'Sud': 30, 'Sud-Est': 20, 'Sud-Ovest': 28, 'Est': 15, 'Ovest': 22 },
      'Nord-Ovest': { 'Sud': 30, 'Sud-Est': 28, 'Sud-Ovest': 20, 'Est': 22, 'Ovest': 15 },
      'Est': { 'Sud': 20, 'Sud-Est': 10, 'Sud-Ovest': 18, 'Ovest': 15 },
      'Ovest': { 'Sud': 20, 'Sud-Est': 18, 'Sud-Ovest': 10, 'Est': 15 },
      'Sud-Est': { 'Sud': 8, 'Sud-Ovest': 12, 'Est': 8, 'Ovest': 15 },
      'Sud-Ovest': { 'Sud': 8, 'Sud-Est': 12, 'Est': 15, 'Ovest': 8 },
      'Sud': { 'Sud-Est': 5, 'Sud-Ovest': 5, 'Est': 12, 'Ovest': 12 }
    };

    // Se entrambi gli orientamenti sono validi e c'è un miglioramento definito, restituiscilo
    if (currentOrientation && optimalOrientation && 
        improvementMap[currentOrientation] && 
        improvementMap[currentOrientation][optimalOrientation]) {
      return improvementMap[currentOrientation][optimalOrientation];
    }
    
    // Valore predefinito se non è possibile calcolare
    return 15;
  };

  // Funzione per calcolare il miglioramento della produzione
  const calculateProductionImprovement = (panel) => {
    if (!panel || !analysisData || !analysisData.orientation) return 0;
    
    const baseCapacity = panel.capacity || 350; // W
    const efficiency = panel.efficiency || 95; // %
    const improvement = calculateOrientationImprovement(
      panel.location?.orientation, 
      analysisData.orientation.optimalOrientation
    ) / 100;
    
    // Calcola la produzione annuale stimata (kWh)
    const dailyProduction = (baseCapacity / 1000) * (efficiency / 100) * 5; // 5 ore equivalenti
    const annualProduction = dailyProduction * 365;
    
    // Calcola il miglioramento
    return Math.round(annualProduction * improvement * 10) / 10;
  };

  // Funzione per calcolare il beneficio economico
  const calculateEconomicBenefit = (panel) => {
    const productionImprovement = calculateProductionImprovement(panel);
    const kWhPrice = 0.25; // €/kWh
    
    return Math.round(productionImprovement * kWhPrice * 100) / 100;
  };

  const loadAnalysisData = async (panelData) => {
    // Previeni ricaricamenti multipli
    if (isLoadingData.current) {
      console.log('⚠️ Caricamento già in corso, ignoro questa richiesta');
      return;
    }
    
    isLoadingData.current = true;
    
    try {
      console.log('⏳ Inizio caricamento analisi per pannello:', panelData.name);
      setLoading(true);
      setError(null);
      setRateLimitError(false);
      
      if (!panelData) {
        console.log('❌ Dati pannello non disponibili');
        setError('Dati del pannello non disponibili');
        setLoading(false);
        isLoadingData.current = false;
        return;
      }

      // Ottieni dati meteo
      console.log('🌤️ Richiesta dati meteo per', panelData.location.lat, panelData.location.lon);
      const weatherData = await weatherService.getSolarWeatherData(
        panelData.location.lat, 
        panelData.location.lon
      );
      console.log('🌤️ Dati meteo dettagliati:', JSON.stringify({
        temp: weatherData.current.temperature,
        irradiance: weatherData.current.solarIrradiance,
        humidity: weatherData.current.humidity,
        condition: weatherData.current.currentCondition,
        hasForecast: Array.isArray(weatherData.forecast) && weatherData.forecast.length > 0
      }));
      
      // Esegui analisi predittiva con dati meteo
      const analysis = await analysisService.analyzePanelWithRealData(panelData);
      
      // Assicurati che i dati di degradazione siano sempre definiti
      if (!analysis.degradation || analysis.degradation.currentEfficiency === undefined) {
        console.log('⚠️ Dati di degradazione mancanti, utilizzo valori predefiniti');
        analysis.degradation = {
          currentEfficiency: panelData.efficiency || 90,
          efficiencyDifference: panelData.baseEfficiency ? (panelData.baseEfficiency - panelData.efficiency) : 5,
          state: panelData.status || 'optimal',
          efficiencyIn5Years: Math.max(70, (panelData.efficiency || 90) - 10),
          next12Months: {
            efficiency: Math.max(85, (panelData.efficiency || 90) - 2)
          }
        };
      }
      
      // Genera dati di produzione per orientamento se non presenti
      if (!analysis.orientation || !analysis.orientation.predictions || analysis.orientation.predictions.length === 0) {
        console.log('⚠️ Dati di orientamento mancanti, generazione dati predefiniti');
        // Produzioni relative basate sull'orientamento (Sud = 100%)
        const orientationProductions = {
          'Sud': 1.0,
          'Sud-Est': 0.92,
          'Est': 0.75,
          'Sud-Ovest': 0.92,
          'Ovest': 0.75,
          'Nord': 0.5,
          'Nord-Est': 0.6,
          'Nord-Ovest': 0.6
        };
        
        // Capacità base del pannello in kW
        const baseCapacity = panelData.capacity / 1000 || 0.35;
        const baseEfficiency = panelData.efficiency / 100 || 0.9;
        const basePeakHours = 5; // Ore di sole picco equivalenti
        const baseProduction = baseCapacity * baseEfficiency * basePeakHours;
        
        // Inizializza l'oggetto orientation se mancante
        if (!analysis.orientation) {
          analysis.orientation = {
            currentOrientation: panelData.location?.orientation || 'Sud',
            optimalOrientation: 'Sud',
            percentageDifference: 0,
            productionDifference: 0,
            economicBenefit: 0
          };
        }
        
        // Se l'orientamento attuale è diverso da quello ottimale, calcola le differenze
        if (panelData.location?.orientation && panelData.location.orientation !== 'Sud') {
          const currentFactor = orientationProductions[panelData.location.orientation] || 0.8;
          const optimalFactor = orientationProductions['Sud'] || 1.0;
          const percentageDiff = Math.round((optimalFactor / currentFactor - 1) * 100);
          
          analysis.orientation.percentageDifference = percentageDiff;
          analysis.orientation.productionDifference = Math.round(baseProduction * (optimalFactor - currentFactor) * 365 * 10) / 10;
          analysis.orientation.economicBenefit = Math.round(analysis.orientation.productionDifference * 0.25 * 10) / 10;
        }
        
        // Crea previsioni per i vari orientamenti
        analysis.orientation.predictions = Object.entries(orientationProductions).map(([orientation, factor]) => ({
          orientation,
          totalProduction: Math.round(baseProduction * factor * 100) / 100,
          averageEfficiency: Math.round(baseEfficiency * factor * 100)
        }));
      }
      
      // Assicurati che environmentalFactors esista
      if (!analysis.environmentalFactors) {
        console.log('⚠️ Dati ambientali mancanti, utilizzo valori predefiniti');
        analysis.environmentalFactors = {
          dustAccumulation: 0.2,
          humidityImpact: 0.15,
          shading: 0.05
        };
      }
      
      // Assicurati che weatherData.current sia sempre valido
      if (!analysis.weatherData || !analysis.weatherData.current) {
        console.log('⚠️ Dati meteo mancanti nell\'analisi, utilizzo dati dalla richiesta');
        analysis.weatherData = weatherData;
      }
      
      // Calcola lo stato di degradazione
      const degradationResults = analysis.degradation;
      console.log('✅ Degradazione:', {
        efficiency: degradationResults.currentEfficiency,
        loss: degradationResults.efficiencyDifference
      });
      
      // Imposta stato
      setAnalysisData(analysis);
      setLastUpdate(new Date().toISOString());
      
      // Esegui animazione fade-in
      console.log('🔄 Avvio animazione fade-in');
      fadeAnim.setValue(0); // Reset dell'animazione
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }).start((finished) => {
        console.log('✅ Animazione completata:', finished);
      });
      
      // Imposta loading a false solo dopo che tutto è stato configurato
      setLoading(false);
      
    } catch (error) {
      console.error('Errore durante analisi:', error);
      
      // Gestisci specificamente errori di rate limit
      if (error.response && error.response.status === 429) {
        setRateLimitError(true);
      } else {
        setError('Impossibile completare l\'analisi. Riprova più tardi.');
      }
      
      setLoading(false);
    } finally {
      isLoadingData.current = false;
      setLoadAttempts(prev => prev + 1);
    }
  };

  // Previeni loop infiniti nell'useEffect di validazione
  useEffect(() => {
    if (panel && analysisData && !isAnalysisValid(analysisData) && loadAttempts < 3) {
      console.log('⚠️ Analisi non valida, ricaricamento... (tentativo ' + (loadAttempts + 1) + ')');
      if (!isLoadingData.current) {
        loadAnalysisData(panel);
      }
    }
  }, [analysisData, panel, loadAttempts]);

  // Carica i dati iniziali quando il componente viene montato
  useEffect(() => {
    // Cerca il pannello corrispondente all'ID
    const currentPanel = panelsData.find(p => p.id === panelId);
    if (currentPanel) {
      console.log('🔍 Pannello trovato:', currentPanel.name);
      setPanel(currentPanel);
      
      // Resetta i tentativi e ricarica i dati
      setLoadAttempts(0);
      loadAnalysisData(currentPanel);
    } else {
      console.log('❌ Pannello non trovato con ID:', panelId);
      setError('Pannello non trovato');
      setLoading(false);
    }
    
    // Cancella il timeout quando il componente viene smontato
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [panelId, panelsData]);

  // Log di debug per il rendering
  console.log('🔄 RENDER - Stato componente:', {
    panelExists: !!panel,
    analysisExists: !!analysisData,
    isLoading: loading,
    hasError: !!error || !!rateLimitError,
    loadAttempts
  });

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analisi Predittiva AI</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#673AB7" />
          <Text style={styles.loadingText}>Analisi del pannello in corso...</Text>
          <Text style={styles.loadingSubtext}>Stiamo elaborando i dati meteorologici e le prestazioni storiche</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error || rateLimitError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analisi Predittiva AI</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={60} color="#F44336" />
          <Text style={styles.errorText}>
            {rateLimitError 
              ? "Hai raggiunto il limite di richieste API. Riprova tra qualche minuto." 
              : error}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setLoadAttempts(0);
              panel && loadAnalysisData(panel);
            }}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Verifica che panel e analysisData esistano prima di renderizzare
  if (!panel || !analysisData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analisi Predittiva AI</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="information-circle" size={60} color="#2196F3" />
          <Text style={styles.errorText}>
            Dati non disponibili. Prova a ricaricare.
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setLoadAttempts(0);
              const currentPanel = panelsData.find(p => p.id === panelId);
              if (currentPanel) {
                setPanel(currentPanel);
                loadAnalysisData(currentPanel);
              }
            }}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Ricarica</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analisi Predittiva AI</Text>
        <TouchableOpacity 
          onPress={() => {
            setLoadAttempts(0);
            panel && loadAnalysisData(panel);
          }}
        >
          <Ionicons name="refresh" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.panelHeader}>
          <View style={styles.panelInfo}>
            <Text style={styles.panelName}>{panel.name}</Text>
            <Text style={styles.panelSpecs}>
              {panel.type}, {panel.capacity}W, {panel.location.orientation}
            </Text>
          </View>
          <View style={styles.panelStatus}>
            <View style={[
              styles.statusDot, 
              { backgroundColor: 
                analysisData.degradation.state === 'optimal' ? '#4CAF50' : 
                analysisData.degradation.state === 'needs_cleaning' ? '#FF9800' : '#F44336' 
              }
            ]} />
            <Text style={styles.statusText}>
              {analysisData.degradation.state === 'optimal' ? 'Ottimale' : 
               analysisData.degradation.state === 'needs_cleaning' ? 'Pulizia consigliata' : 'Richiede attenzione'}
            </Text>
          </View>
        </View>
        
        {/* Problems section */}
        {(analysisData && (getPanelProblemDescription(analysisData, panel).length > 0 || panel.location?.orientation !== analysisData.orientation?.optimalOrientation)) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⚠️ Problemi Rilevati</Text>
            {getPanelProblemDescription(analysisData, panel).length > 0 ? (
              getPanelProblemDescription(analysisData, panel).map((problem, index) => (
                <View key={index} style={[
                  styles.problemCard,
                  problem.severity === 'grave' ? styles.severeProblemCard :
                  problem.severity === 'moderato' ? styles.moderateProblemCard :
                  problem.severity === 'lieve' ? styles.mildProblemCard :
                  styles.infoProblemCard
                ]}>
                  <View style={styles.problemHeader}>
                    <Ionicons 
                      name={
                        problem.type === 'orientation' ? 'compass' :
                        problem.type === 'efficiency' ? 'stats-chart' :
                        problem.type === 'dust' ? 'water' :
                        problem.type === 'temperature' ? 'thermometer' :
                        problem.type === 'humidity' ? 'water-outline' :
                        problem.type === 'age' ? 'time' :
                        problem.type === 'shading' ? 'partly-sunny' :
                        'information-circle'
                      } 
                      size={24} 
                      color={
                        problem.severity === 'grave' ? '#D32F2F' :
                        problem.severity === 'moderato' ? '#FF9800' :
                        problem.severity === 'lieve' ? '#FFC107' :
                        '#2196F3'
                      } 
                    />
                    <Text style={[
                      styles.problemTitle,
                      problem.severity === 'grave' ? styles.severeProblemTitle :
                      problem.severity === 'moderato' ? styles.moderateProblemTitle :
                      problem.severity === 'lieve' ? styles.mildProblemTitle :
                      styles.infoProblemTitle
                    ]}>
                      {problem.title}
                    </Text>
                  </View>
                  <Text style={styles.problemDescription}>{problem.description}</Text>
                </View>
              ))
            ) : (
              // Problema predefinito basato sull'orientamento se non ci sono altri problemi
              panel.location?.orientation !== (analysisData.orientation?.optimalOrientation || 'Sud') ? (
                <View style={styles.problemCard}>
                  <View style={styles.problemHeader}>
                    <Ionicons name="compass" size={24} color="#FF9800" />
                    <Text style={styles.problemTitle}>Orientamento non ottimale</Text>
                  </View>
                  <Text style={styles.problemDescription}>
                    L'orientamento attuale ({panel.location?.orientation}) non è ottimale. L'orientamento {analysisData.orientation?.optimalOrientation || 'Sud'} garantisce la massima esposizione solare durante il giorno.
                  </Text>
                </View>
              ) : (
                <View style={styles.infoProblemCard}>
                  <View style={styles.problemHeader}>
                    <Ionicons name="sunny" size={24} color="#4CAF50" />
                    <Text style={styles.infoProblemTitle}>Nessun problema critico</Text>
                  </View>
                  <Text style={styles.problemDescription}>
                    Il pannello è in buone condizioni di funzionamento. Continua con la manutenzione regolare per mantenere l'efficienza ottimale.
                  </Text>
                </View>
              )
            )}
          </View>
        )}
       
        
        {/* Degradation analysis */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Analisi Degradazione</Text>
          
          <View style={styles.pieContainer}>
            <PieChart
              data={sanitizeChartData([
                {
                  name: 'Efficienza',
                  value: panel.efficiency || analysisData.degradation.currentEfficiency || 90,
                  color: '#4CAF50',
                  legendFontColor: '#333',
                  legendFontSize: 12,
                },
                {
                  name: 'Perdita',
                  value: 100 - (panel.efficiency || analysisData.degradation.currentEfficiency || 90),
                  color: '#F44336',
                  legendFontColor: '#333',
                  legendFontSize: 12,
                }
              ])}
              width={screenWidth - 60}
              height={180}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="value"
              backgroundColor="transparent"
              paddingLeft="10"
              absolute
            />
          </View>
          
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {(panel.efficiency || analysisData.degradation.currentEfficiency || 90)}%
              </Text>
              <Text style={styles.statLabel}>Efficienza Attuale</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {100 - (panel.efficiency || analysisData.degradation.currentEfficiency || 90)}%
              </Text>
              <Text style={styles.statLabel}>Perdita</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {analysisData.degradation.next12Months?.efficiency || 
                  Math.max(85, (panel.efficiency || 90) - 2)}%
              </Text>
              <Text style={styles.statLabel}>Previsione 12 mesi</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {analysisData.degradation.efficiencyIn5Years || 
                  Math.max(70, (panel.efficiency || 90) - 10)}%
              </Text>
              <Text style={styles.statLabel}>Previsione 5 anni</Text>
            </View>
          </View>
        </View>
        
        {/* Orientation analysis */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🧭 Analisi Orientamento</Text>
          
          <View style={styles.orientationContainer}>
            <View style={styles.orientationItem}>
              <Text style={styles.orientationLabel}>Orientamento Attuale</Text>
              <Text style={styles.orientationValue}>{panel.location?.orientation || analysisData.orientation.currentOrientation}</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#666" />
            <View style={styles.orientationItem}>
              <Text style={styles.orientationLabel}>Orientamento Ottimale</Text>
              <Text style={styles.orientationValue}>{analysisData.orientation.optimalOrientation}</Text>
            </View>
          </View>
          
          <View style={styles.improvementBox}>
            <Text style={styles.improvementTitle}>Potenziale Miglioramento</Text>
            {panel.location?.orientation !== analysisData.orientation.optimalOrientation ? (
              <>
                <Text style={styles.improvementValue}>
                  +{analysisData.orientation.percentageDifference > 0 ? 
                    analysisData.orientation.percentageDifference : 
                    calculateOrientationImprovement(panel.location?.orientation, analysisData.orientation.optimalOrientation)}%
                </Text>
                <Text style={styles.improvementDesc}>
                  Passando da {panel.location?.orientation || 'orientamento attuale'} a {analysisData.orientation.optimalOrientation} 
                  potresti ottenere fino a {analysisData.orientation.productionDifference > 0 ? 
                                          analysisData.orientation.productionDifference : 
                                          calculateProductionImprovement(panel)} kWh in più all'anno
                </Text>
                <Text style={styles.improvementEconomic}>
                  Risparmio economico potenziale: €{analysisData.orientation.economicBenefit > 0 ? 
                                                  analysisData.orientation.economicBenefit : 
                                                  calculateEconomicBenefit(panel)} all'anno
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.improvementValue}>+0%</Text>
                <Text style={styles.improvementDesc}>
                  L'orientamento attuale ({panel.location?.orientation}) è già ottimale.
                </Text>
                <Text style={styles.improvementEconomic}>
                  Risparmio economico potenziale: €0 all'anno
                </Text>
              </>
            )}
          </View>
        </View>
        
        {/* Environmental factors */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🌡️ Fattori Ambientali</Text>
          
          <View style={styles.analysisSection}>
            <View style={styles.factorItem}>
              <Text style={styles.factorLabel}>Temperatura:</Text>
              <View style={styles.factorBar}>
                <View style={[
                  styles.factorBarFill, 
                  { 
                    width: `${(analysisData.weatherData.current.temperature / 40) * 100}%`,
                    backgroundColor: analysisData.weatherData.current.temperature > 30 ? '#F44336' : '#4CAF50'
                  }
                ]} />
              </View>
              <Text style={styles.factorValue}>
                {analysisData.weatherData.current.temperature}°C
              </Text>
            </View>
            
            <View style={styles.factorItem}>
              <Text style={styles.factorLabel}>Umidità:</Text>
              <View style={styles.factorBar}>
                <View style={[
                  styles.factorBarFill, 
                  { 
                    width: `${analysisData.weatherData.current.humidity}%`,
                    backgroundColor: analysisData.weatherData.current.humidity > 80 ? '#F44336' : '#4CAF50'
                  }
                ]} />
              </View>
              <Text style={styles.factorValue}>
                {analysisData.weatherData.current.humidity}%
              </Text>
            </View>
            
            <View style={styles.factorItem}>
              <Text style={styles.factorLabel}>Polvere:</Text>
              <View style={styles.factorBar}>
                <View style={[
                  styles.factorBarFill, 
                  { 
                    width: `${(analysisData.environmentalFactors.dustAccumulation * 100)}%`,
                    backgroundColor: analysisData.environmentalFactors.dustAccumulation > 0.5 ? 
                                 '#F44336' : 
                                 analysisData.environmentalFactors.dustAccumulation > 0.3 ? '#FF9800' : '#4CAF50'
                  }
                ]} />
              </View>
              <Text style={styles.factorValue}>
                {(analysisData.environmentalFactors.dustAccumulation * 100).toFixed(0)}%
              </Text>
            </View>
            
            <View style={styles.factorItem}>
              <Text style={styles.factorLabel}>Impatto Umidità:</Text>
              <View style={styles.factorBar}>
                <View style={[
                  styles.factorBarFill, 
                  { 
                    width: `${(analysisData.environmentalFactors.humidityImpact * 100)}%`,
                    backgroundColor: analysisData.environmentalFactors.humidityImpact > 0.5 ? 
                                 '#F44336' : 
                                 analysisData.environmentalFactors.humidityImpact > 0.4 ? '#FF9800' : '#4CAF50'
                  }
                ]} />
              </View>
              <Text style={styles.factorValue}>
                {(analysisData.environmentalFactors.humidityImpact * 100).toFixed(0)}%
              </Text>
            </View>
            
            <View style={styles.factorItem}>
              <Text style={styles.factorLabel}>Irradianza Solare:</Text>
              <View style={styles.factorBar}>
                <View style={[
                  styles.factorBarFill, 
                  { 
                    width: `${Math.min((analysisData.weatherData.current.solarIrradiance / 1000) * 100, 100)}%`,
                    backgroundColor: '#FF9800'
                  }
                ]} />
              </View>
              <Text style={styles.factorValue}>
                {Math.min(analysisData.weatherData.current.solarIrradiance, 1200)} W/m²
              </Text>
            </View>
          </View>
        </View>
        
        {/* Previsioni Prossimi Giorni */}
        {analysisData?.weatherData?.forecast && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📅 Previsioni Produzione (Prossimi Giorni)</Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.forecastContainer}>
                {analysisData.weatherData.forecast.slice(0, 5).map((day, index) => {
                  const estimatedProduction = ((panel?.capacity || 350) * 
                    (panel?.efficiency || 95) / 100 * 
                    (Math.min(day.solarIrradiance, 1200) / 1000) * 6) / 1000; // kWh stimati
                  
                  return (
                    <View key={index} style={styles.forecastDay}>
                      <Text style={styles.forecastDate}>
                        {new Date(day.date).toLocaleDateString('it-IT', { 
                          day: '2-digit', 
                          month: '2-digit' 
                        })}
                      </Text>
                      
                      <Ionicons 
                        name={
                          day.condition === 'sunny' ? 'sunny' :
                          day.condition === 'cloudy' ? 'cloudy' :
                          day.condition === 'rainy' ? 'rainy' : 'partly-sunny'
                        }
                        size={24} 
                        color={
                          day.condition === 'sunny' ? '#FF9800' :
                          day.condition === 'cloudy' ? '#9E9E9E' :
                          day.condition === 'rainy' ? '#64B5F6' : '#FFB74D'
                        }
                      />
                      
                      <Text style={styles.forecastTemp}>
                        {day.temperature ? `${day.temperature}°C` : ''}
                      </Text>
                      
                      <Text style={styles.forecastProduction}>
                        {estimatedProduction.toFixed(1)} kWh
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}
        
        {/* Recommendations */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💡 Raccomandazioni</Text>
          
          {analysisData.recommendations && analysisData.recommendations.length > 0 ? (
            analysisData.recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Ionicons 
                  name={
                    rec.priority === 'high' ? 'warning' :
                    rec.priority === 'medium' ? 'alert-circle' : 'information-circle'
                  }
                  size={22}
                  color={
                    rec.priority === 'high' ? '#F44336' :
                    rec.priority === 'medium' ? '#FF9800' : '#2196F3'
                  }
                />
                <Text style={styles.recommendationText}>
                  <Text style={{ fontWeight: 'bold' }}>{rec.title}:</Text> {rec.description}
                  {rec.estimatedImpact ? ` Impatto stimato: ${rec.estimatedImpact}` : ''}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ textAlign: 'center', color: '#666', padding: 10 }}>
              Nessuna raccomandazione attualmente disponibile
            </Text>
          )}
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Questa analisi è stata generata utilizzando algoritmi di intelligenza artificiale
          </Text>
          <Text style={styles.footerSubtext}>
            Ultimo aggiornamento: {new Date(lastUpdate).toLocaleString('it-IT')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Error
  errorIcon: {
    width: 80,
    height: 80,
    tintColor: '#F44336',
    marginBottom: 15,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 15,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Error States
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 20,
    lineHeight: 22,
  },
  
  // Panel Header
  panelHeader: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  panelInfo: {
    flex: 1,
  },
  panelName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  panelSpecs: {
    fontSize: 14,
    color: '#666',
  },
  panelStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  
  // Cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  
  // Problem Card
  problemCard: {
    backgroundColor: '#FFF8F7',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#F44336',
  },
  problemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  problemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginLeft: 10,
  },
  problemDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  
  // Pie Chart
  pieContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  
  // Stat Rows
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  
  // Orientation Section
  orientationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
  },
  orientationItem: {
    alignItems: 'center',
  },
  orientationLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  orientationValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  improvementBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 15,
    marginTop: 5,
  },
  improvementTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 5,
    textAlign: 'center',
  },
  improvementValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 10,
  },
  improvementDesc: {
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 18,
  },
  improvementEconomic: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2E7D32',
    textAlign: 'center',
  },
  
  // Analysis Section
  analysisSection: {
    marginTop: 10,
  },
  analysisSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  factorLabel: {
    fontSize: 14,
    color: '#666',
    width: 120,
  },
  factorBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  factorBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  factorValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    width: 60,
    textAlign: 'right',
  },
  
  // Forecast
  forecastContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
  forecastDay: {
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 5,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    minWidth: 80,
  },
  forecastDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  forecastTemp: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginTop: 8,
  },
  forecastProduction: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 4,
  },
  
  // Recommendations
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
    lineHeight: 20,
  },
  
  // Footer
  footer: {
    alignItems: 'center',
    padding: 20,
    marginTop: 10,
  },
  footerText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  footerSubtext: {
    fontSize: 10,
    color: '#bbb',
    textAlign: 'center',
    marginTop: 4,
  },
  // Stili per differenziare i livelli di gravità dei problemi
  severeProblemCard: {
    backgroundColor: '#FFEBEE',
    borderLeftColor: '#D32F2F',
  },
  moderateProblemCard: {
    backgroundColor: '#FFF3E0',
    borderLeftColor: '#FF9800',
  },
  mildProblemCard: {
    backgroundColor: '#FFF8E1',
    borderLeftColor: '#FFC107',
  },
  infoProblemCard: {
    backgroundColor: '#E3F2FD',
    borderLeftColor: '#2196F3',
  },
  severeProblemTitle: {
    color: '#D32F2F',
  },
  moderateProblemTitle: {
    color: '#F57C00',
  },
  mildProblemTitle: {
    color: '#FFA000',
  },
  infoProblemTitle: {
    color: '#1976D2',
  },
});

export default PanelAnalysisScreen;