// File: screens/PanelsListScreen.js
import React, { useContext, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SwipeListView } from 'react-native-swipe-list-view';

// Importa il context
import { AppContext } from '../context/AppContext';

// Componente con statistiche di riepilogo
const SummaryHeader = ({ panelsData }) => {
  // Calcola le statistiche complessive
  const getTotalProduction = () => {
    return panelsData.reduce((total, panel) => total + (panel.currentProduction || 0), 0);
  };
  
  const getAverageEfficiency = () => {
    const total = panelsData.reduce((total, panel) => total + (panel.efficiency || 0), 0);
    return panelsData.length > 0 ? Math.round(total / panelsData.length) : 0;
  };
  
  const getAlertCount = () => {
    return panelsData.reduce((count, panel) => count + (panel.alerts?.length || 0), 0);
  };

  const getAIAlertCount = () => {
    return panelsData.reduce((count, panel) => {
      const aiAlerts = panel.alerts ? panel.alerts.filter(alert => alert.source === 'computer_vision') : [];
      return count + aiAlerts.length;
    }, 0);
  };
  
  return (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{panelsData.length}</Text>
        <Text style={styles.summaryLabel}>Pannelli</Text>
      </View>
      
      <View style={styles.summaryDivider} />
      
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{getTotalProduction()} W</Text>
        <Text style={styles.summaryLabel}>Produzione</Text>
      </View>
      
      <View style={styles.summaryDivider} />
      
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{getAverageEfficiency()}%</Text>
        <Text style={styles.summaryLabel}>Efficienza</Text>
      </View>
      
      <View style={styles.summaryDivider} />
      
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{getAlertCount()}</Text>
        <Text style={styles.summaryLabel}>Avvisi</Text>
        {getAIAlertCount() > 0 && (
          <Text style={styles.aiAlertCount}>{getAIAlertCount()} AI</Text>
        )}
      </View>
    </View>
  );
};

// Filtri scorrevoli
const ScrollableFilterButtons = ({ activeFilter, onFilterPress, panelsData }) => {
  // Count AI analyzed panels
  const aiAnalyzedCount = panelsData.filter(panel => {
    const aiAlerts = panel.alerts ? panel.alerts.filter(alert => alert.source === 'computer_vision') : [];
    return aiAlerts.length > 0;
  }).length;

  const filters = [
    { id: 'all', label: 'Tutti', icon: 'grid' },
    { id: 'optimal', label: 'Ottimali', icon: 'checkmark-circle' },
    { id: 'needs_attention', label: 'Attenzione', icon: 'alert-circle' },
    { id: 'issues', label: 'Problemi', icon: 'warning' },
    { id: 'alerts', label: 'Con avvisi', icon: 'notifications' },
    { id: 'ai_analyzed', label: `AI (${aiAnalyzedCount})`, icon: 'bulb' },
  ];
  
  return (
    <ScrollView 
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filtersScroll}
    >
      {filters.map((filter) => (
        <TouchableOpacity
          key={filter.id}
          style={[
            styles.filterButton,
            activeFilter === filter.id && styles.activeFilterButton,
            filter.id === 'ai_analyzed' && styles.aiFilterButton
          ]}
          onPress={() => onFilterPress(filter.id)}
        >
          <Ionicons 
            name={activeFilter === filter.id ? filter.icon : `${filter.icon}-outline`}
            size={16}
            color={
              filter.id === 'ai_analyzed' ? '#673AB7' :
              activeFilter === filter.id ? '#2196F3' : '#666'
            }
          />
          <Text
            style={[
              styles.filterText,
              activeFilter === filter.id && styles.activeFilterText,
              filter.id === 'ai_analyzed' && styles.aiFilterText
            ]}
          >
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

// Componente singolo pannello
const PanelListItem = ({ panel, onPress }) => {
  // Determina lo stato del pannello per styling e icona
  const getStatusData = (status) => {
    switch(status) {
      case 'optimal':
        return { color: '#4CAF50', icon: 'checkmark-circle', text: 'Ottimale' };
      case 'needs_cleaning':
        return { color: '#FF9800', icon: 'brush', text: 'Pulizia necessaria' };
      case 'needs_inspection':
        return { color: '#FF9800', icon: 'eye', text: 'Ispezione necessaria' };
      case 'issue':
        return { color: '#F44336', icon: 'warning', text: 'Problema rilevato' };
      default:
        return { color: '#2196F3', icon: 'help-circle', text: 'Stato non definito' };
    }
  };

  const statusData = getStatusData(panel.status);

  // Count AI-generated alerts
  const aiAlerts = panel.alerts ? panel.alerts.filter(alert => alert.source === 'computer_vision') : [];
  const totalAlerts = panel.alerts ? panel.alerts.length : 0;

  return (
    <TouchableOpacity 
      style={styles.panelItem}
      onPress={() => onPress(panel)}
    >
      <View style={styles.panelHeader}>
        <Text style={styles.panelName}>{panel.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusData.color + '20' }]}>
          <Ionicons name={statusData.icon} size={14} color={statusData.color} />
          <Text style={[styles.statusText, { color: statusData.color }]}>{statusData.text}</Text>
        </View>
      </View>
      
      <View style={styles.panelDetails}>
        <View style={styles.detailColumn}>
          <Text style={styles.detailLabel}>Tipo</Text>
          <Text style={styles.detailValue}>{panel.type}</Text>
        </View>
        <View style={styles.detailColumn}>
          <Text style={styles.detailLabel}>Capacità</Text>
          <Text style={styles.detailValue}>{panel.capacity} W</Text>
        </View>
        <View style={styles.detailColumn}>
          <Text style={styles.detailLabel}>Produzione attuale</Text>
          <Text style={styles.detailValue}>{panel.currentProduction} W</Text>
        </View>
      </View>
      
      <View style={styles.efficiencyContainer}>
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
        <Text style={styles.efficiencyValue}>{panel.efficiency}%</Text>
      </View>
      
      {/* AI Analysis Indicator */}
      {aiAlerts.length > 0 && (
        <View style={styles.aiIndicatorContainer}>
          <View style={styles.aiIndicatorHeader}>
            <Ionicons name="bulb" size={14} color="#673AB7" />
            <Text style={styles.aiIndicatorTitle}>Analisi Computer Vision</Text>
            <View style={[
              styles.aiHealthBadge,
              { backgroundColor: aiAlerts.some(a => a.severity === 'high') ? '#F44336' : 
                                aiAlerts.some(a => a.severity === 'medium') ? '#FF9800' : '#2196F3' }
            ]}>
              <Text style={styles.aiHealthBadgeText}>
                {aiAlerts.some(a => a.severity === 'high') ? 'CRITICO' : 
                 aiAlerts.some(a => a.severity === 'medium') ? 'ATTENZIONE' : 'INFO'}
              </Text>
            </View>
          </View>
          
          <View style={styles.aiIndicatorDetails}>
            {aiAlerts.slice(0, 2).map((alert, index) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Ionicons 
                  name={alert.severity === 'high' ? 'warning' : alert.severity === 'medium' ? 'alert-circle' : 'information-circle'} 
                  size={12} 
                  color={alert.severity === 'high' ? '#F44336' : alert.severity === 'medium' ? '#FF9800' : '#2196F3'} 
                />
                <Text style={styles.aiAlertText} numberOfLines={1}>
                  {alert.message}
                </Text>
              </View>
            ))}
            {aiAlerts.length > 2 && (
              <Text style={styles.moreAlertsText}>+{aiAlerts.length - 2} altre analisi AI</Text>
            )}
          </View>
        </View>
      )}
      
      {/* General Alerts */}
      {totalAlerts > aiAlerts.length && (
        <View style={styles.alertContainer}>
          <Ionicons name="alert-circle" size={16} color="#F44336" />
          <Text style={styles.alertText}>
            {totalAlerts - aiAlerts.length} {totalAlerts - aiAlerts.length === 1 ? 'avviso' : 'avvisi'} aggiuntivi
          </Text>
        </View>
      )}
      
      <View style={styles.panelFooter}>
        <Text style={styles.lastInspection}>
          Ultima ispezione: {new Date(panel.lastInspection).toLocaleDateString('it-IT')}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#999" />
      </View>
    </TouchableOpacity>
  );
};

const PanelsListScreen = ({ navigation }) => {
  const { panelsData, loading, removePanel } = useContext(AppContext);
  
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [filteredPanels, setFilteredPanels] = useState(null);
  
  useEffect(() => {
    // Quando i dati dei pannelli cambiano, riapplica il filtro attivo
    applyFilter(activeFilter);
  }, [panelsData]);
  
  const onRefresh = async () => {
    setRefreshing(true);
    // In un'app reale aggiorneremmo i dati da un'API
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  };
  
  const handlePanelPress = (panel) => {
    navigation.navigate('PanelDetail', {
      panelId: panel.id,
      panelName: panel.name
    });
  };
  
  const handleDeletePanel = (panelId) => {
    Alert.alert(
      "Elimina pannello",
      "Sei sicuro di voler eliminare questo pannello?",
      [
        {
          text: "Annulla",
          style: "cancel"
        },
        { 
          text: "Elimina", 
          onPress: () => removePanel(panelId),
          style: "destructive"
        }
      ]
    );
  };
  
  const applyFilter = (filter) => {
    setActiveFilter(filter);
    
    let filtered = null;
    switch (filter) {
      case 'all':
        filtered = null; // Mostra tutti
        break;
      case 'optimal':
        filtered = panelsData.filter(panel => panel.status === 'optimal');
        break;
      case 'needs_attention':
        filtered = panelsData.filter(panel => 
          panel.status === 'needs_cleaning' || 
          panel.status === 'needs_inspection'
        );
        break;
      case 'issues':
        filtered = panelsData.filter(panel => panel.status === 'issue');
        break;
      case 'alerts':
        filtered = panelsData.filter(panel => panel.alerts && panel.alerts.length > 0);
        break;
      case 'ai_analyzed':
        filtered = panelsData.filter(panel => {
          const aiAlerts = panel.alerts ? panel.alerts.filter(alert => alert.source === 'computer_vision') : [];
          return aiAlerts.length > 0;
        });
        break;
      default:
        filtered = null;
    }
    
    setFilteredPanels(filtered);
  };
  
  // Filtra i pannelli da visualizzare
  const panelsToDisplay = filteredPanels || panelsData;
  
  // Mostra indicatore durante il caricamento
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size={36} color="#2196F3" />
        <Text style={styles.loadingText}>Caricamento pannelli...</Text>
      </View>
    );
  }
  
  // Renderizza l'elemento nascosto per lo swipe-to-delete
  const renderHiddenItem = (data, rowMap) => (
    <View style={styles.rowBack}>
      <TouchableOpacity
        style={[styles.backRightBtn, styles.backRightBtnRight]}
        onPress={() => handleDeletePanel(data.item.id)}
      >
        <Ionicons name="trash-outline" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>I Miei Pannelli</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Intestazione con sommario */}
      <SummaryHeader panelsData={panelsData} />
      
      {/* Filtri */}
      <View style={styles.filterContainer}>
        <ScrollableFilterButtons 
          activeFilter={activeFilter}
          onFilterPress={applyFilter}
          panelsData={panelsData}
        />
      </View>
      
      {/* Lista pannelli con swipe-to-delete */}
      <SwipeListView
        data={panelsToDisplay}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PanelListItem 
            panel={item}
            onPress={handlePanelPress}
          />
        )}
        renderHiddenItem={renderHiddenItem}
        rightOpenValue={-75}
        disableRightSwipe
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="sunny-outline" size={60} color="#999" />
            <Text style={styles.emptyText}>
              {activeFilter === 'all' ?
                'Nessun pannello solare registrato' :
                'Nessun pannello corrisponde al filtro selezionato'}
            </Text>
            {activeFilter === 'all' && (
              <TouchableOpacity
                style={styles.addPanelEmptyButton}
                onPress={() => navigation.navigate('AddPanel')}
              >
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.addPanelEmptyButtonText}>Aggiungi il primo pannello</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
      
      {/* Pulsante aggiungi (manteniamo solo questo) */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddPanel')}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
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
  headerSpacer: {
    width: 40, // Spazio vuoto al posto del pulsante rimosso
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  // Stili per il sommario
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  aiAlertCount: {
    fontSize: 10,
    color: '#673AB7',
    fontWeight: '600',
    marginTop: 2,
  },
  // Stili per i filtri
  filterContainer: {
    marginBottom: 10,
  },
  filtersScroll: {
    paddingHorizontal: 15,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginRight: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeFilterButton: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  aiFilterButton: {
    borderColor: '#673AB7',
  },
  filterText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  activeFilterText: {
    color: '#2196F3',
    fontWeight: '500',
  },
  aiFilterText: {
    color: '#673AB7',
    fontWeight: '500',
  },
  // Stili per la lista
  listContainer: {
    padding: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  addPanelEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
  },
  addPanelEmptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Stili per gli elementi della lista
  panelItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  panelName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  panelDetails: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  detailColumn: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  efficiencyContainer: {
    marginBottom: 10,
  },
  efficiencyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  efficiencyBar: {
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 5,
  },
  efficiencyFill: {
    height: '100%',
  },
  efficiencyValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
  },
  aiIndicatorContainer: {
    backgroundColor: '#F8F5FF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#673AB7',
  },
  aiIndicatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiIndicatorTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#673AB7',
    marginLeft: 5,
    flex: 1,
  },
  aiHealthBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  aiHealthBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  aiIndicatorDetails: {
    paddingLeft: 19,
  },
  aiAlertText: {
    fontSize: 12,
    color: '#333',
    marginLeft: 5,
    flex: 1,
  },
  moreAlertsText: {
    fontSize: 11,
    color: '#673AB7',
    fontStyle: 'italic',
    marginTop: 4,
  },
  alertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  alertText: {
    marginLeft: 5,
    fontSize: 13,
    color: '#F44336',
    fontWeight: '500',
  },
  panelFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  lastInspection: {
    fontSize: 12,
    color: '#999',
  },
  // Pulsante aggiungi
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  // Stili per swipe-to-delete
  rowBack: {
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingRight: 15,
    marginBottom: 15,
  },
  backRightBtn: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    width: 75,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  backRightBtnRight: {
    backgroundColor: '#F44336',
    right: 0,
  },
});

export default PanelsListScreen;