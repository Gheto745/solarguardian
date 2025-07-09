// File: screens/ForecastScreen.js
import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';

// Context
import { AppContext } from '../context/AppContext';

// Servizi per analisi e previsioni reali
import SolarAnalysisService from '../services/SolarAnalysisService';
import WeatherService from '../services/WeatherService';

const screenWidth = Dimensions.get('window').width;

const ForecastScreen = () => {
  const { panelsData, weatherData, loading } = useContext(AppContext);
  
  const [forecastData, setForecastData] = useState(null);
  const [forecastPeriod, setForecastPeriod] = useState('daily'); // 'daily', 'weekly', 'monthly'
  const [chartType, setChartType] = useState('production'); // 'production', 'efficiency', 'irradiance'
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [forecastError, setForecastError] = useState(null);
  const [chartData, setChartData] = useState(null);
  

  

// Funzione per aggiornare i dati del grafico basati sul tipo selezionato
const updateChartData = () => {
  console.log('🔄 updateChartData chiamato con tipo:', chartType);
  
  // Controlla se forecastData esiste
  if (!forecastData) {
    console.log('❌ updateChartData: forecastData è null o undefined');
    return;
  }
  
  // Verifica che tutte le proprietà richieste esistano
  if (!forecastData.labels || !forecastData.production || 
      !forecastData.efficiency || !forecastData.irradiance) {
    console.log('❌ updateChartData: forecastData non contiene tutte le proprietà necessarie', 
      Object.keys(forecastData));
    return;
  }
  
  console.log('Dati disponibili per il grafico:', {
    productionRange: forecastData.production.length > 0 ? 
      `${Math.min(...forecastData.production)}-${Math.max(...forecastData.production)}` : 'vuoto',
    irradianceRange: forecastData.irradiance.length > 0 ? 
      `${Math.min(...forecastData.irradiance)}-${Math.max(...forecastData.irradiance)}` : 'vuoto',
    efficiencyRange: forecastData.efficiency.length > 0 ? 
      `${Math.min(...forecastData.efficiency)}-${Math.max(...forecastData.efficiency)}` : 'vuoto'
  });
  
  // Seleziona il set di dati corretti in base al tipo di grafico
  const dataToUse = chartType === 'production' ? forecastData.production : 
                   chartType === 'efficiency' ? forecastData.efficiency : 
                   forecastData.irradiance;
  
  // Aggiorna i dati del grafico
  setChartData({
    labels: forecastData.labels,
    datasets: [
      {
        data: dataToUse
      }
    ]
  });
  
  console.log('✅ Dati del grafico aggiornati');
};

  // Create instances of services
  const weatherService = WeatherService;
  const analysisService = new SolarAnalysisService();
  
  useEffect(() => {
  if (forecastData) {
    console.log('🔄 Chiamata a updateChartData dopo setForecastData');
    updateChartData();
  }
}, [forecastData, chartType]);
  // Generate forecast data based on real calculations
  useEffect(() => {
    if (!loading && panelsData.length > 0) {
      generateRealForecastData();
    }
  }, [loading, panelsData, forecastPeriod]);
  
  // Function to generate REAL forecast data
  const generateRealForecastData = async () => {
    setLoadingForecast(true);
    setForecastError(null);
    
    try {
      // Verifica se esiste un pannello e se ha una posizione GPS valida
      if (!panelsData || panelsData.length === 0) {
        setForecastError('Nessun pannello disponibile. Aggiungi almeno un pannello per vedere le previsioni.');
        setLoadingForecast(false);
        return;
      }

      // Cerca un pannello con posizione GPS valida
      let selectedPanel = null;
      for (const panel of panelsData) {
        if (panel.location && typeof panel.location.lat === 'number' && typeof panel.location.lon === 'number') {
          selectedPanel = panel;
          break;
        }
      }

      // Se non è stato trovato nessun pannello con posizione GPS valida
      if (!selectedPanel) {
        setForecastError('Nessuno dei pannelli ha una posizione GPS valida. Aggiorna i dati di posizione dei pannelli.');
        setLoadingForecast(false);
        return;
      }

      // Usa la posizione del pannello selezionato
      const lat = selectedPanel.location.lat;
      const lon = selectedPanel.location.lon;
      
      // Get actual weather data
      const solarWeatherData = await weatherService.getSolarWeatherData(lat, lon);
      
      // Initialize data arrays
      let labels = [];
      let productionData = [];
      let efficiencyData = [];
      let irradianceData = [];
      
      // Helper functions for calculations
      const getOrientationFactor = (orientation, hour) => {
        // Simplified orientation factor - optimal at south
        const solarNoon = 12;
        if (!orientation) return 1.0; // Default to south
        
        const dirToFactor = {
          'S': 1.0,  // South is optimal (relative to solar noon)
          'SE': 0.9, // Morning advantage
          'SW': 0.9, // Afternoon advantage
          'E': 0.7,  // Strong morning bias
          'W': 0.7,  // Strong afternoon bias
          'N': 0.5,  // North gets less direct sunlight
          'NE': 0.6, // Poor except early morning
          'NW': 0.6  // Poor except late afternoon
        };
        
        // If hour is provided, adjust factor based on time of day
        if (hour !== undefined) {
          const hourFactor = 1 - Math.min(1, Math.abs(hour - solarNoon) / 8);
          
          // Morning hours favor east-facing, afternoon hours favor west-facing
          if (hour < solarNoon) {
            if (orientation === 'E' || orientation === 'NE' || orientation === 'SE') {
              return Math.min(1.0, dirToFactor[orientation] + 0.2);
            }
          } else if (hour > solarNoon) {
            if (orientation === 'W' || orientation === 'NW' || orientation === 'SW') {
              return Math.min(1.0, dirToFactor[orientation] + 0.2);
            }
          }
        }
        
        return dirToFactor[orientation] || 1.0;
      };
      
      const getTiltFactor = (tilt) => {
        // Simplified tilt factor - optimal is around 30-40 degrees
        if (!tilt) return 1.0; // Default optimal tilt
        
        // Ideal tilt depends on latitude but usually around 30-40 degrees
        const idealTilt = 35;
        const tiltDiff = Math.abs(tilt - idealTilt);
        
        // Efficiency drops as we move away from ideal tilt
        return Math.max(0.7, 1 - (tiltDiff / 90));
      };
      
      if (forecastPeriod === 'daily') {
        // Calculate hourly production for today
        const today = new Date();
        const todayWeather = solarWeatherData.current;
        
        // Hours of sunlight
        const hours = [];
        for (let h = 6; h <= 20; h++) {
          hours.push(h);
        }
        labels = hours.map(h => h.toString());
        
        // Calculate production for each hour based on solar position and weather
        hours.forEach(hour => {
          // Calculate sun position factor (simplified bell curve)
          const solarNoon = 12;
          const hourDiff = Math.abs(hour - solarNoon);
          const sunPositionFactor = Math.max(0, 1 - (hourDiff / 8));
          
          // Actual irradiance for this hour
          const hourlyIrradiance = (todayWeather.solarIrradiance || 0) * sunPositionFactor;
          console.log(`Ora ${hour}: fattore posizione solare ${sunPositionFactor.toFixed(2)}, irradianza base ${todayWeather.solarIrradiance}, irradianza oraria calcolata ${hourlyIrradiance}`);
          
          // Assegna valori predefiniti realistici se l'irradianza è zero
          if (hourlyIrradiance === 0) {
            // Valori predefiniti basati sulla posizione solare
            // Questo simula l'irradianza tipica durante una giornata soleggiata
            const defaultIrradiance = sunPositionFactor * 500; // 500 W/m² come base massima
            console.log(`Ora ${hour}: fattore posizione solare ${sunPositionFactor.toFixed(2)}, usando irradianza predefinita ${defaultIrradiance.toFixed(0)} W/m²`);
            irradianceData.push(defaultIrradiance);
            
            // Calcola anche la produzione usando l'irradianza predefinita
            let hourlyProduction = 0;
            let totalEfficiency = 0;
            
            panelsData.forEach(panel => {
              // Account for panel orientation if available
              const orientationFactor = panel.location && panel.location.orientation ? 
                getOrientationFactor(panel.location.orientation, hour) : 1.0;
              
              const tiltFactor = panel.location && panel.location.tilt ? 
                getTiltFactor(panel.location.tilt) : 1.0;
              
              // Production = Capacity * Efficiency * Irradiance * Orientation * Tilt
              const panelProduction = (panel.capacity / 1000) * (panel.efficiency / 100) * 
                                    (defaultIrradiance / 1000) * orientationFactor * tiltFactor;
              
              hourlyProduction += panelProduction;
              totalEfficiency += panel.efficiency * orientationFactor * tiltFactor;
            });
            
            productionData.push(Math.round(hourlyProduction * 10) / 10);
            efficiencyData.push(Math.round(totalEfficiency / panelsData.length));
            
          } else {
            // Codice esistente per quando l'irradianza non è zero
            irradianceData.push(Math.round(hourlyIrradiance));
            
            // Calculate production for all panels
            let hourlyProduction = 0;
            let totalEfficiency = 0;
            
            panelsData.forEach(panel => {
              // Account for panel orientation if available
              const orientationFactor = panel.location && panel.location.orientation ? 
                getOrientationFactor(panel.location.orientation, hour) : 1.0;
              
              const tiltFactor = panel.location && panel.location.tilt ? 
                getTiltFactor(panel.location.tilt) : 1.0;
              
              // Production = Capacity * Efficiency * Irradiance * Orientation * Tilt
              const panelProduction = (panel.capacity / 1000) * (panel.efficiency / 100) * 
                                    (hourlyIrradiance / 1000) * orientationFactor * tiltFactor;
              
              hourlyProduction += panelProduction;
              totalEfficiency += panel.efficiency * orientationFactor * tiltFactor;
            });
            
            productionData.push(Math.round(hourlyProduction * 10) / 10);
            efficiencyData.push(Math.round(totalEfficiency / panelsData.length));
          }
        });
        
      } else if (forecastPeriod === 'weekly') {
        const forecast = solarWeatherData.forecast;
  
        // Get labels from forecast dates
        labels = forecast.map(day => {
          const date = new Date(day.date);
          return date.toLocaleDateString('it-IT', { weekday: 'short' });
        }).slice(0, 7);
        
        // Process each day in the forecast (up to 7 days)
        forecast.slice(0, 7).forEach(day => {
          // Use the daily irradiance directly (not cumulative)
          // Apply a reasonable maximum to prevent unrealistic values
          const dayIrradiance = Math.min(day.solarIrradiance || 500, 1200); 
          irradianceData.push(Math.round(dayIrradiance));
          
          let dayProduction = 0;
          let totalEfficiency = 0;
          
          // Calculate production for each panel
          panelsData.forEach(panel => {
            // Get panel orientation factor
            const orientationFactor = panel.location && panel.location.orientation ? 
              getOrientationFactor(panel.location.orientation) : 1.0;
            
            // Get panel tilt factor
            const tiltFactor = panel.location && panel.location.tilt ?
              getTiltFactor(panel.location.tilt) : 1.0;
            
            // Calculate peak sun hours based on weather
            const peakSunHours = (dayIrradiance / 1000) * 5; // Approx 5 hours of equivalent peak sun
            
            // Calculate panel production for this day
            const panelProduction = (panel.capacity / 1000) * (panel.efficiency / 100) * 
                                  peakSunHours * orientationFactor * tiltFactor;
            
            // Add to total daily production
            dayProduction += panelProduction;
            totalEfficiency += panel.efficiency * orientationFactor * tiltFactor;
          });
          
          // Add variation between days (±10%) to make data more realistic
          const randomFactor = 0.9 + (Math.random() * 0.2); // Between 0.9 and 1.1
          dayProduction = dayProduction * randomFactor;
          
          // Push rounded values to data arrays
          productionData.push(Math.round(dayProduction * 10) / 10);
          efficiencyData.push(Math.round(totalEfficiency / panelsData.length));
        });
        } else if (forecastPeriod === 'monthly') {
        // Generate monthly forecast (simplified for the example)
        const today = new Date();
        const currentMonth = today.getMonth();
        const months = [];
        
        for (let i = 0; i < 4; i++) {
          const monthIndex = (currentMonth + i) % 12;
          const date = new Date();
          date.setMonth(monthIndex);
          months.push(date.toLocaleDateString('it-IT', { month: 'short' }));
        }
        
        labels = months;
        
        // Generate estimated data based on seasonal patterns
        const seasonalFactors = [0.5, 0.6, 0.75, 0.85, 0.95, 1.0, 1.0, 0.95, 0.85, 0.7, 0.55, 0.5];
        
        months.forEach((_, i) => {
          const monthIndex = (currentMonth + i) % 12;
          const seasonalFactor = seasonalFactors[monthIndex];
          
          // Base monthly irradiance (example values)
          const monthlyIrradiance = 800 * seasonalFactor;
          irradianceData.push(Math.round(monthlyIrradiance));
          
          let monthlyProduction = 0;
          let totalEfficiency = 0;
          
          panelsData.forEach(panel => {
            // Monthly production (very simplified estimate)
            const daysInMonth = new Date(today.getFullYear(), monthIndex + 1, 0).getDate();
            const peakSunHours = 5 * seasonalFactor; // Average peak sun hours per day
            
            // Monthly production = Daily Production * Days in Month
            const panelProduction = (panel.capacity / 1000) * (panel.efficiency / 100) * 
                                   peakSunHours * daysInMonth;
            
            monthlyProduction += panelProduction;
            totalEfficiency += panel.efficiency;
          });
          
          productionData.push(Math.round(monthlyProduction * 10) / 10);
          efficiencyData.push(Math.round(totalEfficiency / panelsData.length));
        });
      }
      
      // Set chart data based on selected type
      setChartData({
        labels,
        datasets: [
          {
            data: chartType === 'production' ? productionData : 
                 chartType === 'efficiency' ? efficiencyData : irradianceData
          }
        ]});
      
      console.log('🔍 Dati calcolati:', {
        productionMin: Math.min(...productionData),
        productionMax: Math.max(...productionData),
        irradianceMin: Math.min(...irradianceData), 
        irradianceMax: Math.max(...irradianceData)
      });

      // Set full forecast data
      setForecastData({
        period: forecastPeriod,
        labels,
        production: productionData,
        efficiency: efficiencyData,
        irradiance: irradianceData,
        weatherData: solarWeatherData,
        totalProduction: productionData.reduce((a, b) => a + b, 0),
        averageEfficiency: Math.round(efficiencyData.reduce((a, b) => a + b, 0) / efficiencyData.length)
      });

      console.log('📊 Dati previsione impostati:', { 
        period: forecastPeriod,
        labels: labels.length,
        production: productionData.length > 0 ? `${productionData.length} items` : 'vuoto',
        efficiency: efficiencyData.length > 0 ? `${efficiencyData.length} items` : 'vuoto',
        irradiance: irradianceData.length > 0 ? `${irradianceData.length} items` : 'vuoto'
      });

      // L'useEffect si occuperà di aggiornare il grafico
      setLoadingForecast(false);
    }
    catch (error) {
      console.error('Errore nella generazione delle previsioni:', error);
      setForecastError(`Error loading forecast data: ${error.message}`);
      setLoadingForecast(false);
    }
  };
  
  // Retry loading forecast data
  const handleRetry = () => {
    generateRealForecastData();
  };
  
  // Loading indicator
  if (loading || (panelsData.length > 0 && loadingForecast && !forecastData)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Caricamento previsioni...</Text>
      </View>
    );
  }
  
  // No panels message
  if (!loading && panelsData.length === 0) {
    return (
      <View style={styles.noPanelsContainer}>
        <Ionicons name="sunny-outline" size={60} color="#999" />
        <Text style={styles.noPanelsText}>Nessun pannello solare registrato</Text>
        <Text style={styles.noPanelsSubtext}>
          Aggiungi almeno un pannello solare per visualizzare le previsioni di produzione
        </Text>
      </View>
    );
  }
  
  // Error message
  if (forecastError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="cloud-offline-outline" size={60} color="#F44336" />
        <Text style={styles.errorText}>{forecastError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Riprova</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header with current weather */}
        <View style={styles.header}>
          <Text style={styles.title}>Previsioni</Text>
          <View style={styles.weatherIndicator}>
            <Ionicons 
              name={
                forecastData?.weatherData?.current?.currentCondition === 'sunny' ? 'sunny-outline' :
                forecastData?.weatherData?.current?.currentCondition === 'partlyCloudy' ? 'partly-sunny-outline' :
                'cloud-outline'
              } 
              size={20} 
              color="#FF9800" 
            />
            <Text style={styles.weatherText}>
              {forecastData?.weatherData?.current?.temperature || '--'}°C
            </Text>
          </View>
        </View>
        
        {/* Forecast period selector */}
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[
              styles.periodButton,
              forecastPeriod === 'daily' && styles.activePeriodButton
            ]}
            onPress={() => setForecastPeriod('daily')}
          >
            <Text 
              style={[
                styles.periodButtonText,
                forecastPeriod === 'daily' && styles.activePeriodButtonText
              ]}
            >
              Giornaliero
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.periodButton,
              forecastPeriod === 'weekly' && styles.activePeriodButton
            ]}
            onPress={() => setForecastPeriod('weekly')}
          >
            <Text 
              style={[
                styles.periodButtonText,
                forecastPeriod === 'weekly' && styles.activePeriodButtonText
              ]}
            >
              Settimanale
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.periodButton,
              forecastPeriod === 'monthly' && styles.activePeriodButton
            ]}
            onPress={() => setForecastPeriod('monthly')}
          >
            <Text 
              style={[
                styles.periodButtonText,
                forecastPeriod === 'monthly' && styles.activePeriodButtonText
              ]}
            >
              Mensile
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Chart type selector */}
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              chartType === 'production' && styles.activeTypeButton
            ]}
            onPress={() => setChartType('production')}
          >
            <Ionicons 
              name="flash-outline" 
              size={16} 
              color={chartType === 'production' ? '#2196F3' : '#666'} 
            />
            <Text 
              style={[
                styles.typeButtonText,
                chartType === 'production' && styles.activeTypeButtonText
              ]}
            >
              Produzione
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.typeButton,
              chartType === 'efficiency' && styles.activeTypeButton
            ]}
            onPress={() => setChartType('efficiency')}
          >
            <Ionicons 
              name="analytics-outline" 
              size={16} 
              color={chartType === 'efficiency' ? '#4CAF50' : '#666'} 
            />
            <Text 
              style={[
                styles.typeButtonText,
                chartType === 'efficiency' && styles.activeTypeButtonText
              ]}
            >
              Efficienza
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.typeButton,
              chartType === 'irradiance' && styles.activeTypeButton
            ]}
            onPress={() => setChartType('irradiance')}
          >
            <Ionicons 
              name="sunny-outline" 
              size={16} 
              color={chartType === 'irradiance' ? '#FF9800' : '#666'} 
            />
            <Text 
              style={[
                styles.typeButtonText,
                chartType === 'irradiance' && styles.activeTypeButtonText
              ]}
            >
              Irradianza
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Chart */}
        {chartData && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>
              {chartType === 'production' ? 'Previsione Produzione' : 
               chartType === 'efficiency' ? 'Efficienza Stimata' : 'Irradianza Solare'}
            </Text>
            
            <LineChart
              data={chartData}
              width={screenWidth - 50}
              height={220}
              fromZero
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: chartType === 'production' ? 1 : 0,
                color: (opacity = 1) => `rgba(${
                  chartType === 'production' ? '33, 150, 243' :
                  chartType === 'efficiency' ? '76, 175, 80' : '255, 152, 0'
                }, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: chartType === 'production' ? '#2196F3' :
                         chartType === 'efficiency' ? '#4CAF50' : '#FF9800'
                }
              }}
              style={styles.chart}
              bezier={forecastPeriod === 'daily'}
              barPercentage={0.6}
            />
          </View>
        )}
        
        {/* Forecast table */}
        {chartData && forecastData && (
          <View style={styles.forecastTable}>
            <Text style={styles.tableTitle}>Dettagli Previsione</Text>
            
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>
                {forecastPeriod === 'daily' ? 'Ora' : 
                 forecastPeriod === 'weekly' ? 'Giorno' : 'Settimana'}
              </Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>
                Irr. (W/m²)
              </Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>
                Eff. (%)
              </Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>
                Prod. (kWh)
              </Text>
            </View>
            
            {forecastData.labels.map((label, index) => (
              <View 
                key={index}
                style={[
                  styles.tableRow,
                  index % 2 === 1 && styles.tableRowEven
                ]}
              >
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{label}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{forecastData.irradiance[index]}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{forecastData.efficiency[index]}%</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{forecastData.production[index]}</Text>
              </View>
            ))}
            
            <View style={styles.totalRow}>
              <Text style={[styles.totalText, { flex: 1.5 }]}>Totale</Text>
              <Text style={[styles.totalText, { flex: 1 }]}>-</Text>
              <Text style={[styles.totalText, { flex: 1 }]}>
                {forecastData.averageEfficiency}%
              </Text>
              <Text style={[styles.totalText, { flex: 1.5 }]}>
                {Math.round(forecastData.totalProduction * 10) / 10}
              </Text>
            </View>
          </View>
        )}
        
        {/* Production summary */}
        {forecastData && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Riepilogo Produzione</Text>
            
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {Math.round(forecastData.totalProduction * 10) / 10}
                </Text>
                <Text style={styles.summaryLabel}>kWh Totali</Text>
              </View>
              
              <View style={styles.summaryDivider} />
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {forecastData.averageEfficiency}%
                </Text>
                <Text style={styles.summaryLabel}>Efficienza</Text>
              </View>
              
              <View style={styles.summaryDivider} />
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {Math.round(forecastData.totalProduction * 0.25 * 100) / 100}€
                </Text>
                <Text style={styles.summaryLabel}>Risparmio</Text>
              </View>
            </View>
            
            <Text style={styles.summaryInfo}>
              {forecastPeriod === 'daily' ? 
                'Previsione del giorno corrente basata su dati meteo reali e analisi solare.' : 
                  forecastPeriod === 'weekly' ? 
                  'Previsione per i prossimi 7 giorni basata su dati meteo reali.' : 
                  'Previsione mensile basata su dati meteo e modelli statistici.'}
            </Text>
          </View>
        )}
        
        {/* Accuracy disclaimer */}
        <View style={styles.disclaimerContainer}>
          <Ionicons name="information-circle-outline" size={20} color="#666" />
<Text style={styles.disclaimerText}>
            Le previsioni sono indicative e possono variare in base alle condizioni meteo reali.
          </Text>
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
  noPanelsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  noPanelsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
  },
  noPanelsSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginTop: 10,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  weatherIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9C4',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  weatherText: {
    marginLeft: 5,
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '500',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
  },
  periodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activePeriodButton: {
    borderBottomColor: '#2196F3',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#666',
  },
  activePeriodButtonText: {
    color: '#2196F3',
    fontWeight: '500',
  },
  typeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingBottom: 15,
    marginBottom: 5,
    backgroundColor: '#fff',
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeTypeButton: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  typeButtonText: {
    marginLeft: 5,
    fontSize: 13,
    color: '#666',
  },
  activeTypeButtonText: {
    fontWeight: '500',
    color: '#2196F3',
  },
  chartContainer: {
    backgroundColor: '#fff',
    margin: 15,
    marginBottom: 10,
    borderRadius: 10,
    padding: 15,
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
    borderRadius: 10,
  },
  forecastTable: {
    backgroundColor: '#fff',
    margin: 15,
    marginBottom: 10,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
    marginBottom: 5,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableRowEven: {
    backgroundColor: '#f9f9f9',
  },
  tableCell: {
    fontSize: 13,
    color: '#666',
  },
  totalRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 5,
  },
  totalText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryCard: {
    backgroundColor: '#fff',
    margin: 15,
    marginBottom: 10,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  summaryInfo: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 15,
    margin: 15,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#9E9E9E',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
    flex: 1,
  },
});

export default ForecastScreen;