// File: screens/PanelVisionScreen.js - VERSIONE PULITA COMPLETATA
import React, { useState, useRef, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  FlatList
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import axios from 'axios';
import { AppContext } from '../context/AppContext';

const PanelVisionScreen = ({ route, navigation }) => {
  const { 
    panelsData, 
    updatePanelData, 
    addAlertToPanel,
    clearAIAlertsFromPanel,
    updatePanelWithAIResults  
} = useContext(AppContext);
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [showPanelSelector, setShowPanelSelector] = useState(false);
  const [error, setError] = useState(null);

  // API endpoint for analysis
  const API_URL = Platform.OS === 'web' 
    ? 'http://localhost:3001/api/panel/analyze'
    : Platform.OS === 'ios' 
      ? 'http://192.168.1.19:3001/api/panel/analyze' 
      : 'http://192.168.1.19:3001/api/panel/analyze';
  
  // Check if a panel ID was passed from the previous screen
  useEffect(() => {
    if (route.params?.panelId) {
      const panel = panelsData.find(p => p.id === route.params.panelId);
      if (panel) {
        setSelectedPanel(panel);
      }
    }
  }, [route.params, panelsData]);

  // Request camera permissions
  const requestCameraPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permessi mancanti',
        "Per utilizzare questa funzionalità è necessario consentire l'accesso alla fotocamera.",
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  };
  
  // Request media library permissions
  const requestMediaLibraryPermissions = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permessi mancanti',
        "Per utilizzare questa funzionalità è necessario consentire l'accesso alla libreria multimediale.",
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  };
  
  // Take photo with camera
  const takePhoto = async () => {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return;
    
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
        setAnalysisResults(null);
        setError(null);
        
        // If no panel is selected and there are panels available, show selector
        if (!selectedPanel && panelsData && panelsData.length > 0) {
          setShowPanelSelector(true);
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Errore', 'Impossibile acquisire la foto.');
    }
  };
  
  // Pick image from library
  const pickImage = async () => {
    const hasPermission = await requestMediaLibraryPermissions();
    if (!hasPermission) return;
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
        setAnalysisResults(null);
        setError(null);
        
        // If no panel is selected and there are panels available, show selector
        if (!selectedPanel && panelsData && panelsData.length > 0) {
          setShowPanelSelector(true);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Errore', 'Impossibile selezionare l\'immagine.');
    }
  };

  // Select panel from list
  const handlePanelSelect = (panel) => {
    setSelectedPanel(panel);
    setShowPanelSelector(false);
  };

  // Show panel selector
  const showPanelSelectorModal = () => {
    setShowPanelSelector(true);
  };
  
  // 🔄 FUNZIONE AGGIORNATA PER INTEGRARE I RISULTATI AI
  const updatePanelWithResults = (results) => {
    if (!selectedPanel) return;

    console.log('🤖 Aggiornamento pannello con risultati AI:', {
      panelId: selectedPanel.id,
      condition: results.condition,
      healthScore: results.healthScore,
      efficiencyReduction: results.efficiencyImpact?.efficiencyReduction || 0
    });

    // ✅ USA LA NUOVA FUNZIONE DEL CONTEXT
    updatePanelWithAIResults(selectedPanel.id, results);
    
    // ✅ AGGIUNGI ALERT AI SE NECESSARIO
    if (results.condition !== 'optimal') {
      const alert = {
        type: results.condition === 'dust_accumulated' ? 'maintenance' : 'technical',
        severity: results.condition === 'severe_degradation' || results.condition === 'micro_cracks' ? 'high' : 'medium',
        message: `Computer Vision AI: ${results.description.substring(0, 80)}...`,
        source: 'computer_vision',
        metadata: {
          analysisResults: results,
          healthScore: results.healthScore,
          efficiencyReduction: results.efficiencyImpact?.efficiencyReduction || 0,
          economicImpact: results.efficiencyImpact?.economicImpact || 0
        }
      };
      
      addAlertToPanel(selectedPanel.id, alert);
    } else {
      // ✅ RIMUOVI VECCHI ALERT AI SE IL PANNELLO È OTTIMALE
      clearAIAlertsFromPanel(selectedPanel.id);
    }
    
    // ✅ AGGIORNA LO STATO LOCALE PER IL REFRESH IMMEDIATO
    setSelectedPanel(prevPanel => {
      const baseEfficiency = prevPanel.baseEfficiency || prevPanel.efficiency;
      const efficiencyReduction = results.efficiencyImpact?.efficiencyReduction || 0;
      const newEfficiency = Math.max(30, Math.round(baseEfficiency - efficiencyReduction));
      const newProduction = Math.round((prevPanel.capacity * (newEfficiency / baseEfficiency) * 0.75));
      
      return {
        ...prevPanel,
        baseEfficiency,
        efficiency: newEfficiency,
        currentProduction: newProduction,
        status: mapConditionToStatus(results.condition),
        aiAnalysisDate: new Date().toISOString(),
        aiHealthScore: results.healthScore,
        aiCondition: results.condition,
        aiConfidence: results.confidence
      };
    });

    console.log('✅ Pannello aggiornato con successo!');
  };

  // Analyze the image using the backend API
  const analyzeImage = async () => {
    if (!selectedImage) {
      Alert.alert('Errore', 'Nessuna immagine selezionata.');
      return;
    }
    
    setAnalyzing(true);
    setError(null);
    
    try {
      // Create form data for the image
      const formData = new FormData();
      
      // Convert image URI to blob for web or use direct URI for mobile
      if (Platform.OS === 'web') {
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        formData.append('image', blob, 'panel_image.jpg');
      } else {
        const filename = selectedImage.split('/').pop();
        formData.append('image', {
          uri: selectedImage,
          type: 'image/jpeg',
          name: filename,
        });
      }
      
      // Append panel metadata if available
      if (selectedPanel) {
        formData.append('panelId', selectedPanel.id);
        formData.append('panelType', selectedPanel.type);
        formData.append('installDate', selectedPanel.installDate);
        
        if (selectedPanel.location) {
          formData.append('location', JSON.stringify(selectedPanel.location));
        }
        
        if (selectedPanel.lastInspection) {
          formData.append('lastCleaning', selectedPanel.lastInspection);
        }
      }
      
      // Send the API request
      const response = await axios.post(API_URL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 seconds timeout
      });
      
      if (response.data.success) {
        const results = response.data.results;
        setAnalysisResults(results);
        
        // Update panel data with results
        if (selectedPanel) {
          updatePanelWithResults(results);
        }
      } else {
        throw new Error('Analisi fallita');
      }
      
    } catch (error) {
      console.error('Errore durante l\'analisi:', error);
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        setError('Timeout della richiesta. Il server potrebbe essere occupato.');
      } else if (error.response?.status === 404) {
        setError('Servizio di analisi non disponibile. Verificare che il backend sia attivo.');
      } else if (error.response?.status >= 500) {
        setError('Errore del server. Riprovare più tardi.');
      } else {
        setError('Impossibile analizzare l\'immagine. Verificare la connessione di rete.');
      }
    } finally {
      setAnalyzing(false);
    }
  };
  
  // Helper function to map condition to panel status
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
  
  // Render the panel selector modal
  const renderPanelSelector = () => {
    return (
      <Modal
        visible={showPanelSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPanelSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleziona un pannello</Text>
              <TouchableOpacity 
                onPress={() => setShowPanelSelector(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={panelsData}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.panelItem,
                    selectedPanel?.id === item.id && styles.selectedPanelItem
                  ]}
                  onPress={() => handlePanelSelect(item)}
                >
                  <View style={styles.panelItemContent}>
                    <Text style={styles.panelItemName}>{item.name}</Text>
                    <Text style={styles.panelItemType}>{item.type}</Text>
                    <Text style={styles.panelItemStatus}>
                      Status: {item.status === 'optimal' ? 'Ottimale' : 
                               item.status === 'needs_cleaning' ? 'Pulizia' : 'Problema'}
                    </Text>
                  </View>
                  {selectedPanel?.id === item.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyListText}>Nessun pannello disponibile</Text>
              }
            />
            
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => setShowPanelSelector(false)}
            >
              <Text style={styles.skipButtonText}>Continua senza selezionare</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };
  
  // Render the analysis results
  const renderAnalysisResults = () => {
    if (!analysisResults) return null;
    
    const { condition, healthScore, efficiencyImpact, description, recommendations } = analysisResults;
    
    // Helper function to get the color based on health score
    const getHealthScoreColor = (score) => {
      if (score >= 90) return '#4CAF50';
      if (score >= 75) return '#8BC34A';
      if (score >= 60) return '#FFC107';
      if (score >= 40) return '#FF9800';
      return '#F44336';
    };
    
    return (
      <View style={styles.resultsContainer}>
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>Risultati Analisi AI</Text>
          <Text style={styles.resultsSubtitle}>
            {selectedPanel ? selectedPanel.name : 'Pannello non identificato'}
          </Text>
        </View>
        
        <View style={styles.healthScoreContainer}>
          <View style={[
            styles.healthScoreCircle, 
            { backgroundColor: getHealthScoreColor(healthScore) }
          ]}>
            <Text style={styles.healthScoreText}>{healthScore}</Text>
          </View>
          <Text style={styles.healthScoreLabel}>Indice di Salute AI</Text>
        </View>
        
        <View style={styles.conditionContainer}>
          <Text style={styles.conditionLabel}>Condizione rilevata:</Text>
          <View style={styles.conditionValueContainer}>
            <View style={[
              styles.conditionBadge, 
              { 
                backgroundColor: 
                  condition === 'optimal' ? '#4CAF50' : 
                  condition === 'dust_accumulated' ? '#FFC107' : 
                  condition === 'discoloration' ? '#FF9800' : '#F44336' 
              }
            ]}>
              <Text style={styles.conditionBadgeText}>
                {condition === 'optimal' ? 'Ottimale' : 
                 condition === 'dust_accumulated' ? 'Accumulo di polvere' : 
                 condition === 'discoloration' ? 'Decolorazione' : 
                 condition === 'micro_cracks' ? 'Micro-fratture' : 'Degradazione grave'}
              </Text>
            </View>
          </View>
        </View>
        
        {efficiencyImpact && efficiencyImpact.efficiencyReduction > 0 && (
          <View style={styles.impactContainer}>
            <View style={styles.impactItem}>
              <Text style={styles.impactLabel}>Riduzione efficienza:</Text>
              <Text style={styles.impactValue}>-{efficiencyImpact.efficiencyReduction}%</Text>
            </View>
            <View style={styles.impactItem}>
              <Text style={styles.impactLabel}>Impatto economico annuo:</Text>
              <Text style={styles.impactValue}>€{efficiencyImpact.economicImpact}</Text>
            </View>
          </View>
        )}
        
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionTitle}>Analisi dettagliata</Text>
          <Text style={styles.descriptionText}>{description}</Text>
        </View>
        
        <View style={styles.recommendationsContainer}>
          <Text style={styles.recommendationsTitle}>Raccomandazioni AI</Text>
          {recommendations && recommendations.map((rec, index) => (
            <View key={index} style={styles.recommendationItem}>
              <Ionicons name="bulb" size={18} color="#2196F3" />
              <Text style={styles.recommendationText}>{rec}</Text>
            </View>
          ))}
        </View>
        
        {selectedPanel && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.detailsButton}
              onPress={() => navigation.navigate('PanelDetail', {
                panelId: selectedPanel.id,
                panelName: selectedPanel.name
              })}
            >
              <Text style={styles.detailsButtonText}>Vedi dettagli pannello</Text>
              <Ionicons name="arrow-forward" size={18} color="#2196F3" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };
  
  // If no panels are available, show message
  if (!panelsData || panelsData.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity   
            style={styles.backButton} onPress={() => navigation.navigate('PanelsList')}>                
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Computer Vision AI</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <View style={styles.emptyStateContainer}>
          <Ionicons name="sunny-outline" size={80} color="#ddd" />
          <Text style={styles.emptyStateTitle}>Nessun pannello disponibile</Text>
          <Text style={styles.emptyStateText}>
            Aggiungi i tuoi pannelli solari per utilizzare l'analisi con Computer Vision AI
          </Text>
          
          <TouchableOpacity 
            style={styles.addPanelButton}
            onPress={() => navigation.navigate('AddPanel')}
          >
            <Ionicons name="add-circle-outline" size={24} color="#fff" />
            <Text style={styles.addPanelButtonText}>Aggiungi Pannelli</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  // Main render function
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} 
        onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('PanelsList');
          }
        }}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Computer Vision AI</Text>
        {selectedPanel && (
          <TouchableOpacity 
            style={styles.panelBadge}
            onPress={showPanelSelectorModal}
          >
            <Ionicons name="sunny-outline" size={16} color="#fff" />
            <Text style={styles.panelBadgeText}>{selectedPanel.name}</Text>
          </TouchableOpacity>
        )}
        {!selectedPanel && (
          <TouchableOpacity 
            style={styles.selectPanelButton}
            onPress={showPanelSelectorModal}
          >
            <Text style={styles.selectPanelButtonText}>Seleziona</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.aiInfoCard}>
          <Ionicons name="eye" size={24} color="#fff" />
          <Text style={styles.aiInfoTitle}>Computer Vision AI</Text>
          <Text style={styles.aiInfoText}>
            Scatta o seleziona una foto del tuo pannello solare per analizzarlo con l'intelligenza artificiale.
            L'AI rileverà polvere, decolorazione, micro-fratture e altri problemi.
          </Text>
        </View>
        
        <View style={styles.imageContainer}>
          {selectedImage ? (
            <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="images-outline" size={60} color="#ddd" />
              <Text style={styles.placeholderText}>Nessuna immagine selezionata</Text>
            </View>
          )}
        </View>
        
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={takePhoto}>
            <Ionicons name="camera-outline" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Scatta foto</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={pickImage}>
            <Ionicons name="images-outline" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Galleria</Text>
          </TouchableOpacity>
        </View>
        
        {selectedImage && !analyzing && !analysisResults && (
          <TouchableOpacity 
            style={styles.analyzeButton}
            onPress={analyzeImage}
          >
            <Text style={styles.analyzeButtonText}>Analizza con AI</Text>
            <Ionicons name="scan-outline" size={20} color="#fff" />
          </TouchableOpacity>
        )}
        
        {analyzing && (
          <View style={styles.analyzingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.analyzingText}>Analisi AI in corso...</Text>
            <Text style={styles.analyzingSubtext}>
              L'intelligenza artificiale sta analizzando l'immagine
            </Text>
          </View>
        )}
        
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={30} color="#F44336" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={analyzeImage}
            >
              <Text style={styles.retryButtonText}>Riprova</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {renderAnalysisResults()}
        
        {!selectedImage && !analysisResults && !error && (
          <View style={styles.instructionsContainer}>
            <View style={styles.instructionItem}>
              <View style={styles.instructionIcon}>
                <Ionicons name="camera" size={24} color="#2196F3" />
              </View>
              <View style={styles.instructionContent}>
                <Text style={styles.instructionTitle}>Fotocamera</Text>
                <Text style={styles.instructionText}>
                  Scatta una foto del pannello solare in buone condizioni di luce.
                  Assicurati che tutto il pannello sia visibile nell'inquadratura.
                </Text>
              </View>
            </View>
            
            <View style={styles.instructionItem}>
              <View style={styles.instructionIcon}>
                <Ionicons name="image" size={24} color="#2196F3" />
              </View>
              <View style={styles.instructionContent}>
                <Text style={styles.instructionTitle}>Galleria</Text>
                <Text style={styles.instructionText}>
                  Seleziona un'immagine esistente dalla tua galleria fotografica.
                  Scegli un'immagine chiara e ben illuminata.
                </Text>
              </View>
            </View>
            
            <View style={styles.instructionItem}>
              <View style={styles.instructionIcon}>
                <Ionicons name="analytics" size={24} color="#2196F3" />
              </View>
              <View style={styles.instructionContent}>
                <Text style={styles.instructionTitle}>Analisi AI</Text>
                <Text style={styles.instructionText}>
                  L'intelligenza artificiale analizzerà l'immagine per rilevare
                  polvere, degradazione, micro-fratture e altri problemi.
                </Text>
              </View>
            </View>
            
            <View style={styles.requirementsBanner}>
              <Ionicons name="server-outline" size={20} color="#FF9800" />
              <View style={styles.requirementsContent}>
                <Text style={styles.requirementsTitle}>Server Backend Richiesto</Text>
                <Text style={styles.requirementsText}>
                  L'analisi AI richiede un server backend attivo su localhost:3001.
                  Verificare che il servizio sia in esecuzione.
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
      
      {/* Panel selector modal */}
      {renderPanelSelector()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  panelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  panelBadgeText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 5,
  },
  selectPanelButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  selectPanelButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 40,
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
  addPanelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addPanelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Main content styles
  aiInfoCard: {
    backgroundColor: '#673AB7',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    alignItems: 'center',
  },
  aiInfoTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  aiInfoText: {
    color: '#fff',
    textAlign: 'center',
    lineHeight: 20,
  },
  imageContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  selectedImage: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  placeholderText: {
    marginTop: 10,
    color: '#999',
    fontSize: 14,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    flex: 0.48,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },analyzingContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  analyzingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
  },
  analyzingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FFF8F8',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    marginTop: 10,
    marginBottom: 15,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  instructionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  instructionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  instructionContent: {
    flex: 1,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  requirementsBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 12,
    marginTop: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  requirementsContent: {
    flex: 1,
    marginLeft: 10,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 4,
  },
  requirementsText: {
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
  },
  resultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  resultsHeader: {
    marginBottom: 15,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  resultsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  healthScoreContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  healthScoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  healthScoreText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  healthScoreLabel: {
    fontSize: 14,
    color: '#666',
  },
  conditionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  conditionLabel: {
    fontSize: 14,
    color: '#666',
  },
  conditionValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  conditionBadge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  conditionBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  impactContainer: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  impactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  impactLabel: {
    fontSize: 14,
    color: '#333',
  },
  impactValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57C00',
  },
  descriptionContainer: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  recommendationsContainer: {
    marginBottom: 15,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
    lineHeight: 20,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
  },
  detailsButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: '100%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  panelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 5,
  },
  selectedPanelItem: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
    borderWidth: 1,
  },
  panelItemContent: {
    flex: 1,
  },
  panelItemName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  panelItemType: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  panelItemStatus: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  emptyListText: {
    padding: 20,
    textAlign: 'center',
    color: '#999',
  },
  skipButton: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 14,
  }
});

export default PanelVisionScreen;