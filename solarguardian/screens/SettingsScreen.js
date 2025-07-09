// File: screens/SettingsScreen.js
import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Context
import { AppContext } from '../context/AppContext';

const SettingsScreen = ({ navigation }) => {
  const { user, logout } = useContext(AppContext);
  
  // Stati per le impostazioni
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [dataSync, setDataSync] = useState(true);
  const [locationPermission, setLocationPermission] = useState(true);
  
  // Sezione impostazioni utente
  const renderUserSection = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <View style={styles.profileContainer}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user ? user.name.charAt(0) : 'G'}
              </Text>
            </View>
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>
              {user ? user.name : 'Ospite'}
            </Text>
            <Text style={styles.userEmail}>
              {user ? user.email : 'Accesso non effettuato'}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => Alert.alert('Info', 'Funzionalità di profilo in sviluppo')}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="person-outline" size={22} color="#2196F3" />
            <Text style={styles.settingText}>Il mio profilo</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => Alert.alert('Info', 'Funzionalità in sviluppo')}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="key-outline" size={22} color="#2196F3" />
            <Text style={styles.settingText}>Sicurezza</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity 
        style={styles.settingItem}
        onPress={() => navigation.navigate('Panels', { screen: 'DevSettings' })}     
         >
        <Ionicons name="code-working" size={24} color="#333" />
        <Text style={styles.settingText}>Impostazioni Sviluppatore</Text>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>

        {user ? (
          <TouchableOpacity 
            style={[styles.settingItem, styles.logoutButton]}
            onPress={() => {
              Alert.alert(
                'Logout',
                'Sei sicuro di voler effettuare il logout?',
                [
                  { text: 'Annulla', style: 'cancel' },
                  { text: 'Logout', onPress: logout, style: 'destructive' }
                ]
              );
            }}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="log-out-outline" size={22} color="#F44336" />
              <Text style={[styles.settingText, { color: '#F44336' }]}>Logout</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.settingItem, styles.loginButton]}
            onPress={() => navigation.navigate('Login')}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="log-in-outline" size={22} color="#2196F3" />
              <Text style={styles.settingText}>Accedi</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>
    );
    
  };
  
  // Sezione preferenze app
  const renderPreferencesSection = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferenze App</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="notifications-outline" size={22} color="#2196F3" />
            <Text style={styles.settingText}>Notifiche</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: '#ddd', true: '#2196F3' }}
            thumbColor={notifications ? '#fff' : '#f4f3f4'}
          />
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="moon-outline" size={22} color="#2196F3" />
            <Text style={styles.settingText}>Tema scuro</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: '#ddd', true: '#2196F3' }}
            thumbColor={darkMode ? '#fff' : '#f4f3f4'}
          />
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="refresh-outline" size={22} color="#2196F3" />
            <Text style={styles.settingText}>Sincronizzazione dati automatica</Text>
          </View>
          <Switch
            value={dataSync}
            onValueChange={setDataSync}
            trackColor={{ false: '#ddd', true: '#2196F3' }}
            thumbColor={dataSync ? '#fff' : '#f4f3f4'}
          />
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="location-outline" size={22} color="#2196F3" />
            <Text style={styles.settingText}>Servizi di localizzazione</Text>
          </View>
          <Switch
            value={locationPermission}
            onValueChange={setLocationPermission}
            trackColor={{ false: '#ddd', true: '#2196F3' }}
            thumbColor={locationPermission ? '#fff' : '#f4f3f4'}
          />
        </View>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => Alert.alert('Info', 'Funzionalità in sviluppo')}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="language-outline" size={22} color="#2196F3" />
            <Text style={styles.settingText}>Lingua</Text>
          </View>
          <View style={styles.settingRight}>
            <Text style={styles.settingValue}>Italiano</Text>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </View>
        </TouchableOpacity>
      </View>
    );
  };
  
  // Sezione impianto solare
  const renderSystemSection = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Impianto Solare</Text>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => navigation.navigate('Panels')}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="grid-outline" size={22} color="#2196F3" />
            <Text style={styles.settingText}>Gestisci pannelli</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => Alert.alert('Info', 'Funzionalità in sviluppo')}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="cloud-upload-outline" size={22} color="#2196F3" />
            <Text style={styles.settingText}>Importa dati esterni</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => Alert.alert('Info', 'Funzionalità in sviluppo')}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="analytics-outline" size={22} color="#2196F3" />
            <Text style={styles.settingText}>Calibrazione sensori</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => Alert.alert('Info', 'Funzionalità in sviluppo')}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="alert-circle-outline" size={22} color="#2196F3" />
            <Text style={styles.settingText}>Soglie di avviso</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
      </View>
    );
  };
  
  // Sezione supporto
  const renderSupportSection = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Supporto</Text>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => Alert.alert('Info', 'Funzionalità in sviluppo')}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="help-circle-outline" size={22} color="#2196F3" />
            <Text style={styles.settingText}>FAQ e Aiuto</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => Alert.alert('Info', 'Funzionalità in sviluppo')}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#2196F3" />
            <Text style={styles.settingText}>Contatta il supporto</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => Alert.alert('Info', 'Funzionalità in sviluppo')}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="book-outline" size={22} color="#2196F3" />
            <Text style={styles.settingText}>Guida per l'utente</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => Linking.openURL('https://www.example.com/privacy')}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#2196F3" />
            <Text style={styles.settingText}>Privacy policy</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Impostazioni</Text>
        </View>
        
        {renderUserSection()}
        {renderPreferencesSection()}
        {renderSystemSection()}
        {renderSupportSection()}
        
        <View style={styles.footer}>
          <Text style={styles.version}>SolarGuardian v1.0.0</Text>
          <TouchableOpacity
            onPress={() => Alert.alert('Info', 'SolarGuardian © 2025\nTutti i diritti riservati.')}
          >
            <Text style={styles.copyright}>© 2025 SolarGuardian</Text>
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  logoutButton: {
    borderBottomWidth: 0,
    marginTop: 5,
  },
  loginButton: {
    borderBottomWidth: 0,
    marginTop: 5,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  version: {
    fontSize: 14,
    color: '#999',
    marginBottom: 5,
  },
  copyright: {
    fontSize: 12,
    color: '#999',
  },
});

export default SettingsScreen;