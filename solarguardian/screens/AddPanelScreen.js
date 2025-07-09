// File: screens/AddPanelScreen.js
import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Importa expo-location in modo condizionale per evitare errori di costruttore
let Location;
try {
  Location = require('expo-location');
} catch (error) {
  console.log('Errore importazione expo-location:', error);
}

// Context
import { AppContext } from '../context/AppContext';

// Array di opzioni per i selettori
const PANEL_TYPES = [
  'Monocristallino',
  'Policristallino',
  'Film sottile',
  'Monocristallino PERC'
];

const ORIENTATIONS = [
  'Nord',
  'Nord-Est',
  'Est',
  'Sud-Est',
  'Sud',
  'Sud-Ovest',
  'Ovest',
  'Nord-Ovest'
];

const AddPanelScreen = ({ navigation }) => {
  const { addPanel } = useContext(AppContext);
  
  // Stati del form
  const [panelData, setPanelData] = useState({
    name: '',
    type: 'Monocristallino',
    capacity: '',
    orientation: 'Sud',
    tilt: '',
    location: {
      lat: '',
      lon: ''
    }
  });

  // Stati per i selettori modali
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showOrientationPicker, setShowOrientationPicker] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  
  // Validazione del form
  const validateForm = () => {
    if (!panelData.name.trim()) {
      Alert.alert('Errore', 'Il nome del pannello è obbligatorio');
      return false;
    }
    
    if (!panelData.capacity || isNaN(panelData.capacity)) {
      Alert.alert('Errore', 'La capacità deve essere un numero valido');
      return false;
    }
    
    if (!panelData.tilt || isNaN(panelData.tilt) || panelData.tilt < 0 || panelData.tilt > 90) {
      Alert.alert('Errore', 'L\'inclinazione deve essere un numero tra 0 e 90');
      return false;
    }
    
    if (!panelData.location.lat || !panelData.location.lon) {
      Alert.alert('Errore', 'Le coordinate GPS sono obbligatorie');
      return false;
    }
    
    return true;
  };
  
  // Salva il pannello
const handleSave = async () => {
  if (!validateForm()) return;
  
  const newPanel = {
    id: Date.now().toString(),
    name: panelData.name,
    type: panelData.type,
    capacity: parseInt(panelData.capacity),
    installDate: new Date().toISOString(),
    location: {
      lat: parseFloat(panelData.location.lat),
      lon: parseFloat(panelData.location.lon),
      orientation: panelData.orientation,
      tilt: parseInt(panelData.tilt)
    },
    currentProduction: 0,
    efficiency: 95,
    status: 'optimal',
    lastInspection: new Date().toISOString(),
    alerts: [],
    performanceHistory: []
  };
  
  // Aggiungi il pannello
  addPanel(newPanel);
  
  // Mostra conferma e torna indietro SENZA await
  Alert.alert(
    'Successo',
    'Pannello aggiunto con successo!',
    [{ 
      text: 'OK', 
      onPress: () => navigation.goBack() 
    }]
  );
};

  // Usa posizione corrente - versione compatibile
  const useCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      // Verifica se expo-location è disponibile
      if (!Location) {
        // Fallback usando coordinate predefinite
        Alert.alert(
          'Funzionalità non disponibile',
          'Non è possibile ottenere la posizione attuale. Inserisci le coordinate manualmente.'
        );
        setLocationLoading(false);
        return;
      }
      
      // Richiedi permesso per la posizione
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permesso negato', 'Per ottenere la posizione è necessario consentire l\'accesso alla tua posizione.');
        setLocationLoading(false);
        return;
      }
      
      // Ottieni la posizione corrente
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest
      });
      
      // Aggiorna lo stato con la nuova posizione
      setPanelData({
        ...panelData,
        location: {
          ...panelData.location,
          lat: location.coords.latitude.toString(),
          lon: location.coords.longitude.toString()
        }
      });
      
      Alert.alert('Posizione aggiornata', 'La tua posizione attuale è stata utilizzata come posizione del pannello.');
    } catch (error) {
      console.error('Errore nell\'ottenere la posizione:', error);
      // Alternativa di fallback - Usiamo coordinate predefinite per Bari
      setPanelData({
        ...panelData,
        location: {
          ...panelData.location,
          lat: "41.1071",
          lon: "16.8719"
        }
      });
      Alert.alert(
        'Errore Geolocalizzazione',
        'Impossibile ottenere la posizione attuale. Coordinate predefinite inserite, modificale se necessario.'
      );
    } finally {
      setLocationLoading(false);
    }
  };

  // Componente selettore personalizzato per tipo pannello
  const renderTypePicker = () => (
    <Modal
      visible={showTypePicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowTypePicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleziona tipo pannello</Text>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowTypePicker(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView>
            {PANEL_TYPES.map((type, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionItem,
                  panelData.type === type && styles.selectedOptionItem
                ]}
                onPress={() => {
                  setPanelData({...panelData, type: type});
                  setShowTypePicker(false);
                }}
              >
                <Text 
                  style={[
                    styles.optionText,
                    panelData.type === type && styles.selectedOptionText
                  ]}
                >
                  {type}
                </Text>
                {panelData.type === type && (
                  <Ionicons name="checkmark" size={22} color="#2196F3" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Componente selettore personalizzato per orientamento
  const renderOrientationPicker = () => (
    <Modal
      visible={showOrientationPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowOrientationPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleziona orientamento</Text>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowOrientationPicker(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView>
            {ORIENTATIONS.map((orientation, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionItem,
                  panelData.orientation === orientation && styles.selectedOptionItem
                ]}
                onPress={() => {
                  setPanelData({...panelData, orientation: orientation});
                  setShowOrientationPicker(false);
                }}
              >
                <Text 
                  style={[
                    styles.optionText,
                    panelData.orientation === orientation && styles.selectedOptionText
                  ]}
                >
                  {orientation}
                </Text>
                {panelData.orientation === orientation && (
                  <Ionicons name="checkmark" size={22} color="#2196F3" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Aggiungi Pannello</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveButton}>Salva</Text>
        </TouchableOpacity>
      </View>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Nome pannello */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome pannello *</Text>
            <TextInput
              style={styles.input}
              value={panelData.name}
              onChangeText={(text) => setPanelData({...panelData, name: text})}
              placeholder="es. Pannello Tetto Sud"
            />
          </View>
          
          {/* Tipo pannello */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tipo pannello</Text>
            <TouchableOpacity 
              style={styles.selectButton}
              onPress={() => setShowTypePicker(true)}
            >
              <Text style={styles.selectButtonText}>{panelData.type}</Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          
          {/* Capacità */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Capacità (W) *</Text>
            <TextInput
              style={styles.input}
              value={panelData.capacity}
              onChangeText={(text) => setPanelData({...panelData, capacity: text})}
              placeholder="es. 350"
              keyboardType="numeric"
            />
          </View>
          
          {/* Orientamento */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Orientamento</Text>
            <TouchableOpacity 
              style={styles.selectButton}
              onPress={() => setShowOrientationPicker(true)}
            >
              <Text style={styles.selectButtonText}>{panelData.orientation}</Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          
          {/* Inclinazione */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Inclinazione (°) *</Text>
            <TextInput
              style={styles.input}
              value={panelData.tilt}
              onChangeText={(text) => setPanelData({...panelData, tilt: text})}
              placeholder="es. 30"
              keyboardType="numeric"
            />
            <Text style={styles.hint}>Valore tra 0° (orizzontale) e 90° (verticale)</Text>
          </View>
          
          {/* Posizione GPS */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Posizione GPS</Text>
            <TouchableOpacity 
              style={[styles.locationButton, locationLoading && styles.locationButtonDisabled]}
              onPress={useCurrentLocation}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color="#2196F3" />
              ) : (
                <>
                  <Ionicons name="location" size={20} color="#2196F3" />
                  <Text style={styles.locationButtonText}>Usa posizione attuale</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Latitudine *</Text>
            <TextInput
              style={styles.input}
              value={panelData.location.lat}
              onChangeText={(text) => setPanelData({
                ...panelData, 
                location: {...panelData.location, lat: text}
              })}
              placeholder="es. 45.4642"
              keyboardType="decimal-pad"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Longitudine *</Text>
            <TextInput
              style={styles.input}
              value={panelData.location.lon}
              onChangeText={(text) => setPanelData({
                ...panelData, 
                location: {...panelData.location, lon: text}
              })}
              placeholder="es. 9.1900"
              keyboardType="decimal-pad"
            />
          </View>
          
          <View style={styles.note}>
            <Ionicons name="information-circle-outline" size={20} color="#666" />
            <Text style={styles.noteText}>
              I campi contrassegnati con * sono obbligatori
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Render pickers */}
      {renderTypePicker()}
      {renderOrientationPicker()}
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
  saveButton: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  selectButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 16,
    color: '#333',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  locationButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  locationButtonText: {
    color: '#2196F3',
    fontSize: 14,
    marginLeft: 5,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9C4',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 30,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  // Stili per il selettore modale
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    paddingVertical: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 15,
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
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedOptionItem: {
    backgroundColor: '#E3F2FD',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOptionText: {
    color: '#2196F3',
    fontWeight: '500',
  },
});

export default AddPanelScreen;