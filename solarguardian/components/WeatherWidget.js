// File: components/WeatherWidget.js - VERSIONE PULITA
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const WeatherWidget = ({ weatherData, style }) => {
  const getWeatherIcon = (condition) => {
    switch(condition?.toLowerCase()) {
      case 'sunny':
        return 'sunny-outline';
      case 'partly-cloudy':
        return 'partly-sunny-outline';
      case 'cloudy':
        return 'cloud-outline';
      case 'rainy':
        return 'rainy-outline';
      case 'thunderstorm':
        return 'thunderstorm-outline';
      default:
        return 'help-circle-outline';
    }
  };

  // Se non ci sono dati meteo reali, non mostrare il widget
  if (!weatherData || 
      weatherData.currentCondition === 'unknown' || 
      weatherData.temperature === null) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.currentWeather}>
        <Ionicons 
          name={getWeatherIcon(weatherData.currentCondition)} 
          size={36} 
          color="#2196F3" 
        />
        <View style={styles.weatherInfo}>
          <Text style={styles.temperature}>
            {weatherData.temperature ? `${weatherData.temperature}°C` : '--°C'}
          </Text>
          <Text style={styles.irradiance}>
            {weatherData.solarIrradiance ? `${weatherData.solarIrradiance} W/m²` : 'Irraggiamento non disponibile'}
          </Text>
        </View>
      </View>
      
      {/* Previsioni solo se disponibili */}
      {weatherData.forecast && weatherData.forecast.length > 0 && (
        <View style={styles.forecast}>
          {weatherData.forecast.slice(0, 3).map((day, index) => (
            <View key={index} style={styles.forecastDay}>
              <Text style={styles.dayText}>{day.day || 'N/A'}</Text>
              <Ionicons 
                name={getWeatherIcon(day.condition)} 
                size={22} 
                color="#666" 
              />
              <Text style={styles.irradianceSmall}>
                {day.irradiance ? `${day.irradiance} W/m²` : '--'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  currentWeather: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  weatherInfo: {
    marginLeft: 15,
  },
  temperature: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  irradiance: {
    fontSize: 14,
    color: '#666',
  },
  forecast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  forecastDay: {
    alignItems: 'center',
  },
  dayText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  irradianceSmall: {
    fontSize: 10,
    color: '#888',
    marginTop: 3,
  },
});

export default WeatherWidget;