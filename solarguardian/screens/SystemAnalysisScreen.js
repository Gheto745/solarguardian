// File: screens/SystemAnalysisScreen.js
import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';

// Context
import { AppContext } from '../context/AppContext';

// Servizio di analisi
import SolarAnalysisService from '../services/SolarAnalysisService';

const screenWidth = Dimensions.get('window').width;

const SystemAnalysisScreen = ({ navigation }) => {
  const { panelsData, aiAnalysisResults, lastAnalysisTime } = useContext(AppContext);
  
  const [loading, setLoading] = useState(true);
  const [systemAnalysis, setSystemAnalysis] = useState(null);
  const [error, setError] = useState(null);

   // Processa i risultati esistenti nella cache
  const processExistingResults = () => {
    console.log('🔄 Inizio processExistingResults');
  try  {
      const analysisService = new SolarAnalysisService();
      
      // Estrai i risultati individuali dei pannelli
      const panelResults = panelsData.map(panel => {
        const analysis = aiAnalysisResults[panel.id];
        if (!analysis) return null;
        
        return {
          panelId: panel.id,
          panelName: panel.name,
          degradation: analysis.degradation,
          orientation: analysis.orientation
        };
      }).filter(result => result !== null);
      
      if (panelResults.length === 0) {
        // Se non abbiamo risultati validi, esegui una nuova analisi
        analyzeSystem();
        return;
      }
      
      // Calcola le statistiche di sistema
      const systemStats = analysisService.calculateSystemStats(panelResults);
      
      // Aggiorna lo stato
      setSystemAnalysis({
        panelResults,
        systemStats,
        lastUpdateTime: lastAnalysisTime
      });
      
      setLoading(false);
      console.log('✅ processExistingResults completato con successo');
    } catch (error) {
       console.error('❌ Errore in processExistingResults:', error);
      // In caso di errore, prova con una nuova analisi
      analyzeSystem();
    }
  };
  
  
// Esegue l'analisi di sistema
  const analyzeSystem = async () => {
      console.log('🔄 Inizio analyzeSystem');
    try {
      setLoading(true);
      setError(null);
      
      // Crea un'istanza del servizio di analisi
      const analysisService = new SolarAnalysisService();
      
      // Esegui l'analisi completa del sistema
      const results = await analysisService.analyzeSystem(panelsData);
      
      if (results) {
        // Aggiorna lo stato
        setSystemAnalysis({
          panelResults: results.panelResults,
          systemStats: results.systemStats,
          weatherData: results.weatherData,
          lastUpdateTime: new Date().toISOString()
        });
      }
      
      setLoading(false);
          console.log('✅ analyzeSystem completato con successo');
    } catch (error) {
      console.error('Errore durante l\'analisi di sistema:', error);
      
      // Se l'errore è dovuto alle API meteo, usa dati di default
      if (error.message === 'Network request failed' || error.code === 'ERR_NETWORK' || error.response?.status === 401) {
        console.log('Utilizzo dati di default a causa di errori API');
        
        try {
          const analysisService = new SolarAnalysisService();
          
          // Usa dati meteo di default
          const mockWeatherData = {
            current: {
              temperature: 25,
              humidity: 60,
              solarIrradiance: 800,
              windSpeed: 10,
              currentCondition: 'sunny'
            },
            forecast: [
              { date: new Date().toISOString().slice(0, 10), condition: 'sunny', solarIrradiance: 850, temperature: 26 },
              { date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), condition: 'partlyCloudy', solarIrradiance: 700, temperature: 24 },
              { date: new Date(Date.now() + 172800000).toISOString().slice(0, 10), condition: 'cloudy', solarIrradiance: 500, temperature: 22 },
              { date: new Date(Date.now() + 259200000).toISOString().slice(0, 10), condition: 'partlyCloudy', solarIrradiance: 650, temperature: 23 },
              { date: new Date(Date.now() + 345600000).toISOString().slice(0, 10), condition: 'sunny', solarIrradiance: 820, temperature: 25 },
              { date: new Date(Date.now() + 432000000).toISOString().slice(0, 10), condition: 'sunny', solarIrradiance: 830, temperature: 26 },
              { date: new Date(Date.now() + 518400000).toISOString().slice(0, 10), condition: 'partlyCloudy', solarIrradiance: 680, temperature: 24 }
            ]
          };
          
          // Analizza ogni pannello con dati default
          const panelResults = panelsData.map(panel => {
            const environmentalData = {
              averageTemperature: mockWeatherData.current.temperature,
              averageHumidity: mockWeatherData.current.humidity,
              solarIrradiance: mockWeatherData.current.solarIrradiance,
              recentRain: false
            };
            
            const weatherForecast = mockWeatherData.forecast.map(day => ({
              date: day.date,
              condition: day.condition,
              irradiance: day.solarIrradiance
            }));
            
            const degradationResults = analysisService.predictionService.predictPanelDegradation(
              panel, 
              environmentalData
            );
            
            const orientationResults = analysisService.predictionService.predictOptimalOrientation(
              panel, 
              weatherForecast
            );
            
            return {
              panelId: panel.id,
              panelName: panel.name,
              degradation: degradationResults,
              orientation: orientationResults
            };
          });
          
          // Calcola statistiche di sistema
          const systemStats = analysisService.calculateSystemStats(panelResults);
          
          setSystemAnalysis({
            panelResults,
            systemStats,
            weatherData: mockWeatherData,
            lastUpdateTime: new Date().toISOString()
          });
          
          setLoading(false);
        } catch (fallbackError) {
          console.error('Errore anche con dati di fallback:', fallbackError);
          setError('Impossibile eseguire l\'analisi. Si è verificato un errore inatteso.');
          setLoading(false);
        }
      } else {
        setError('Impossibile eseguire l\'analisi. Verifica la connessione internet e riprova.');
        setLoading(false);
      }
    }
  };

 
  useEffect(() => {
  // Se ci sono pannelli, esegui l'analisi
  if (panelsData && panelsData.length > 0) {
    // Controlla se abbiamo già un'analisi recente
    if (lastAnalysisTime) {
      const lastAnalysis = new Date(lastAnalysisTime);
      const now = new Date();
      const hoursDiff = (now - lastAnalysis) / (1000 * 60 * 60);
      
      // Se l'ultima analisi è recente (meno di 6 ore), usa i dati in cache
      if (hoursDiff < 6 && Object.keys(aiAnalysisResults).length === panelsData.length) {
        processExistingResults();
        return;
      }
    }
    
    // Altrimenti esegui una nuova analisi
    analyzeSystem();
  } else {
    setLoading(false);
  }
}, [panelsData]); 
 
  
  
  // Se i dati stanno caricando
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Analisi dell'impianto in corso...</Text>
        <Text style={styles.loadingSubtext}>Stiamo elaborando i dati con l'intelligenza artificiale</Text>
      </View>
    );
  }
  
  // Se c'è stato un errore
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="cloud-offline-outline" size={60} color="#F44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={analyzeSystem}
        >
          <Text style={styles.retryButtonText}>Riprova</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Se non ci sono pannelli
  if (!panelsData || panelsData.length === 0) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.header}>
        <TouchableOpacity   
           style={styles.backButton} onPress={() => navigation.navigate('PanelsList')}>            
          <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analisi Predittiva AI</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <View style={styles.emptyContainer}>
          <Ionicons name="sunny-outline" size={60} color="#ddd" />
          <Text style={styles.emptyText}>Nessun pannello solare registrato</Text>
          <Text style={styles.emptySubtext}>Aggiungi i tuoi pannelli per visualizzare l'analisi</Text>
          
          <TouchableOpacity 
            style={styles.addPanelButton}
            onPress={() => navigation.navigate('PanelsList')}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.addPanelButtonText}>Aggiungi Pannelli</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  // Dati per il grafico a torta degli stati dei pannelli
  const stateChartData = systemAnalysis && systemAnalysis.systemStats ? [
    {
      name: 'Ottimali',
      count: systemAnalysis.systemStats.stateCounts.optimal,
      color: '#4CAF50',
      legendFontColor: '#333',
      legendFontSize: 12
    },
    {
      name: 'Pulizia',
      count: systemAnalysis.systemStats.stateCounts.needs_cleaning,
      color: '#FF9800',
      legendFontColor: '#333',
      legendFontSize: 12
    },
    {
      name: 'Problemi',
      count: systemAnalysis.systemStats.stateCounts.issue,
      color: '#F44336',
      legendFontColor: '#333',
      legendFontSize: 12
    }
  ] : [];
  
  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}   onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('PanelsList');
          }
        }}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analisi Predittiva AI</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={analyzeSystem}>
          <Ionicons name="refresh" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>
      
      {/* Data aggiornamento */}
      {systemAnalysis && systemAnalysis.lastUpdateTime && (
        <View style={styles.updateInfoContainer}>
          <Ionicons name="time-outline" size={14} color="#666" />
          <Text style={styles.updateInfoText}>
            Analisi aggiornata il {new Date(systemAnalysis.lastUpdateTime).toLocaleString('it-IT')}
          </Text>
        </View>
      )}
      
      <ScrollView style={styles.scrollView}>
        {/* Card principale con AI badge */}
        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <View style={styles.aiBadge}>
              <Ionicons name="bulb" size={16} color="#fff" />
              <Text style={styles.aiBadgeText}>Powered by AI</Text>
            </View>
            <Text style={styles.aiTitle}>Analisi Intelligente dell'Impianto</Text>
          </View>
          
          <Text style={styles.aiDescription}>
            L'intelligenza artificiale ha analizzato i tuoi pannelli solari considerando condizioni meteo, 
            orientamento e stato di usura per fornirti raccomandazioni personalizzate.
          </Text>
        </View>
        
        {/* Riepilogo Sistema */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Stato dell'Impianto</Text>
          
          <View style={styles.statusChart}>
            {systemAnalysis && systemAnalysis.systemStats && (
              <PieChart
                data={stateChartData}
                width={screenWidth - 60}
                height={180}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor="count"
                backgroundColor="transparent"
                paddingLeft="15"
              />
            )}
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="cash-outline" size={24} color="#F44336" />
              <Text style={styles.statValue}>
                €{systemAnalysis?.systemStats ? Math.round(systemAnalysis.systemStats.totalEconomicImpact) : 0}
              </Text>
              <Text style={styles.statLabel}>Perdita potenziale (5 anni)</Text>
            </View>
            
            <View style={styles.statItem}>
              <Ionicons name="trending-up-outline" size={24} color="#4CAF50" />
              <Text style={styles.statValue}>
                {systemAnalysis?.systemStats ? Math.round(systemAnalysis.systemStats.totalPotentialIncrease) : 0} kWh
              </Text>
              <Text style={styles.statLabel}>Incremento con ottimizzazione</Text>
            </View>
          </View>
        </View>
        
        {/* Raccomandazioni AI */}
        <View style={styles.recommendationsCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="bulb-outline" size={24} color="#2196F3" />
            <Text style={styles.cardTitle}>Raccomandazioni AI</Text>
          </View>
          
          {systemAnalysis && systemAnalysis.systemStats && systemAnalysis.systemStats.criticalPanels.length > 0 && (
            <View style={[styles.recommendationItem, { borderLeftColor: '#F44336' }]}>
              <Ionicons name="warning" size={22} color="#F44336" />
              <View style={styles.recommendationContent}>
                <Text style={styles.recommendationTitle}>Intervento Tecnico Urgente</Text>
                <Text style={styles.recommendationText}>
                  {systemAnalysis.systemStats.criticalPanels.length} pannelli richiedono intervento immediato
                </Text>
                <View style={styles.panelsList}>
                  {systemAnalysis.systemStats.criticalPanels.map((panel, index) => (
                    <TouchableOpacity 
                      key={panel.panelId}
                      style={styles.panelItem}
                      onPress={() => navigation.navigate('PanelAnalysis', { panelId: panel.panelId })}
                    >
                      <Text style={styles.panelName}>{panel.panelName}</Text>
                      <Ionicons name="chevron-forward" size={16} color="#666" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
          
          {systemAnalysis && systemAnalysis.systemStats && systemAnalysis.systemStats.cleaningPanels.length > 0 && (
            <View style={[styles.recommendationItem, { borderLeftColor: '#FF9800' }]}>
              <Ionicons name="brush" size={22} color="#FF9800" />
              <View style={styles.recommendationContent}>
                <Text style={styles.recommendationTitle}>Pulizia Consigliata</Text>
                <Text style={styles.recommendationText}>
                  {systemAnalysis.systemStats.cleaningPanels.length} pannelli necessitano di pulizia
                </Text>
                <TouchableOpacity 
                  style={styles.viewDetailsButton}
                  onPress={() => navigation.navigate('PanelsList')}
                >
                  <Text style={styles.viewDetailsButtonText}>Vedi dettagli</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {systemAnalysis && systemAnalysis.systemStats && systemAnalysis.systemStats.orientationOptimizableCount > 0 && (
            <View style={[styles.recommendationItem, { borderLeftColor: '#2196F3' }]}>
              <Ionicons name="compass" size={22} color="#2196F3" />
              <View style={styles.recommendationContent}>
                <Text style={styles.recommendationTitle}>Ottimizzazione Orientamento</Text>
                <Text style={styles.recommendationText}>
                  {systemAnalysis.systemStats.orientationOptimizableCount} pannelli possono produrre di più
                </Text>
                <TouchableOpacity 
                  style={styles.viewDetailsButton}
                  onPress={() => navigation.navigate('PanelsList')}
                >
                  <Text style={styles.viewDetailsButtonText}>Ottimizza ora</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {systemAnalysis && systemAnalysis.systemStats && 
           systemAnalysis.systemStats.criticalPanels.length === 0 && 
           systemAnalysis.systemStats.cleaningPanels.length === 0 && 
           systemAnalysis.systemStats.orientationOptimizableCount === 0 && (
            <View style={styles.allOptimalContainer}>
              <Ionicons name="checkmark-circle" size={40} color="#4CAF50" />
              <Text style={styles.allOptimalText}>
                Impianto in condizioni ottimali!
              </Text>
              <Text style={styles.allOptimalSubtext}>
                L'AI non ha rilevato problemi o ottimizzazioni necessarie
              </Text>
            </View>
          )}
        </View>
        
        {/* Analisi dettagliata pannelli */}
        <View style={styles.panelsAnalysisCard}>
          <Text style={styles.cardTitle}>Analisi Dettagliata Pannelli</Text>
          
          {systemAnalysis && systemAnalysis.panelResults && systemAnalysis.panelResults.map((panel, index) => (
            <TouchableOpacity 
              key={panel.panelId}
              style={styles.panelAnalysisItem}
              onPress={() => navigation.navigate('PanelAnalysis', { panelId: panel.panelId })}
            >
              <View style={styles.panelAnalysisHeader}>
                <Text style={styles.panelAnalysisName}>{panel.panelName}</Text>
                <View style={[
                  styles.panelStatusBadge, 
                  { 
                    backgroundColor: 
                      panel.degradation.state === 'optimal' ? '#4CAF50' : 
                      panel.degradation.state === 'needs_cleaning' ? '#FF9800' : '#F44336'
                  }
                ]}>
                  <Text style={styles.panelStatusText}>
                    {panel.degradation.state === 'optimal' ? 'Ottimale' : 
                     panel.degradation.state === 'needs_cleaning' ? 'Pulizia' : 'Problema'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.panelAnalysisDetails}>
                <View style={styles.panelAnalysisDetail}>
                  <Ionicons name="speedometer-outline" size={16} color="#666" />
                  <Text style={styles.panelAnalysisDetailText}>
                    Efficienza: {panel.degradation.degradationAnalysis.actualEfficiency}%
                  </Text>
                </View>
                
                {panel.orientation.productionDifference > 0 && (
                  <View style={styles.panelAnalysisDetail}>
                    <Ionicons name="compass-outline" size={16} color="#2196F3" />
                    <Text style={styles.panelAnalysisDetailText}>
                      +{Math.round(panel.orientation.percentageDifference)}% con orientamento ottimale
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={styles.panelAnalysisArrow}>
                <Ionicons name="chevron-forward" size={22} color="#999" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Footer informativo */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color="#2196F3" />
          <Text style={styles.infoText}>
            Questa analisi utilizza algoritmi di intelligenza artificiale che considerano dati meteo in tempo reale, 
            modelli di degradazione validati scientificamente e analisi predittive per ottimizzare le performance del tuo impianto.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  loadingSubtext: {
    marginTop: 5,
    fontSize: 14,
    color: '#999',
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
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 18,
    color: '#666',
  },
  emptySubtext: {
    marginTop: 5,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  addPanelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
  },
  addPanelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  updateInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  updateInfoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  scrollView: {
    flex: 1,
  },
  aiCard: {
    backgroundColor: '#673AB7',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    marginBottom: 15,
  },
  aiHeader: {
    marginBottom: 12,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  aiBadgeText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  aiTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  aiDescription: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
    opacity: 0.9,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 20,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusChart: {
    alignItems: 'center',
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  recommendationsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  recommendationItem: {
    flexDirection: 'row',
    borderLeftWidth: 3,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 12,
  },
  recommendationContent: {
    flex: 1,
    marginLeft: 10,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  recommendationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  panelsList: {
    marginTop: 5,
  },
  panelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  panelName: {
    fontSize: 14,
    color: '#333',
  },
  viewDetailsButton: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  viewDetailsButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
  },
  allOptimalContainer: {
    alignItems: 'center',
    padding: 20,
  },
  allOptimalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 10,
  },
  allOptimalSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  panelsAnalysisCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  panelAnalysisItem: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
   borderRadius: 8,
   marginBottom: 10,
   padding: 12,
 },
 panelAnalysisHeader: {
   flexDirection: 'row',
   justifyContent: 'space-between',
   alignItems: 'center',
   marginBottom: 10,
 },
 panelAnalysisName: {
   fontSize: 16,
   fontWeight: 'bold',
   color: '#333',
 },
 panelStatusBadge: {
   paddingHorizontal: 8,
   paddingVertical: 3,
   borderRadius: 12,
 },
 panelStatusText: {
   color: '#fff',
   fontSize: 12,
   fontWeight: '500',
 },
 panelAnalysisDetails: {
   marginBottom: 5,
 },
 panelAnalysisDetail: {
   flexDirection: 'row',
   alignItems: 'center',
   marginBottom: 5,
 },
 panelAnalysisDetailText: {
   fontSize: 14,
   color: '#666',
   marginLeft: 8,
 },
 panelAnalysisArrow: {
   position: 'absolute',
   right: 12,
   top: '50%',
   marginTop: -11,
 },
 infoCard: {
   flexDirection: 'row',
   backgroundColor: '#E3F2FD',
   borderRadius: 8,
   padding: 15,
   marginHorizontal: 20,
   marginBottom: 20,
   alignItems: 'flex-start',
 },
 infoText: {
   flex: 1,
   fontSize: 14,
   color: '#1976D2',
   marginLeft: 10,
   lineHeight: 20,
 },
});

export default SystemAnalysisScreen;