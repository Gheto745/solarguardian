// File: screens/DevSettingsScreen.js
import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import WeatherService from '../services/WeatherService';
import { AppContext } from '../context/AppContext';

const DevSettingsScreen = ({ navigation }) => {
  const [isClearing, setIsClearing] = useState(false);
  const [lastActionMessage, setLastActionMessage] = useState('');
  
  // Accesso al context per aggiornare i pannelli
  const { setPanelsData, setWeatherData } = useContext(AppContext);
  
  // Funzione per svuotare solo la cache temporanea (meteo, analisi, ecc.)
  const clearTemporaryCache = async () => {
    try {
      setIsClearing(true);
      setLastActionMessage('Svuotamento cache temporanea in corso...');
      
      const keys = await AsyncStorage.getAllKeys();
      
      // Chiavi da MANTENERE (più complete)
      const keysToKeep = [
        'user', 
        'appSettings', 
        'theme',
        'panelsData',           // MANTIENI I PANNELLI
        'arSettings',           // MANTIENI IMPOSTAZIONI AR
        'ar_tutorial_completed', // MANTIENI STATO TUTORIAL
        'aiAnalysisData'        // MANTIENI ANALISI AI
      ];
      
      // Filtra solo cache temporanea (meteo, immagini, ecc.)
      const keysToRemove = keys.filter(key => {
        // Rimuovi solo cache meteo e temporanea
        return (
          key.startsWith('weather_') || 
          key.startsWith('currentWeather_') || 
          key.startsWith('weatherForecast_') || 
          key.startsWith('solarRadiation_') ||
          key.startsWith('solarWeather_') ||
          key.startsWith('cache_') ||
          key.startsWith('temp_')
        ) && !keysToKeep.includes(key);
      });
      
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        console.log(`🗑️ Rimossi ${keysToRemove.length} elementi dalla cache temporanea`);
        setLastActionMessage(`Cache temporanea svuotata: ${keysToRemove.length} elementi rimossi`);
        
        // Aggiorna anche lo state del meteo
        if (setWeatherData) {
          setWeatherData(null);
        }
      } else {
        setLastActionMessage('Nessun dato temporaneo in cache');
      }
      
      Alert.alert(
        'Cache Temporanea Svuotata',
        'I dati meteo e temporanei sono stati eliminati. I pannelli sono stati mantenuti.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Errore:', error);
      setLastActionMessage(`Errore: ${error.message}`);
      Alert.alert(
        'Errore',
        `Impossibile svuotare la cache: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsClearing(false);
    }
  };
  
  // Funzione per eliminare SOLO i pannelli
  const clearPanelsOnly = async () => {
    try {
      setIsClearing(true);
      setLastActionMessage('Eliminazione pannelli in corso...');
      
      // Elimina da AsyncStorage
      await AsyncStorage.removeItem('panelsData');
      
      // IMPORTANTE: Aggiorna anche lo state in memoria
      if (setPanelsData) {
        setPanelsData([]);
      }
      
      console.log('🗑️ Pannelli eliminati');
      setLastActionMessage('Tutti i pannelli sono stati eliminati');
      
      Alert.alert(
        'Pannelli Eliminati',
        'Tutti i pannelli sono stati eliminati dal sistema.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Errore:', error);
      setLastActionMessage(`Errore: ${error.message}`);
      Alert.alert('Errore', `Impossibile eliminare i pannelli: ${error.message}`);
    } finally {
      setIsClearing(false);
    }
  };
  
  // Funzione per svuotare TUTTO (con conferma)
  const clearEverything = async () => {
    try {
      Alert.alert(
        'Conferma Eliminazione Totale',
        'Questa azione eliminerà TUTTI i dati inclusi pannelli, impostazioni e preferenze. Continuare?',
        [
          { text: 'Annulla', style: 'cancel' },
          { 
            text: 'Elimina Tutto', 
            style: 'destructive',
            onPress: async () => {
              setIsClearing(true);
              setLastActionMessage('Eliminazione COMPLETA in corso...');
              
              const keys = await AsyncStorage.getAllKeys();
              await AsyncStorage.multiRemove(keys);
              
              // Resetta tutto nello state
              if (setPanelsData) setPanelsData([]);
              if (setWeatherData) setWeatherData(null);
              
              console.log('🗑️ TUTTO eliminato');
              setLastActionMessage('Tutti i dati sono stati eliminati');
              setIsClearing(false);
              
              Alert.alert(
                'Reset Completo',
                'L\'app è stata completamente resettata. Riavvia l\'app.',
                [{ text: 'OK' }]
              );
            }
          }
        ]
      );
    } catch (error) {
      console.error('Errore:', error);
      setIsClearing(false);
    }
  };
  
  // Funzione per svuotare solo la cache meteo
  const clearWeatherCache = async () => {
    try {
      setIsClearing(true);
      setLastActionMessage('Svuotamento cache meteo in corso...');
      
      const keys = await AsyncStorage.getAllKeys();
      
      const weatherKeys = keys.filter(key => 
        key.startsWith('weather_') || 
        key.startsWith('currentWeather_') || 
        key.startsWith('weatherForecast_') || 
        key.startsWith('solarRadiation_') ||
        key.startsWith('solarWeather_')
      );
      
      if (weatherKeys.length > 0) {
        await AsyncStorage.multiRemove(weatherKeys);
        console.log(`🗑️ Rimossi ${weatherKeys.length} elementi dalla cache meteo`);
        setLastActionMessage(`Cache meteo svuotata: ${weatherKeys.length} elementi rimossi`);
      } else {
        setLastActionMessage('Nessun dato meteo in cache');
      }
      
      Alert.alert(
        'Cache meteo svuotata',
        'Tutti i dati meteo sono stati eliminati dalla cache.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Errore durante lo svuotamento della cache meteo:', error);
      setLastActionMessage(`Errore: ${error.message}`);
      
      Alert.alert(
        'Errore',
        `Impossibile svuotare la cache meteo: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsClearing(false);
    }
  };
  
  // Funzione per svuotare la cache del server
  const clearServerCache = async () => {
    try {
      setIsClearing(true);
      setLastActionMessage('Svuotamento cache server in corso...');
      
      const response = await axios.get(`${WeatherService.baseURL}/debug/clear-cache`);
      
      if (response.data.success) {
        console.log('🗑️ Cache server svuotata con successo');
        setLastActionMessage('Cache server svuotata con successo');
        
        Alert.alert(
          'Cache server svuotata',
          'La cache del server è stata svuotata con successo.',
          [{ text: 'OK' }]
        );
      } else {
        throw new Error('Risposta server non valida');
      }
    } catch (error) {
      console.error('Errore durante lo svuotamento della cache server:', error);
      setLastActionMessage(`Server non disponibile o endpoint non configurato`);
      
      Alert.alert(
        'Server non disponibile',
        'Il server potrebbe non essere in esecuzione o l\'endpoint di debug non è configurato.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsClearing(false);
    }
  };
  
  // Funzione per richiedere i dati meteo con refresh forzato
  const forceWeatherRefresh = async () => {
    try {
      setIsClearing(true);
      setLastActionMessage('Aggiornamento dati meteo in corso...');
      
      const lat = 45.4642;
      const lon = 9.1900;
      
      const originalGetSolarWeatherData = WeatherService.getSolarWeatherData;
      
      WeatherService.getSolarWeatherData = async (lat, lon) => {
        const cacheKey = `solarWeather_${lat.toFixed(2)}_${lon.toFixed(2)}`;
        await AsyncStorage.removeItem(cacheKey);
        
        console.log('🔄 Forzando aggiornamento dati meteo ignorando cache');
        return originalGetSolarWeatherData.call(WeatherService, lat, lon);
      };
      
      const data = await WeatherService.getSolarWeatherData(lat, lon);
      
      WeatherService.getSolarWeatherData = originalGetSolarWeatherData;
      
      console.log('✅ Dati meteo aggiornati con successo');
      setLastActionMessage('Dati meteo aggiornati con successo');
      
      Alert.alert(
        'Dati meteo aggiornati',
        'I dati meteo sono stati aggiornati con successo.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Errore durante l\'aggiornamento dei dati meteo:', error);
      setLastActionMessage(`Errore: ${error.message}`);
      
      Alert.alert(
        'Errore',
        `Impossibile aggiornare i dati meteo: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsClearing(false);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Impostazioni Sviluppatore</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gestione Cache</Text>
        
        <TouchableOpacity 
          style={[styles.button, styles.weatherButton, isClearing && styles.buttonDisabled]}
          onPress={clearWeatherCache}
          disabled={isClearing}
        >
          <Ionicons name="cloud-outline" size={24} color="white" />
          <Text style={styles.buttonText}>Svuota Cache Meteo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.tempButton, isClearing && styles.buttonDisabled]}
          onPress={clearTemporaryCache}
          disabled={isClearing}
        >
          <Ionicons name="time-outline" size={24} color="white" />
          <Text style={styles.buttonText}>Svuota Cache Temporanea</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.panelsButton, isClearing && styles.buttonDisabled]}
          onPress={clearPanelsOnly}
          disabled={isClearing}
        >
          <Ionicons name="grid-outline" size={24} color="white" />
          <Text style={styles.buttonText}>Elimina Tutti i Pannelli</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.serverButton, isClearing && styles.buttonDisabled]}
          onPress={clearServerCache}
          disabled={isClearing}
        >
          <Ionicons name="server-outline" size={24} color="white" />
          <Text style={styles.buttonText}>Svuota Cache Server</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.dangerButton, isClearing && styles.buttonDisabled]}
          onPress={clearEverything}
          disabled={isClearing}
        >
          <Ionicons name="trash-outline" size={24} color="white" />
          <Text style={styles.buttonText}>Reset Completo App</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aggiornamento Dati</Text>
        
        <TouchableOpacity 
          style={[styles.button, styles.refreshButton, isClearing && styles.buttonDisabled]}
          onPress={forceWeatherRefresh}
          disabled={isClearing}
        >
          <Ionicons name="refresh-outline" size={24} color="white" />
          <Text style={styles.buttonText}>Forza Aggiornamento Meteo</Text>
        </TouchableOpacity>
      </View>
      
      {lastActionMessage ? (
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>{lastActionMessage}</Text>
        </View>
      ) : null}
      
      <View style={styles.infoContainer}>
        <Ionicons name="information-circle-outline" size={20} color="#666" />
        <Text style={styles.infoText}>
          Usa queste opzioni con cautela. Alcuni dati potrebbero non essere recuperabili dopo l'eliminazione.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#555',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  weatherButton: {
    backgroundColor: '#3498db',
  },
  tempButton: {
    backgroundColor: '#9b59b6',
  },
  panelsButton: {
    backgroundColor: '#e67e22',
  },
  serverButton: {
    backgroundColor: '#34495e',
  },
  dangerButton: {
    backgroundColor: '#e74c3c',
  },
  refreshButton: {
    backgroundColor: '#27ae60',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 10,
    fontWeight: '500',
  },
  messageContainer: {
    backgroundColor: '#ecf0f1',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  messageText: {
    color: '#2c3e50',
    fontSize: 14,
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    color: '#856404',
    fontSize: 14,
  },
});

export default DevSettingsScreen;