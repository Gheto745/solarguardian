// File: screens/DashboardScreen.js
import React, { useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Platform,
  Dimensions,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ChartComponent from '../components/ChartComponent';

// Importa il context
import { AppContext } from '../context/AppContext';

// Componenti custom
import AlertBanner from '../components/AlertBanner';
import WeatherWidget from '../components/WeatherWidget';
import StatusCard from '../components/StatusCard';

const screenWidth = Dimensions.get('window').width;

const DashboardScreen = ({ navigation }) => {
  const { 
    panelsData, 
    systemStatus, 
    weatherData, 
    loading,
    getSystemStatistics,
  } = useContext(AppContext);
  
  const [refreshing, setRefreshing] = useState(false);

  // Funzione per simulare il refresh dei dati
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  // 🔥 MOSTRA COMPUTER VISION AI
  const startComputerVision = () => {
    if (!panelsData || panelsData.length === 0) {
      Alert.alert(
        'Nessun Pannello',
        'Aggiungi prima i tuoi pannelli solari per utilizzare l\'analisi AI.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Usa la navigazione corretta
    try {
      navigation.navigate('Panels', { 
        screen: 'PanelVision'
      });
    } catch (error) {
      console.error('Errore durante la navigazione:', error);
      Alert.alert(
        'Errore di navigazione', 
        'Impossibile aprire Computer Vision. Si è verificato un errore: ' + error.message
      );
    }
  };

  // Calcola statistiche di sistema usando la funzione del context
  const systemStats = useMemo(() => {
    return getSystemStatistics();
  }, [panelsData]);

  // Prepara i dati per il grafico di produzione  
  const chartData = useMemo(() => {
  // Se non ci sono dati, restituisci un grafico vuoto
  if (!panelsData || panelsData.length === 0 || !weatherData) {
    return {
      labels: ['Nessun dato'],
      datasets: [{ data: [0] }]
    };
  }

    // Usa i dati meteo reali se disponibili
  if (weatherData && weatherData.forecast) {
    const labels = weatherData.forecast.map(day => {
      const d = new Date(day.date);
      return d.getDate() + '/' + (d.getMonth() + 1);
    });
    
    const data = weatherData.forecast.map(day => day.solarIrradiance / 100); // Converti in kW/m²
    
    return { 
      labels, 
      datasets: [{ data }]
    };
  }
    const aggregatedHistory = {};
    
    panelsData.forEach(panel => {
      if (panel.performanceHistory && panel.performanceHistory.length > 0) {
        panel.performanceHistory.forEach(item => {
          if (!aggregatedHistory[item.date]) {
            aggregatedHistory[item.date] = { production: 0, count: 0 };
          }
          aggregatedHistory[item.date].production += item.production;
          aggregatedHistory[item.date].count += 1;
        });
      }
    });
    
    const dates = Object.keys(aggregatedHistory).sort().slice(-7);
    
    if (dates.length === 0) {
      return {
        labels: ['Nessun dato'],
        datasets: [{ data: [0] }]
      };
    }

    const labels = dates.map(date => {
      const d = new Date(date);
      return d.getDate() + '/' + (d.getMonth() + 1);
    });

    const data = dates.map(date => aggregatedHistory[date].production / 1000);
    
    return { 
      labels, 
      datasets: [{ data }]
    };
  }, [panelsData]);

  // Prepara i dati per il grafico gauge dell'efficienza
  const panelEfficiencyData = useMemo(() => {
    if (!panelsData || panelsData.length === 0) return null;
    
    return {
      data: panelsData.map(panel => ({
        label: panel.name,
        value: Math.round(panel.efficiency || 0),
        color: (panel.efficiency || 0) > 90 ? '#4CAF50' : 
               (panel.efficiency || 0) > 75 ? '#FF9800' : '#F44336'
      }))
    };
  }, [panelsData]);

  // Se i dati stanno caricando
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Caricamento dati...</Text>
      </View>
    );
  }

  // Se non ci sono pannelli, mostra schermata vuota
  if (!panelsData || panelsData.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>SolarGuardian</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Panels', { screen: 'DevSettings' })}>
          <Text>Impostazioni Sviluppatore</Text>
        </TouchableOpacity>

        <View style={styles.emptyStateContainer}>
          <Ionicons name="sunny-outline" size={80} color="#ddd" />
          <Text style={styles.emptyStateTitle}>Benvenuto in SolarGuardian</Text>
          <Text style={styles.emptyStateText}>
            Inizia aggiungendo i tuoi pannelli solari per monitorare le loro prestazioni con AR e AI
          </Text>
          
          <TouchableOpacity
            style={styles.addFirstPanelButton}
            onPress={() => navigation.navigate('Panels', { 
              screen: 'PanelsList'
            })}
          >
            <Ionicons name="add-circle-outline" size={24} color="#fff" />
            <Text style={styles.addFirstPanelButtonText}>Aggiungi il primo pannello</Text>
          </TouchableOpacity>

          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>Funzionalità AR & AI disponibili:</Text>
            
            <View style={styles.featureItem}>
              <Ionicons name="scan-outline" size={20} color="#2196F3" />
              <Text style={styles.featureText}>🔥 Scansione AR per localizzare pannelli</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="camera-outline" size={20} color="#673AB7" />
              <Text style={styles.featureText}>🤖 Analisi Computer Vision AI</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="analytics-outline" size={20} color="#FF9800" />
              <Text style={styles.featureText}>📊 Analisi Predittiva intelligente</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="partly-sunny-outline" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>🌤️ Previsioni meteorologiche in tempo reale</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Intestazione */}
        <View style={styles.header}>
          <Text style={styles.title}>SolarGuardian</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* 🔥 PULSANTE AR PRINCIPALE - POSIZIONE PROMINENTE */}
        <TouchableOpacity
          style={[styles.arButton, styles.arMainButton]}
          onPress={() => {
            try {
              navigation.navigate('Panels', { screen: 'ARView' });
            } catch (error) {
              console.error('Errore durante la navigazione:', error);
              Alert.alert('Errore', 'Impossibile avviare la scansione AR: ' + error.message);
            }
          }}
        >
          <View style={styles.arButtonContent}>
            <View style={styles.arIconContainer}>
              <Ionicons name="scan-outline" size={28} color="#fff" />
            </View>
            <View style={styles.arTextContainer}>
              <Text style={styles.arButtonText}>🔥 Scansione AR</Text>
              <Text style={styles.arButtonSubtext}>
                Localizza pannelli in Realtà Aumentata
              </Text>
            </View>
          </View>
          <View style={styles.arChevronContainer}>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </View>
        </TouchableOpacity>
          
        {/* Analisi Predittiva AI */}
        <TouchableOpacity
          style={[styles.arButton, { backgroundColor: '#673AB7', marginHorizontal: 20, marginTop: 10, marginBottom: 10 }]}
          onPress={() => {
            console.log('Navigazione a SystemAnalysis');
            
            // Debug per vedere quali schermate sono disponibili
            const availableScreens = navigation.getState()?.routes.map(route => route.name);
            console.log('Schermate disponibili:', availableScreens);
            
            // Usa la navigazione corretta
            try {
              navigation.navigate('Panels', { 
                screen: 'SystemAnalysis'
              });
            } catch (error) {
              console.error('Errore durante la navigazione:', error);
              Alert.alert(
                'Errore di navigazione', 
                'Impossibile aprire la schermata di analisi. Si è verificato un errore: ' + error.message
              );
            }
          }}
        >
          <View style={styles.arButtonContent}>
            <Ionicons name="bulb" size={24} color="#fff" />
            <Text style={styles.arButtonText}>🤖 Analisi Predittiva AI</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
        
        {/* Computer Vision AI - SPOSTATO SOTTO ANALISI PREDITTIVA */}
        <TouchableOpacity
          style={[styles.arButton, { backgroundColor: '#FF9800', marginBottom: 15, marginHorizontal: 20 }]}
          onPress={startComputerVision}
        >
          <View style={styles.arButtonContent}>
            <Ionicons name="camera" size={24} color="#fff" />
            <Text style={styles.arButtonText}>🤖 Analisi Computer Vision</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
        
        {/* Widget Meteo - solo se ci sono dati meteo */}
        {weatherData && (
          <WeatherWidget 
            weatherData={weatherData} 
            style={styles.weatherWidget}
          />
        )}
        
        {/* Banner Alert se presenti */}
        {systemStatus.alerts && systemStatus.alerts.length > 0 && (
          <AlertBanner 
            alerts={systemStatus.alerts}
            onViewAll={() => navigation.navigate('Panels', { screen: 'PanelsList' })}
          />
        )}
        
        {/* Statistiche di produzione */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Panoramica Impianto</Text>
          
          <View style={styles.statsGrid}>
            <StatusCard 
              title="Produzione Attuale"
              value={`${systemStatus.totalProduction || 0} W`}
              icon="flash"
              color="#4CAF50"
            />
            <StatusCard 
              title="Efficienza Media"
              value={`${Math.round(systemStatus.efficiency || 0)}%`}
              icon="speedometer"
              color="#2196F3"
            />
            <StatusCard 
              title="Pannelli"
              value={systemStats.totalPanels}
              icon="grid"
              color="#FF9800"
            />
          </View>
        </View>
        
        {/* Stato dei pannelli */}
        <View style={styles.panelStatusContainer}>
          <Text style={styles.sectionTitle}>Stato Pannelli</Text>
          
          <View style={styles.panelStatusRow}>
            <View style={[styles.statusIndicator, { backgroundColor: '#4CAF50' }]}>
              <Text style={styles.statusNumber}>{systemStats.statusCounts.optimal || 0}</Text>
              <Text style={styles.statusText}>Ottimali</Text>
            </View>
            <View style={[styles.statusIndicator, { backgroundColor: '#FF9800' }]}>
              <Text style={styles.statusNumber}>
                {(systemStats.statusCounts.needs_cleaning || 0) + (systemStats.statusCounts.needs_inspection || 0)}
              </Text>
              <Text style={styles.statusText}>Attenzione</Text>
            </View>
            <View style={[styles.statusIndicator, { backgroundColor: '#F44336' }]}>
              <Text style={styles.statusNumber}>{systemStats.statusCounts.issue || 0}</Text>
              <Text style={styles.statusText}>Problemi</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => navigation.navigate('Panels', { 
              screen: 'PanelsList'
            })}
          >
            <Text style={styles.viewAllText}>Vedi tutti i pannelli</Text>
            <Ionicons name="chevron-forward" size={16} color="#2196F3" />
          </TouchableOpacity>
        </View>

        {/* 🔥 AI IMPACT SECTION */}
        {systemStatus.aiImpact && systemStatus.aiImpact.analyzedPanels > 0 && (
          <View style={styles.aiImpactContainer}>
            <Text style={styles.sectionTitle}>🤖 Impatto Analisi AI</Text>
            
            <View style={styles.aiImpactGrid}>
              <View style={styles.aiImpactItem}>
                <Text style={styles.aiImpactValue}>{systemStatus.aiImpact.analyzedPanels}</Text>
                <Text style={styles.aiImpactLabel}>Pannelli Analizzati</Text>
              </View>
              <View style={styles.aiImpactItem}>
                <Text style={[styles.aiImpactValue, { color: '#F44336' }]}>
                  -{systemStatus.aiImpact.totalEfficiencyLoss}%
                </Text>
                <Text style={styles.aiImpactLabel}>Perdita Efficienza</Text>
              </View>
              <View style={styles.aiImpactItem}>
                <Text style={[styles.aiImpactValue, { color: '#F44336' }]}>
                  €{systemStatus.aiImpact.economicImpact}
                </Text>
                <Text style={styles.aiImpactLabel}>Impatto Annuo</Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Grafico di produzione - solo se ci sono dati storici */}
        {chartData.datasets[0].data.some(value => value > 0) && (
          <View style={styles.chartContainer}>
            <Text style={styles.sectionTitle}>Produzione Settimanale (kWh)</Text>
            
            <ChartComponent
              type="line"
              data={chartData}
              width={screenWidth - 40}
              height={220}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16
                },
                propsForDots: {
                  r: '5',
                  strokeWidth: '2',
                  stroke: '#2196F3'
                }
              }}
              bezier
              style={styles.chart}
            />
          </View>
        )}

        {/* Grafico efficienza pannelli */}
        {panelEfficiencyData && (
          <View style={styles.efficiencyContainer}>
            <Text style={styles.sectionTitle}>Efficienza Pannelli</Text>
            
            <ChartComponent
              type="gauge"
              data={panelEfficiencyData}
              height={panelsData.length > 2 ? 320 : 160}
              style={styles.efficiencyChart}
              showLegend={false}
            />
            
            <View style={styles.efficiencyLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.legendText}>{'Ottimale (>90%)'}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
                <Text style={styles.legendText}>Attenzione (75-90%)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
                <Text style={styles.legendText}>{'Critico (<75%)'}</Text>
              </View>
            </View>
          </View>
        )}
        
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },

  // Empty state styles
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  addFirstPanelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 40,
  },
  addFirstPanelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  featuresContainer: {
    alignSelf: 'stretch',
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },

  // Widget styles
  weatherWidget: {
    margin: 20,
    marginBottom: 10,
  },
  statsContainer: {
    marginHorizontal: 20,
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  panelStatusContainer: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  panelStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusIndicator: {
    flex: 1,
    borderRadius: 8,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  statusNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusText: {
    fontSize: 14,
    color: '#fff',
    marginTop: 5,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    padding: 10,
  },
  viewAllText: {
    color: '#2196F3',
    marginRight: 5,
    fontSize: 16,
  },

  // 🔥 AI Impact Section
  aiImpactContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#F3E5F5',
    borderRadius: 12,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#673AB7',
  },
  aiImpactGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  aiImpactItem: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
  },
  aiImpactValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#673AB7',
    marginBottom: 5,
  },
  aiImpactLabel: {
    fontSize: 12,
    color: '#4A148C',
    textAlign: 'center',
    lineHeight: 16,
  },

  chartContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      }
    }),
    elevation: 2,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 12,
  },
  
  // Efficiency section styles
  efficiencyContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      }
    }),
    elevation: 2,
  },
  efficiencyChart: {
    marginVertical: 10,
  },
  efficiencyLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },

  // 🔥 AR Button Styles - ENHANCED
  arButton: {
    backgroundColor: '#2196F3',
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(33, 150, 243, 0.3)',
      },
      default: {
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      }
    }),
    elevation: 6,
  },
  
  // 🔥 AR Main Button - SPECIAL STYLING
  arMainButton: {
    backgroundColor: '#1976D2',
    marginTop: 15,
    marginBottom: 10,
    padding: 18,
    borderRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: '0px 6px 12px rgba(25, 118, 210, 0.4)',
      },
      default: {
        shadowColor: '#1976D2',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      }
    }),
    elevation: 8,
  },
  
  arButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  // 🔥 AR Icon Container - ENHANCED
  arIconContainer: {
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 10,
    marginRight: 15,
  },
  
  arTextContainer: {
    flex: 1,
  },
  arButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  arButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    lineHeight: 18,
  },
  
  arChevronContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 8,
  },
});

export default DashboardScreen;