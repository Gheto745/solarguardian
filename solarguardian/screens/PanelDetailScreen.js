// File: screens/PanelDetailScreen.js
import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';

// Context
import { AppContext } from '../context/AppContext';

const screenWidth = Dimensions.get('window').width;

const PanelDetailScreen = ({ route, navigation }) => {
  const { panelId } = route.params;
  const { panelsData } = useContext(AppContext);
  const [panel, setPanel] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [chartData, setChartData] = useState('production'); 
  
  // Cerca il pannello dai dati
  useEffect(() => {
    const foundPanel = panelsData.find(p => p.id === panelId);
    if (foundPanel) {
      setPanel(foundPanel);
    }
  }, [panelId, panelsData]);
  
  // Se il pannello non è trovato, mostra caricamento
  if (!panel) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Caricamento dati...</Text>
      </View>
    );
  }
  
  // Funzione per determinare lo stato del pannello
  const getStatusInfo = (status) => {
    switch(status) {
      case 'optimal':
        return { 
          color: '#4CAF50', 
          icon: 'checkmark-circle', 
          text: 'Ottimale',
          description: 'Il pannello sta funzionando correttamente senza problemi rilevati.'
        };
      case 'needs_cleaning':
        return { 
          color: '#FF9800', 
          icon: 'brush', 
          text: 'Pulizia necessaria',
          description: 'È stata rilevata polvere o sporco sul pannello che ne riduce l\'efficienza.'
        };
      case 'needs_inspection':
        return { 
          color: '#FF9800', 
          icon: 'eye', 
          text: 'Ispezione necessaria',
          description: 'È consigliabile un\'ispezione tecnica per verificare lo stato del pannello.'
        };
      case 'issue':
        return { 
          color: '#F44336', 
          icon: 'warning', 
          text: 'Problema rilevato',
          description: 'È stato rilevato un problema tecnico che richiede intervento.'
        };
      default:
        return { 
          color: '#2196F3', 
          icon: 'help-circle', 
          text: 'Stato non definito',
          description: 'Non è stato possibile determinare lo stato del pannello.'
        };
    }
  };
  
  // Prepara i dati per il grafico
  const prepareChartData = () => {
    if (!panel.performanceHistory || panel.performanceHistory.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [] }]
      };
    }
    
    const history = panel.performanceHistory;
    
    // Crea le label (date)
    const labels = history.map(item => {
      const date = new Date(item.date);
      return date.getDate() + '/' + (date.getMonth() + 1);
    });
    
    // Dati di produzione o efficienza
    const data = history.map(item => 
      chartData === 'production' ? item.production / 1000 : item.efficiency
    );
    
    return {
      labels,
      datasets: [{ data }]
    };
  };
  
  const statusInfo = getStatusInfo(panel.status);
  
  // Render della scheda informazioni
  const renderOverviewTab = () => {
    return (
      <View style={styles.tabContent}>
        {/* Header con stato */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusCard, { borderLeftColor: statusInfo.color }]}>
            <View style={styles.statusHeader}>
              <Ionicons name={statusInfo.icon} size={24} color={statusInfo.color} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.text}
              </Text>
            </View>
            <Text style={styles.statusDescription}>
              {statusInfo.description}
            </Text>
          </View>
        </View>
        
        {/* Riepilogo produzione attuale */}
        <View style={styles.productionCard}>
          <Text style={styles.cardTitle}>Produzione attuale</Text>
          <View style={styles.productionData}>
            <Text style={styles.productionValue}>{panel.currentProduction}</Text>
            <Text style={styles.productionUnit}>W</Text>
          </View>
          <View style={styles.efficiencyBar}>
            <View 
              style={[
                styles.efficiencyFill, 
                { 
                  width: `${panel.efficiency}%`,
                  backgroundColor: panel.efficiency > 90 ? '#4CAF50' : 
                                   panel.efficiency > 75 ? '#FF9800' : '#F44336'
                }
              ]} 
            />
          </View>
          <Text style={styles.efficiencyText}>
            Efficienza: {panel.efficiency}% della capacità ({panel.capacity}W)
          </Text>
        </View>
        
        {/* Info pannello */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Informazioni pannello</Text>
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Tipo</Text>
              <Text style={styles.infoValue}>{panel.type}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Data installazione</Text>
              <Text style={styles.infoValue}>
                {new Date(panel.installDate).toLocaleDateString('it-IT')}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Orientamento</Text>
              <Text style={styles.infoValue}>{panel.location.orientation}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Inclinazione</Text>
              <Text style={styles.infoValue}>{panel.location.tilt}°</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Ultima ispezione</Text>
              <Text style={styles.infoValue}>
                {new Date(panel.lastInspection).toLocaleDateString('it-IT')}
              </Text>
            </View>
          </View>
        </View>

        {/* 🤖 SEZIONE RISULTATI AI */}
        {panel.aiAnalysisDate && (
          <View style={styles.aiAnalysisCard}>
            <Text style={styles.cardTitle}>Analisi Computer Vision AI</Text>
            
            <View style={styles.aiAnalysisHeader}>
              <View style={styles.aiHealthScore}>
                <Text style={[
                  styles.aiHealthScoreValue,
                  { 
                    color: panel.aiHealthScore >= 80 ? '#4CAF50' : 
                           panel.aiHealthScore >= 60 ? '#FF9800' : '#F44336'
                  }
                ]}>
                  {panel.aiHealthScore || 'N/A'}
                </Text>
                <Text style={styles.aiHealthScoreLabel}>Health Score AI</Text>
              </View>
              
              <View style={styles.aiAnalysisInfo}>
                <Text style={styles.aiConditionText}>
                  Condizione: {
                    panel.aiCondition === 'optimal' ? '✅ Ottimale' :
                    panel.aiCondition === 'dust_accumulated' ? '🟡 Polvere rilevata' :
                    panel.aiCondition === 'discoloration' ? '🟠 Decolorazione' :
                    panel.aiCondition === 'micro_cracks' ? '🔴 Micro-fratture' :
                    panel.aiCondition === 'severe_degradation' ? '🚨 Degradazione grave' : 'N/A'
                  }
                </Text>
                <Text style={styles.aiAnalysisDate}>
                  Analisi: {new Date(panel.aiAnalysisDate).toLocaleDateString('it-IT')}
                </Text>
                {panel.aiConfidence && (
                  <Text style={styles.aiConfidence}>
                    Confidenza AI: {Math.round(panel.aiConfidence * 100)}%
                  </Text>
                )}
              </View>
            </View>
            
            {/* Confronto Efficienza Solo se Diversa */}
            {panel.baseEfficiency && panel.baseEfficiency !== panel.efficiency && (
              <View style={styles.efficiencyComparison}>
                <Text style={styles.efficiencyComparisonTitle}>💡 Impatto AI sull'Efficienza</Text>
                <View style={styles.efficiencyComparisonRow}>
                  <View style={styles.efficiencyComparisonItem}>
                    <Text style={styles.efficiencyComparisonValue}>{panel.baseEfficiency}%</Text>
                    <Text style={styles.efficiencyComparisonLabel}>Efficienza Originale</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={20} color="#FF9800" />
                  <View style={styles.efficiencyComparisonItem}>
                    <Text style={[styles.efficiencyComparisonValue, { color: '#F44336' }]}>
                      {panel.efficiency}%
                    </Text>
                    <Text style={styles.efficiencyComparisonLabel}>Efficienza AI</Text>
                  </View>
                </View>
                <Text style={styles.efficiencyImpactText}>
                  🔻 Riduzione rilevata: -{Math.round((panel.baseEfficiency - panel.efficiency) * 10) / 10}%
                </Text>
              </View>
            )}
            
            {/* Pulsante per Nuova Analisi */}
            <TouchableOpacity
              style={styles.newAnalysisButton}
              onPress={() => navigation.navigate('PanelVision', { panelId: panel.id })}
            >
              <Ionicons name="camera" size={18} color="#673AB7" />
              <Text style={styles.newAnalysisButtonText}>Nuova Analisi AI</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Avvisi attivi */}
        {panel.alerts && panel.alerts.length > 0 && (
          <View style={styles.alertsContainer}>
            <Text style={styles.cardTitle}>Avvisi attivi</Text>
            
            {panel.alerts.map((alert, index) => (
              <View 
                key={index} 
                style={[
                  styles.alertItem, 
                  index < panel.alerts.length - 1 && styles.alertDivider
                ]}
              >
                <View style={styles.alertIconContainer}>
                  <Ionicons 
                    name={
                      alert.severity === 'high' ? 'warning' : 
                      alert.severity === 'medium' ? 'alert-circle' : 'information-circle'
                    } 
                    size={22} 
                    color={
                      alert.severity === 'high' ? '#F44336' : 
                      alert.severity === 'medium' ? '#FF9800' : '#2196F3'
                    } 
                  />
                </View>
                <View style={styles.alertContent}>
                  <Text style={styles.alertMessage}>{alert.message}</Text>
                  <Text style={styles.alertDate}>
                    {new Date(alert.date).toLocaleDateString('it-IT')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };
  
  // Render della scheda performance
  const renderPerformanceTab = () => {
    const chartDataObj = prepareChartData();
    
    return (
      <View style={styles.tabContent}>
        {/* Selettore dati grafico */}
          <View style={styles.chartTypeSwitcher}>
            <TouchableOpacity
              style={[
                styles.chartTypeButton,
                chartData === 'production' && styles.activeChartTypeButton
              ]}
              onPress={() => setChartData('production')}
            >
              <Text 
                style={[
                  styles.chartTypeText,
                  chartData === 'production' && styles.activeChartTypeText
                ]}
              >
                Produzione
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.chartTypeButton,
                chartData === 'efficiency' && styles.activeChartTypeButton
              ]}
              onPress={() => setChartData('efficiency')}
            >
              <Text 
                style={[
                  styles.chartTypeText,
                  chartData === 'efficiency' && styles.activeChartTypeText
                ]}
              >
                Efficienza
              </Text>
            </TouchableOpacity>
          </View>

          {/* Pulsante Analisi Predittiva separato */}
          <TouchableOpacity
  style={[styles.arButton, { backgroundColor: '#673AB7', marginTop: 15 }]}
  onPress={() => {
    console.log('Navigazione a PanelAnalysis con panelId:', panel.id);
    
    // Debug per verificare che panel.id sia definito
    if (!panel || !panel.id) {
      console.error('ID pannello non disponibile');
      Alert.alert('Errore', 'ID pannello non disponibile');
      return;
    }
    
    // Usa la navigazione corretta, senza nidificare
    try {
      navigation.navigate('PanelAnalysis', { panelId: panel.id });
    } catch (error) {
      console.error('Errore durante la navigazione:', error);
      Alert.alert(
        'Errore di navigazione', 
        'Impossibile aprire l\'analisi del pannello. Si è verificato un errore: ' + error.message
      );
    }
  }}
>
  <View style={styles.arButtonContent}>
    <Ionicons name="analytics" size={24} color="#fff" />
    <View style={styles.arTextContainer}>
      <Text style={styles.arButtonText}>Analisi Predittiva</Text>
      <Text style={styles.arButtonSubtext}>
        Previsione usura e ottimizzazione orientamento
      </Text>
    </View>
  </View>
  <Ionicons name="chevron-forward" size={20} color="#fff" />
</TouchableOpacity>
        
        {/* Grafico */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>
            {chartData === 'production' ? 'Produzione (kWh)' : 'Efficienza (%)'}
          </Text>
          
          {chartDataObj.labels.length > 0 ? (
            <LineChart
              data={chartDataObj}
              width={screenWidth - 40}
              height={220}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: chartData === 'production' ? 1 : 0,
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
          ) : (
            <View style={styles.noDataContainer}>
              <Ionicons name="analytics-outline" size={60} color="#ddd" />
              <Text style={styles.noDataText}>Nessun dato disponibile</Text>
            </View>
          )}
        </View>
        
        {/* Dati storici in tabella */}
        <View style={styles.historyContainer}>
          <Text style={styles.cardTitle}>Dati storici</Text>
          
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Data</Text>
            <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Produzione (Wh)</Text>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Efficienza</Text>
          </View>
          
          {panel.performanceHistory && panel.performanceHistory.length > 0 ? (
            panel.performanceHistory.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>
                  {new Date(item.date).toLocaleDateString('it-IT')}
                </Text>
                <Text style={[styles.tableCell, { flex: 3 }]}>{item.production}</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>{item.efficiency}%</Text>
              </View>
            ))
          ) : (
            <View style={styles.noDataRow}>
              <Text style={styles.noDataText}>Nessun dato storico disponibile</Text>
            </View>
          )}
        </View>
      </View>
    );
  };
  
  // Render della scheda manutenzione
 const renderMaintenanceTab = () => {
  return (
    <View style={styles.tabContent}>
      {/* Ultima ispezione */}
      <View style={styles.maintenanceCard}>
        <Text style={styles.cardTitle}>Ultima ispezione</Text>
        <View style={styles.maintenanceInfo}>
          <Ionicons name="calendar" size={24} color="#2196F3" />
          <Text style={styles.maintenanceDate}>
            {new Date(panel.lastInspection).toLocaleDateString('it-IT')}
          </Text>
        </View>
      </View>
      
      {/* Prossime operazioni consigliate */}
      <View style={styles.maintenanceCard}>
        <Text style={styles.cardTitle}>Operazioni consigliate</Text>
        {panel.status !== 'optimal' ? (
          <View>
            {panel.status === 'needs_cleaning' && (
              <MaintenanceItem 
                icon="brush" 
                title="Pulizia pannello" 
                description="Rimuovere polvere e depositi dalla superficie del pannello"
                priority="Alta"
              />
            )}
            {panel.status === 'needs_inspection' && (
              <MaintenanceItem 
                icon="eye" 
                title="Ispezione tecnica" 
                description="Verificare lo stato generale e i collegamenti"
                priority="Media"
              />
            )}
            {panel.status === 'issue' && (
              <MaintenanceItem 
                icon="construct" 
                title="Intervento tecnico" 
                description="Riparazione necessaria - Contattare un tecnico specializzato"
                priority="Urgente"
              />
            )}
          </View>
        ) : (
          <View style={styles.optimalContainer}>
            <Ionicons name="checkmark-circle" size={50} color="#4CAF50" />
            <Text style={styles.optimalText}>
              Nessuna operazione necessaria
            </Text>
            <Text style={styles.optimalSubtext}>
              Il pannello è in condizioni ottimali
            </Text>
          </View>
        )}
      </View>
      
      {/* Pulsante Computer Vision - CORRETTA LA NAVIGAZIONE */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.cvButton]} 
          onPress={() => navigation.navigate('Panels', { screen: 'PanelVision', params: { panelId: panel.id }})}
        >
          <Ionicons name="camera" size={24} color="#fff" />
          <Text style={styles.buttonText}>Analisi Computer Vision</Text>
        </TouchableOpacity>
      </View>
      
      {/* Storico manutenzioni */}
      <View style={styles.maintenanceCard}>
        <Text style={styles.cardTitle}>Storico manutenzioni</Text>
        
        <View style={styles.maintenanceHistoryEmpty}>
          <Ionicons name="clipboard-outline" size={40} color="#ddd" />
          <Text style={styles.maintenanceHistoryEmptyText}>
            Nessuna manutenzione registrata
          </Text>
        </View>
      </View>
    </View>
  );
};
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Tabs per navigare tra le diverse sezioni */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
            onPress={() => setActiveTab('overview')}
          >
            <Ionicons 
              name={activeTab === 'overview' ? 'home' : 'home-outline'} 
              size={20} 
              color={activeTab === 'overview' ? '#2196F3' : '#666'} 
            />
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'overview' && styles.activeTabText
              ]}
            >
              Panoramica
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'performance' && styles.activeTab]}
            onPress={() => setActiveTab('performance')}
          >
            <Ionicons 
              name={activeTab === 'performance' ? 'analytics' : 'analytics-outline'} 
              size={20} 
              color={activeTab === 'performance' ? '#2196F3' : '#666'} 
            />
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'performance' && styles.activeTabText
              ]}
            >
              Performance
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'maintenance' && styles.activeTab]}
            onPress={() => setActiveTab('maintenance')}
          >
            <Ionicons 
              name={activeTab === 'maintenance' ? 'construct' : 'construct-outline'} 
              size={20} 
              color={activeTab === 'maintenance' ? '#2196F3' : '#666'} 
            />
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'maintenance' && styles.activeTabText
              ]}
            >
              Manutenzione
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Contenuto del tab selezionato */}
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'performance' && renderPerformanceTab()}
        {activeTab === 'maintenance' && renderMaintenanceTab()}
        
      </ScrollView>
    </SafeAreaView>
  );
};

// Componente per elemento di manutenzione
const MaintenanceItem = ({ icon, title, description, priority }) => {
  const getPriorityColor = (priority) => {
    switch(priority.toLowerCase()) {
      case 'urgente':
        return '#F44336';
      case 'alta':
        return '#FF9800';
      case 'media':
        return '#2196F3';
      default:
        return '#4CAF50';
    }
  };
  
  return (
    <View style={styles.maintenanceItem}>
      <View style={[
        styles.maintenanceIconContainer,
        { backgroundColor: getPriorityColor(priority) + '20' }
      ]}>
        <Ionicons name={icon} size={24} color={getPriorityColor(priority)} />
      </View>
      <View style={styles.maintenanceContent}>
        <Text style={styles.maintenanceTitle}>{title}</Text>
        <Text style={styles.maintenanceDescription}>{description}</Text>
        <View style={styles.priorityContainer}>
          <Text style={styles.priorityLabel}>Priorità:</Text>
          <Text style={[
            styles.priorityValue,
            { color: getPriorityColor(priority) }
          ]}>
            {priority}
          </Text>
        </View>
      </View>
    </View>
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
  // Tabs di navigazione
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: '500',
  },
  tabContent: {
    padding: 15,
  },
  // Stili per il tab overview
  statusContainer: {
    marginBottom: 15,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
  },
  productionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  productionData: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  productionValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  productionUnit: {
    fontSize: 18,
    color: '#666',
    marginLeft: 5,
    marginBottom: 4,
  },
  efficiencyBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 5,
  },
  efficiencyFill: {
    height: '100%',
    borderRadius: 4,
  },
  efficiencyText: {
    fontSize: 14,
    color: '#666',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
  },
  alertsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  alertItem: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  alertDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  alertIconContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  alertDate: {
    fontSize: 12,
    color: '#999',
  },
  // Stili per il tab performance
  chartTypeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  chartTypeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeChartTypeButton: {
    backgroundColor: '#2196F3',
  },
  chartTypeText: {
    fontSize: 14,
    color: '#666',
  },
  activeChartTypeText: {
    color: '#fff',
    fontWeight: '500',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  noDataText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  historyContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableHeaderCell: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableCell: {
    fontSize: 14,
    color: '#666',
  },
  noDataRow: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  // Stili per il tab manutenzione
  maintenanceCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  maintenanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  maintenanceDate: {
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
  maintenanceItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  maintenanceIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  maintenanceContent: {
    flex: 1,
  },
  maintenanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  maintenanceDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityLabel: {
    fontSize: 12,
    color: '#999',
    marginRight: 5,
  },
  priorityValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  optimalContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  optimalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 10,
  },
  optimalSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  arButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  arButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arTextContainer: {
    marginLeft: 10,
  },
  arButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  arButtonSubtext: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
  },
  maintenanceHistoryEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  maintenanceHistoryEmptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  aiAnalysisCard: {
    backgroundColor: '#F8F5FF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#673AB7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  aiAnalysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  aiHealthScore: {
    alignItems: 'center',
    marginRight: 20,
    backgroundColor: '#fff',
    borderRadius: 50,
    width: 80,
    height: 80,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  aiHealthScoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  aiHealthScoreLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
  aiAnalysisInfo: {
    flex: 1,
  },
  aiConditionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  aiAnalysisDate: {
    fontSize: 13,
    color: '#666',
    marginBottom: 3,
  },
  aiConfidence: {
    fontSize: 12,
    color: '#673AB7',
    fontWeight: '500',
  },
  efficiencyComparison: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  efficiencyComparisonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 10,
    textAlign: 'center',
  },
  efficiencyComparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  efficiencyComparisonItem: {
    alignItems: 'center',
  },
  efficiencyComparisonValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  efficiencyComparisonLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  efficiencyImpactText: {
    fontSize: 13,
    color: '#D84315',
    textAlign: 'center',
    fontWeight: '500',
  },
  newAnalysisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8E1F7',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginTop: 5,
  },
  newAnalysisButtonText: {
    color: '#673AB7',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonsContainer: {
    marginBottom: 15,
  },
  button: {
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cvButton: {
    backgroundColor: '#FF6D00',  // Manteniamo un colore arancione simile al pulsante di calibrazione
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default PanelDetailScreen;