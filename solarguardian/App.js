// File: App.js
import 'react-native-gesture-handler'; // Deve essere il primo import
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DevSettingsScreen from './screens/DevSettingsScreen';

// Screens
import DashboardScreen from './screens/DashboardScreen';
import PanelsListScreen from './screens/PanelsListScreen';
import PanelDetailScreen from './screens/PanelDetailScreen';
import ARViewScreen from './screens/ARViewScreen';
import ARCalibrationScreen from './screens/ARCalibrationScreen';
import PanelVisionScreen from './screens/PanelVisionScreen';
import ForecastScreen from './screens/ForecastScreen';
import SettingsScreen from './screens/SettingsScreen';
import PanelAnalysisScreen from './screens/PanelAnalysisScreen';
import SystemAnalysisScreen from './screens/SystemAnalysisScreen';
import AddPanelScreen from './screens/AddPanelScreen';

// Context Provider
import { AppContextProvider } from './context/AppContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Stack navigator per la sezione dashboard
function DashboardStack() {
  return (
    <Stack.Navigator 
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="DashboardMain" 
        component={DashboardScreen} 
        options={{ title: 'Dashboard' }}
      />
      <Stack.Screen 
        name="SystemAnalysis" 
        component={SystemAnalysisScreen} 
        options={{ 
          title: 'Analisi Sistema',
          headerShown: true,
          headerBackTitleVisible: false
        }}
      />
    </Stack.Navigator>
  );
}

// Stack navigator per la sezione pannelli
function PanelsStack() {
  return (
    <Stack.Navigator 
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="PanelsList"
    >
      <Stack.Screen 
      name="DevSettings" 
      component={DevSettingsScreen} 
      options={{ title: 'Impostazioni Sviluppatore',
      headerShown: true // Mostra l'header per questa schermata
      }}
    />
      <Stack.Screen 
        name="PanelsList" 
        component={PanelsListScreen} 
        options={{ title: 'Pannelli' }}
      />
      <Stack.Screen 
        name="PanelDetail" 
        component={PanelDetailScreen} 
        options={{ 
          title: 'Dettaglio Pannello',
          headerShown: true,
          headerBackTitleVisible: false
        }} 
      />
      <Stack.Screen 
        name="PanelAnalysis" 
        component={PanelAnalysisScreen} 
        options={{ 
          title: 'Analisi Pannello',
          headerShown: true,
          headerBackTitleVisible: false
        }} 
      />
      <Stack.Screen 
        name="AddPanel" 
        component={AddPanelScreen} 
        options={{ 
          title: 'Aggiungi Pannello',
          headerShown: true,
          headerBackTitleVisible: false,
        }} 
      />
      <Stack.Screen 
        name="PanelVision" 
        component={PanelVisionScreen} 
        options={{ 
          title: 'Analisi Computer Vision',
          headerShown: true,
          headerBackTitleVisible: false
        }} 
      />
      <Stack.Screen 
        name="ARView" 
        component={ARViewScreen} 
        options={{ 
          title: 'AR Scanner',
          headerShown: false,
          headerBackTitleVisible: false,
        }} 
      />
      <Stack.Screen 
        name="ARCalibration" 
        component={ARCalibrationScreen} 
        options={{ 
          title: 'Calibrazione AR',
          headerShown: true,
          headerBackTitleVisible: false,
        }} 
      />
      <Stack.Screen 
        name="SystemAnalysis" 
        component={SystemAnalysisScreen} 
        options={{ 
          title: 'Analisi Sistema',
          headerShown: true,
          headerBackTitleVisible: false
        }} 
      />
    </Stack.Navigator>
  );
}

// Stack navigator per la sezione previsioni
// Stack navigator per la sezione previsioni
const ForecastStack = () => {
  return (
    
    <Stack.Navigator 
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="ForecastMain" 
        component={ForecastScreen}
        options={{ 
          title: 'Previsioni',
        }} 
      />
      <Stack.Screen 
        name="ARCalibration" 
        component={ARCalibrationScreen} 
        options={{ 
          title: 'Calibrazione AR',
          headerShown: true,
          headerBackTitleVisible: false,
        }} 
      />
    </Stack.Navigator>
  );
};

// Stack navigator per Settings
function SettingsStack() {
  return (
    <Stack.Navigator 
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="SettingsMain" 
        component={SettingsScreen}
        options={{ 
          title: 'Impostazioni',
        }} 
      />
      
      <Stack.Screen 
        name="ARCalibration" 
        component={ARCalibrationScreen} 
        options={{ 
          title: 'Calibrazione AR',
          headerShown: true,
          headerBackTitleVisible: false,
        }} 
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContextProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused, color, size }) => {
                let iconName;
                
                if (route.name === 'Dashboard') {
                  iconName = focused ? 'home' : 'home-outline';
                } else if (route.name === 'Panels') {
                  iconName = focused ? 'grid' : 'grid-outline';
                } else if (route.name === 'Forecast') {
                  iconName = focused ? 'partly-sunny' : 'partly-sunny-outline';
                } else if (route.name === 'Settings') {
                  iconName = focused ? 'settings' : 'settings-outline';
                }
                
                return <Ionicons name={iconName} size={size} color={color} />;
              },
              tabBarActiveTintColor: '#2196F3',
              tabBarInactiveTintColor: 'gray',
              headerShown: false,
            })}
          >
            <Tab.Screen 
              name="Dashboard" 
              component={DashboardStack} 
              options={{ title: 'Dashboard' }}
            />
            <Tab.Screen 
              name="Panels" 
              component={PanelsStack} 
              options={{ title: 'Pannelli' }}
            />
            <Tab.Screen 
              name="Forecast" 
              component={ForecastStack} 
              options={{ title: 'Previsioni' }}
            />
            <Tab.Screen 
              name="Settings" 
              component={SettingsStack} 
              options={{ title: 'Impostazioni' }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </AppContextProvider>
    </SafeAreaProvider>
  );
}