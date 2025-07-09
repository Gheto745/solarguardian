// File: services/WeatherService.js
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

class WeatherService {
  constructor() {
    // Stampa messaggio di inizializzazione
    console.log('🌤️ WeatherService inizializzato con cache 4 ore');
    
    // Determina l'URL del backend in base all'ambiente
    this.baseURL = this.getBaseURL();
    
    // Impostazioni di cache
    this.cacheExpiry = {
      current: 30 * 60 * 1000,      // 30 minuti
      forecast: 3 * 60 * 60 * 1000, // 3 ore
      radiation: 4 * 60 * 60 * 1000 // 4 ore
    };
    
    // Chiave API aggiornata
    this.API_KEY = '98b176a1a10eccf8f37b6dae4c84b1e1'; // Usa la stessa chiave del server.js
  }
  
  getBaseURL() {
    // Per web browser
    if (Platform.OS === 'web') {
      return 'http://localhost:3001/api';
    }
    
    // Per Android
    if (Platform.OS === 'android') {
      return 'http://192.168.1.19:3001/api'; 
    }
    
    // Per iOS 
    if (Platform.OS === 'ios') {
      // iOS simulator può usare localhost
      if (Constants.isDevice === false) {
        return 'http://localhost:3001/api';
      }
      // Dispositivo fisico iOS
      return 'http://192.168.1.19:3001/api'; 
    }
    
    // Default
    return 'http://localhost:3001/api';
  }
  
  // METODI PRINCIPALI
  
  // Metodo per ottenere i dati meteo
  async getWeatherData(latitude, longitude, language = 'it') {
    try {
      // Verifica che latitude e longitude siano definiti
      if (latitude === undefined || longitude === undefined || 
          isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
        return this.getDefaultWeatherData();
      }

      // Normalizza i parametri
      const normalizedLat = typeof latitude === 'number' ? latitude : parseFloat(latitude);
      const normalizedLon = typeof longitude === 'number' ? longitude : parseFloat(longitude);
      
      // Controlla se i dati sono in cache e non sono scaduti
      const cachedData = await this.getCachedData(normalizedLat, normalizedLon);
      if (cachedData) {
        console.log('🌐 Usando dati in cache');
        return cachedData;
      }

      console.log('🌐 Cache scaduta/assente - Chiamata API per dati solari');
      const weatherData = await this.fetchWeatherData(normalizedLat, normalizedLon, language);
      
      // Salva i nuovi dati in cache
      await this.cacheData(normalizedLat, normalizedLon, weatherData);
      
      return weatherData;
    } catch (error) {
      console.error('❌ Errore WeatherService:', error.message);
      return this.getDefaultWeatherData();
    }
  }
  
  // Ottiene i dati meteo attuali
  async getCurrentWeather(lat, lon) {
    try {
      // Verifica che lat e lon siano definiti
      if (lat === undefined || lon === undefined || 
          isNaN(parseFloat(lat)) || isNaN(parseFloat(lon))) {
        return this.getDefaultWeatherData();
      }

      // Normalizza i parametri
      const normalizedLat = typeof lat === 'number' ? lat : parseFloat(lat);
      const normalizedLon = typeof lon === 'number' ? lon : parseFloat(lon);
      
      const cachedData = await this.getFromCache('currentWeather', normalizedLat, normalizedLon);
      if (cachedData) return cachedData;
      
      // Usa direttamente OpenWeatherMap API senza passare dal server
      const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${normalizedLat}&lon=${normalizedLon}&units=metric&appid=${this.API_KEY}`;
      console.log(`📡 Chiamata API meteo diretta: ${apiUrl.replace(this.API_KEY, 'HIDDEN')}`);
      
      const response = await axios.get(apiUrl, { timeout: 15000 });
      
      const formattedData = this.formatCurrentWeather(response.data);
      await this.saveToCache('currentWeather', normalizedLat, normalizedLon, formattedData);
      
      return formattedData;
    } catch (error) {
      console.error('Errore nel recupero dei dati meteo attuali:', error);
      
      // Restituisci dati di fallback
      return this.getDefaultWeatherData();
    }
  }
  
  // Ottiene le previsioni meteo
  async getWeatherForecast(lat, lon, days = 7) {
    try {
      // Verifica che lat e lon siano definiti
      if (lat === undefined || lon === undefined || 
          isNaN(parseFloat(lat)) || isNaN(parseFloat(lon))) {
        return this.getDefaultForecastData();
      }

      // Normalizza i parametri
      const normalizedLat = typeof lat === 'number' ? lat : parseFloat(lat);
      const normalizedLon = typeof lon === 'number' ? lon : parseFloat(lon);
      
      const cachedData = await this.getFromCache('weatherForecast', normalizedLat, normalizedLon);
      if (cachedData) return cachedData;
      
      // Usa direttamente OpenWeatherMap API senza passare dal server
      const apiUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${normalizedLat}&lon=${normalizedLon}&units=metric&appid=${this.API_KEY}`;
      console.log(`📡 Chiamata API previsioni diretta: ${apiUrl.replace(this.API_KEY, 'HIDDEN')}`);
      
      const response = await axios.get(apiUrl, { timeout: 15000 });
      
      const formattedData = this.formatForecastData(response.data);
      await this.saveToCache('weatherForecast', normalizedLat, normalizedLon, formattedData);
      
      return formattedData;
    } catch (error) {
      console.error('Errore nel recupero delle previsioni meteo:', error);
      
      // Restituisci dati di fallback
      return this.getDefaultForecastData();
    }
  }
  
  // Ottiene i dati di radiazione solare
  async getSolarRadiation(lat, lon) {
    try {
      // Verifica che lat e lon siano definiti
      if (lat === undefined || lon === undefined || 
          isNaN(parseFloat(lat)) || isNaN(parseFloat(lon))) {
        return {
          current: 800,
          forecast: [800, 750, 700, 650, 700, 750, 800]
        };
      }

      // Normalizza i parametri
      const normalizedLat = typeof lat === 'number' ? lat : parseFloat(lat);
      const normalizedLon = typeof lon === 'number' ? lon : parseFloat(lon);
      
      // Creiamo una chiave di cache coerente che useremo in tutte le funzioni di cache
      const cacheKey = `solarRadiation_${normalizedLat.toFixed(2)}_${normalizedLon.toFixed(2)}`;
      
      // Verifica se abbiamo già dati in cache per queste coordinate
      try {
        const cachedItem = await AsyncStorage.getItem(cacheKey);
        if (cachedItem) {
          const cachedData = JSON.parse(cachedItem);
          const now = new Date().getTime();
          
          // Verifica se i dati in cache sono ancora validi (meno di 4 ore)
          if (cachedData && cachedData.timestamp && (now - cachedData.timestamp < this.cacheExpiry.radiation)) {
            console.log('🎯 Usando dati cache (4h) per analisi solare');
            return cachedData.data;
          }
        }
      } catch (cacheError) {
        console.warn('⚠️ Errore nel controllo della cache:', cacheError.message);
      }
      
      // Otteniamo subito i dati meteo per il fallback, indipendentemente dal risultato dell'API solare
      let currentWeather, forecast;
      try {
        [currentWeather, forecast] = await Promise.all([
          this.getCurrentWeather(normalizedLat, normalizedLon),
          this.getWeatherForecast(normalizedLat, normalizedLon)
        ]);
      } catch (weatherError) {
        console.warn('⚠️ Errore nel recupero dati meteo per fallback:', weatherError);
        // Usiamo valori di default se fallisce anche questo
        currentWeather = this.getDefaultWeatherData();
        forecast = this.getDefaultForecastData();
      }
      
      // Creiamo subito una stima basata su meteo che useremo come fallback
      const estimatedData = this.estimateSolarRadiation(currentWeather, forecast);
      
      // Prova a usare il server per dati Solcast con timeout ridotto
      try {
        console.log(`🔆 Chiamata API solare via server: ${normalizedLat}, ${normalizedLon}`);
        
        // Utilizziamo una Promise con race per limitare il timeout a 10 secondi
        const solarDataPromise = axios.get(`${this.baseURL}/solar/radiation`, {
          params: { lat: normalizedLat, lon: normalizedLon },
          timeout: 10000 // Riduciamo il timeout a 10 secondi
        });
        
        // Promise che si risolve dopo 10 secondi con un errore
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout manuale dopo 10 secondi')), 10000);
        });
        
        // Usiamo Promise.race per prendere il risultato più veloce
        const response = await Promise.race([solarDataPromise, timeoutPromise]);
        
        let formattedData;
        if (response.data.forecasts && response.data.forecasts.length > 0) {
          formattedData = this.formatSolarRadiationData(response.data);
          
          // Salviamo in cache direttamente (senza usare saveToCache)
          try {
            await AsyncStorage.setItem(cacheKey, JSON.stringify({
              data: formattedData,
              timestamp: new Date().getTime()
            }));
            console.log('💾 Dati API solare salvati in cache');
          } catch (saveCacheError) {
            console.warn('⚠️ Errore nel salvataggio della cache:', saveCacheError.message);
          }
          
          return formattedData;
        } else {
          // Se l'API risponde ma senza dati utili, usiamo la stima
          console.log('🔄 API solare ha risposto ma senza dati utili, uso stima meteo');
          
          // Salviamo in cache direttamente
          try {
            await AsyncStorage.setItem(cacheKey, JSON.stringify({
              data: estimatedData,
              timestamp: new Date().getTime()
            }));
            console.log('💾 Dati stimati salvati in cache (API senza dati)');
          } catch (saveCacheError) {
            console.warn('⚠️ Errore nel salvataggio della cache:', saveCacheError.message);
          }
          
          return estimatedData;
        }
      } catch (error) {
        // Fallback - usiamo i dati stimati che abbiamo già calcolato
        console.log('🔄 Fallback a stima radiazione solare basata su meteo:', error.message);
        
        // Salviamo in cache direttamente
        try {
          await AsyncStorage.setItem(cacheKey, JSON.stringify({
            data: estimatedData,
            timestamp: new Date().getTime()
          }));
          console.log('💾 Dati stimati salvati in cache (fallback)');
        } catch (saveCacheError) {
          console.warn('⚠️ Errore nel salvataggio della cache:', saveCacheError.message);
        }
        
        return estimatedData;
      }
    } catch (error) {
      console.error('Errore generale nel recupero dati solari:', error);
      
      // Fallback con dati predefiniti
      return {
        current: 800,
        forecast: [800, 750, 700, 650, 700, 750, 800]
      };
    }
  }
  
  // Metodo corretto per getSolarWeatherData
  async getSolarWeatherData(lat, lon) {
    try {
      // Verifica che lat e lon siano definiti
      if (lat === undefined || lon === undefined || 
          isNaN(parseFloat(lat)) || isNaN(parseFloat(lon))) {
        console.error('❌ Coordinate non valide per getSolarWeatherData');
        throw new Error('Coordinate non valide');
      }

      // Normalizza i parametri
      const normalizedLat = typeof lat === 'number' ? lat : parseFloat(lat);
      const normalizedLon = typeof lon === 'number' ? lon : parseFloat(lon);
      
      // Crea una chiave di cache specifica per questi dati combinati
      const cacheKey = `solarWeather_${normalizedLat.toFixed(2)}_${normalizedLon.toFixed(2)}`;
      
      // Variabile per tracciare se stiamo usando la cache
      let usingCache = false;
      
      // Verifica se i dati combinati sono in cache
      // Verifica se i dati combinati sono in cache
let cachedData = null;
try {
  const cachedItem = await AsyncStorage.getItem(cacheKey);
  if (cachedItem) {
    const parsedCache = JSON.parse(cachedItem);
    const now = new Date().getTime();
    
    if (parsedCache && parsedCache.timestamp && 
        (now - parsedCache.timestamp < this.cacheExpiry.radiation) &&
        (!parsedCache.data._isMock && !parsedCache.data._isEstimated)) {
      console.log('🌟 Usando dati reali dalla cache (4h)');
      cachedData = parsedCache.data;
      usingCache = true;
    } else if (parsedCache && (parsedCache.data._isMock || parsedCache.data._isEstimated)) {
      console.log('⚠️ Dati simulati in cache, forzando aggiornamento');
      // Se sono dati simulati, non usare la cache anche se non è scaduta
      usingCache = false;
    }
  }
} catch (cacheError) {
  console.warn('⚠️ Errore nel recupero dalla cache combinata:', cacheError.message);
}
      
      // Se abbiamo dati in cache validi, restituiscili immediatamente senza ulteriori chiamate
      if (usingCache && cachedData) {
        return cachedData;
      }
      
      console.log(`🌤️ Recupero dati meteo e solari per lat=${normalizedLat}, lon=${normalizedLon}`);
      
      try {
        // Ottieni prima i dati meteo
        console.log('🌡️ Ottengo dati meteo...');
        const [currentWeather, forecast] = await Promise.all([
          this.getCurrentWeather(normalizedLat, normalizedLon),
          this.getWeatherForecast(normalizedLat, normalizedLon)
        ]);
        console.log('✅ Dati meteo ottenuti con successo');
        
        // Poi tenta di ottenere i dati solari
        console.log('☀️ Ottengo dati radiazione solare...');
        let solarRadiation;
        
        try {
          solarRadiation = await this.getSolarRadiation(normalizedLat, normalizedLon);
          console.log('✅ Dati radiazione solare ottenuti con successo');
        } catch (solarError) {
          console.error('❌ Errore nel recupero dati solari:', solarError.message);
          
          // In caso di errore con i dati solari, usa i dati meteo per stimare
          console.log('⚠️ Utilizzo i dati meteo per stimare la radiazione solare');
          solarRadiation = this.estimateSolarRadiation(currentWeather, forecast);
          console.log('✅ Stima radiazione solare completata basata su meteo');
        }
        
        // Costruisci l'oggetto risultato
        const result = {
          current: {
            ...currentWeather,
            solarIrradiance: solarRadiation.current
          },
          forecast: forecast.map((day, index) => ({
            ...day,
            solarIrradiance: solarRadiation.forecast[index] || 700
          }))
        };
        
        // Salva in cache il risultato combinato
        try {
          await AsyncStorage.setItem(cacheKey, JSON.stringify({
            data: result,
            timestamp: new Date().getTime()
          }));
          console.log('💾 Dati combinati salvati in cache');
        } catch (saveCacheError) {
          console.warn('⚠️ Errore nel salvataggio cache combinata:', saveCacheError.message);
        }
        
        return result;
      } catch (error) {
        console.error('❌ Errore critico nel recupero dati:', error);
        throw error;
      }
    } catch (error) {
      console.error('❌ Errore generale in getSolarWeatherData:', error);
      throw error;
    }
  }
  
  // METODI PER L'API METEO DIRETTA
  
  
  // Metodo per chiamare l'API meteo
  async fetchWeatherData(latitude, longitude, language, attempt = 1) {
    try {
      // Verifica parametri
      if (latitude === undefined || longitude === undefined || 
          isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
        return this.getMockWeatherData();
      }

      // Normalizza i parametri
      const normalizedLat = typeof latitude === 'number' ? latitude : parseFloat(latitude);
      const normalizedLon = typeof longitude === 'number' ? longitude : parseFloat(longitude);
      
      // Costruisci l'URL dell'API
      const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${normalizedLat}&lon=${normalizedLon}&appid=${this.API_KEY}&units=metric&lang=${language}`;
      
      console.log(`📡 Chiamata API: ${apiUrl.replace(this.API_KEY, 'HIDDEN')}`);
      
      const response = await fetch(apiUrl);
      
      // Verifica se la risposta è valida
      if (!response.ok) {
        const errorText = await response.text();
        const statusCode = response.status;
        throw new Error(`API Error: ${statusCode}`);
      }
      
      // Trasforma la risposta in JSON
      const data = await response.json();
      
      // Trasforma i dati nel formato richiesto dall'app
      return this.transformWeatherData(data);
    } catch (error) {
      console.error(`❌ Errore chiamata API (tentativo ${attempt}):`, error.message);
      
      // Riprova se non hai raggiunto il numero massimo di tentativi
      if (attempt < 3) {
        console.log(`⏳ Ritentativo ${attempt + 1}...`);
        
        // Attendi un po' prima di riprovare (backoff esponenziale)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        
        // Riprova
        return this.fetchWeatherData(latitude, longitude, language, attempt + 1);
      }
      
      // Se tutti i tentativi falliscono, restituisci dati di esempio
      console.log('⚠️ Tutti i tentativi falliti, uso dati di esempio');
      return this.getMockWeatherData();
    }
  }
  
  // FORMATTERS
  
  // Formatta i dati meteo attuali
  formatCurrentWeather(data) {
    const getCondition = (weatherId) => {
      if (weatherId >= 200 && weatherId < 300) return 'thunderstorm';
      if (weatherId >= 300 && weatherId < 400) return 'rainy';
      if (weatherId >= 500 && weatherId < 600) return 'rainy';
      if (weatherId >= 600 && weatherId < 700) return 'snow';
      if (weatherId >= 700 && weatherId < 800) return 'cloudy';
      if (weatherId === 800) return 'sunny';
      if (weatherId > 800) return 'partlyCloudy';
      return 'sunny';
    };
    
    return {
      temperature: Math.round(data.main.temp),
      currentCondition: getCondition(data.weather[0].id),
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed * 3.6),
      pressure: data.main.pressure,
      weatherDescription: data.weather[0].description,
      timestamp: new Date().toISOString()
    };
  }
  
  // Formatta i dati delle previsioni
  formatForecastData(data) {
    const dailyData = {};
    
    data.list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const dayKey = date.toISOString().slice(0, 10);
      
      if (!dailyData[dayKey]) {
        dailyData[dayKey] = {
          temperatures: [],
          conditions: [],
          humidities: [],
          windSpeeds: []
        };
      }
      
      dailyData[dayKey].temperatures.push(item.main.temp);
      dailyData[dayKey].conditions.push(item.weather[0].id);
      dailyData[dayKey].humidities.push(item.main.humidity);
      dailyData[dayKey].windSpeeds.push(item.wind.speed);
    });
    
    const getMostCommonCondition = (conditions) => {
      const counts = {};
      conditions.forEach(c => {
        counts[c] = (counts[c] || 0) + 1;
      });
      return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    };
    
    const getCondition = (weatherId) => {
      if (weatherId >= 200 && weatherId < 300) return 'thunderstorm';
      if (weatherId >= 300 && weatherId < 400) return 'rainy';
      if (weatherId >= 500 && weatherId < 600) return 'rainy';
      if (weatherId >= 600 && weatherId < 700) return 'snow';
      if (weatherId >= 700 && weatherId < 800) return 'cloudy';
      if (weatherId === 800) return 'sunny';
      if (weatherId > 800) return 'partlyCloudy';
      return 'sunny';
    };
    
    return Object.keys(dailyData).map(date => {
      const dayData = dailyData[date];
      const avgTemp = Math.round(dayData.temperatures.reduce((a, b) => a + b) / dayData.temperatures.length);
      const mostCommonCondition = getMostCommonCondition(dayData.conditions);
      
      return {
        date,
        temperature: avgTemp,
        minTemp: Math.round(Math.min(...dayData.temperatures)),
        maxTemp: Math.round(Math.max(...dayData.temperatures)),
        condition: getCondition(parseInt(mostCommonCondition)),
        humidity: Math.round(dayData.humidities.reduce((a, b) => a + b) /dayData.humidities.length),
        windSpeed: Math.round(dayData.windSpeeds.reduce((a, b) => a + b) / dayData.windSpeeds.length * 3.6),
      };
    }).slice(0, 7);
  }
  
  // Formatta i dati di radiazione solare
  formatSolarRadiationData(data) {
    const current = data.forecasts[0]?.ghi || 0;
    
    const forecastDays = [];
    let currentDay = null;
    let dayTotal = 0;
    let dayCount = 0;
    
    data.forecasts.forEach(item => {
      const date = item.period_end.slice(0, 10);
      
      if (currentDay === null) {
        currentDay = date;
      }
      
      if (date !== currentDay) {
        forecastDays.push(Math.round(dayTotal / dayCount));
        currentDay = date;
        dayTotal = item.ghi || 0;
        dayCount = 1;
      } else {
        dayTotal += item.ghi || 0;
        dayCount++;
      }
    });
    
    if (dayCount > 0) {
      forecastDays.push(Math.round(dayTotal / dayCount));
    }
    
    return {
      current,
      forecast: forecastDays
    };
  }
  
  // HELPER METHODS
  
  // Stima la radiazione solare basata su dati meteo
  estimateSolarRadiation(currentWeather, forecast) {
    // Tabella di conversione scientifica condizione meteo → irradianza
    // Valori basati su studi scientifici del settore fotovoltaico
    const baseIrradiance = {
      sunny: 950,        // Soleggiato - massima irradianza
      partlyCloudy: 700, // Parzialmente nuvoloso - riduzione ~30%
      cloudy: 400,       // Nuvoloso - riduzione ~60% 
      rainy: 250,        // Piovoso - riduzione ~75%
      thunderstorm: 150, // Temporale - riduzione ~85%
      snow: 100,         // Neve - riduzione ~90%
      drizzle: 300,      // Pioggerella - riduzione ~70%
      foggy: 200         // Nebbia - riduzione ~80%
    };
    
    // Fattori stagionali (basati su studi di irradianza solare media mensile)
    const month = new Date().getMonth();
    const seasonalFactor = this.getSeasonalFactor(month);
    
    // Ottieni condizione meteo corrente con fallback a cloudy se non disponibile
    const currentCondition = currentWeather.currentCondition || 'cloudy';
    
    // Calcola irradianza attuale basata su condizione meteo e stagione
    const currentIrradiance = Math.round((baseIrradiance[currentCondition] || 500) * seasonalFactor);
    
    // Calcola irradianza prevista per ogni giorno nel forecast
    const forecastIrradiance = forecast.map(day => {
      const condition = day.condition || 'cloudy';
      const dayIrradiance = baseIrradiance[condition] || 500;
      
      // Applica il fattore stagionale
      return Math.round(dayIrradiance * seasonalFactor);
    });
    
    // Se il forecast è troppo corto, estendi con valori realistici
    while (forecastIrradiance.length < 7) {
      // Aggiungi valori basati sulla media degli ultimi 3 giorni, se disponibili
      const lastValues = forecastIrradiance.slice(-3);
      if (lastValues.length > 0) {
        const avg = lastValues.reduce((sum, val) => sum + val, 0) / lastValues.length;
        // Aggiungi una leggera variazione casuale (-10% a +10%)
        const variation = 0.8 + (Math.random() * 0.4); // 0.8 a 1.2
        forecastIrradiance.push(Math.round(avg * variation));
      } else {
        // Fallback se non ci sono valori precedenti
        forecastIrradiance.push(Math.round(600 * seasonalFactor));
      }
    }
    
    // Tronca a 7 giorni se è più lungo
    const finalForecast = forecastIrradiance.slice(0, 7);
    
    return {
      current: currentIrradiance,
      forecast: finalForecast,
      _isEstimated: true
    };
  }
  
  // Fattore stagionale
  getSeasonalFactor(month) {
    const factors = [
      0.5,  // Gennaio
      0.6,  // Febbraio 
      0.75, // Marzo
      0.85, // Aprile
      0.95, // Maggio
      1.0,  // Giugno
      1.0,  // Luglio
      0.95, // Agosto
      0.85, // Settembre
      0.7,  // Ottobre
      0.55, // Novembre
      0.5   // Dicembre
    ];
    
    return factors[month];
  }
  
  // METODI PER LA CACHE
  
  // Ottiene dati dalla cache
  async getFromCache(type, lat, lon) {
    try {
      // Verifica che lat e lon siano definiti
      if (lat === undefined || lon === undefined || 
          isNaN(parseFloat(lat)) || isNaN(parseFloat(lon))) {
        return null;
      }
      
      // Normalizza i parametri
      const normalizedLat = typeof lat === 'number' ? lat : parseFloat(lat);
      const normalizedLon = typeof lon === 'number' ? lon : parseFloat(lon);
      
      const cacheKey = `${type}_${normalizedLat.toFixed(2)}_${normalizedLon.toFixed(2)}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (!cachedData) return null;
      
      try {
        const { data, timestamp } = JSON.parse(cachedData);
        const now = new Date().getTime();
        
        if (now - timestamp < this.cacheExpiry[type.split('_')[0]]) {
          return data;
        }
      } catch (parseError) {
        console.error('Errore nel parsing dei dati cache:', parseError);
      }
      
      return null;
    } catch (error) {
      console.error('Errore nel recupero dei dati dalla cache:', error);
      return null;
    }
  }

  // Salva dati in cache
  async saveToCache(type, lat, lon, data) {
    try {
      // Verifica che lat e lon siano definiti
      if (lat === undefined || lon === undefined || 
          isNaN(parseFloat(lat)) || isNaN(parseFloat(lon))) {
        return;
      }
      
      // Normalizza i parametri
      const normalizedLat = typeof lat === 'number' ? lat : parseFloat(lat);
      const normalizedLon = typeof lon === 'number' ? lon : parseFloat(lon);
      
      const cacheKey = `${type}_${normalizedLat.toFixed(2)}_${normalizedLon.toFixed(2)}`;
      const cacheData = {
        data,
        timestamp: new Date().getTime()
      };
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Errore nel salvataggio dei dati in cache:', error);
    }
  }
  
  // Metodo per ottenere i dati dalla cache
  async getCachedData(latitude, longitude) {
    try {
      // Verifica che latitude e longitude siano definiti
      if (latitude === undefined || longitude === undefined || 
          isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
        return null;
      }
      
      // Normalizza i parametri
      const normalizedLat = typeof latitude === 'number' ? latitude : parseFloat(latitude);
      const normalizedLon = typeof longitude === 'number' ? longitude : parseFloat(longitude);
      
      const cacheKey = `weather_${normalizedLat}_${normalizedLon}`;
      const cachedDataJson = await AsyncStorage.getItem(cacheKey);
      
      if (cachedDataJson) {
        try {
          const cachedData = JSON.parse(cachedDataJson);
          
          // Verifica se i dati sono ancora validi
          const now = new Date().getTime();
          if (now - cachedData.timestamp < this.cacheExpiry.forecast) {
            console.log('🎯 Usando dati cache (4h) per analisi solare');
            return cachedData.data;
          }
        } catch (parseError) {
          console.error('Errore nel parsing dei dati cache:', parseError);
        }
      }
      
      return null;
    } catch (error) {
      console.warn('⚠️ Errore lettura cache:', error.message);
      return null;
    }
  }

  // Metodo per salvare i dati in cache
  async cacheData(latitude, longitude, data) {
    try {
      // Verifica che latitude e longitude siano definiti
      if (latitude === undefined || longitude === undefined || 
          isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
        return;
      }
      
      // Normalizza i parametri
      const normalizedLat = typeof latitude === 'number' ? latitude : parseFloat(latitude);
      const normalizedLon = typeof longitude === 'number' ? longitude : parseFloat(longitude);
      
      const cacheKey = `weather_${normalizedLat}_${normalizedLon}`;
      const cacheData = {
        timestamp: new Date().getTime(),
        data
      };
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('⚠️ Errore salvataggio cache:', error.message);
    }
  }
  
  // DEFAULT DATA
  
  // Dati meteo predefiniti
  getDefaultWeatherData() {
    return {
      temperature: 25,
      currentCondition: 'sunny',
      humidity: 50,
      windSpeed: 10,
      pressure: 1013,
      weatherDescription: 'cielo sereno',
      timestamp: new Date().toISOString(),
      _isMock: true
    };
  }
  
  // Dati previsioni predefiniti
  getDefaultForecastData() {
    const forecast = [];
    const now = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(now.getDate() + i);
      
      forecast.push({
        date: date.toISOString().slice(0, 10),
        temperature: 25,
        minTemp: 20,
        maxTemp: 30,
        condition: 'sunny',
        humidity: 50,
        windSpeed: 10,
        _isMock: true
      });
    }
    
    return forecast;
  }
  
  // Metodo per trasformare i dati meteo
  transformWeatherData(data) {
    // Estrai i dati utili e formattali per l'app
    return {
      location: {
        name: data.name,
        country: data.sys.country,
        lat: data.coord.lat,
        lon: data.coord.lon
      },
      current: {
        temp: Math.round(data.main.temp),
        condition: this.getConditionCode(data.weather[0].id),
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        humidity: data.main.humidity,
        wind: data.wind.speed,
        pressure: data.main.pressure
      },
      sun: {
        sunrise: new Date(data.sys.sunrise * 1000),
        sunset: new Date(data.sys.sunset * 1000)
      },
      timestamp: new Date().getTime()
    };
  }

  // Metodo per mappare i codici di condizione OpenWeatherMap
  getConditionCode(weatherId) {
    if (weatherId >= 200 && weatherId < 300) return 'thunderstorm';
    if (weatherId >= 300 && weatherId < 400) return 'drizzle';
    if (weatherId >= 500 && weatherId < 600) return 'rain';
    if (weatherId >= 600 && weatherId < 700) return 'snow';
    if (weatherId >= 700 && weatherId < 800) return 'atmosphere';
    if (weatherId === 800) return 'clear';
    if (weatherId > 800) return 'clouds';
    return 'unknown';
  }

  // Metodo per fornire dati di esempio in caso di errore
  getMockWeatherData() {
    return {
      location: {
        name: "Posizione attuale",
        country: "IT",
        lat: 41.9,
        lon: 12.5
      },
      current: {
        temp: 25,
        condition: 'clear',
        description: 'cielo sereno',
        icon: '01d',
        humidity: 50,
        wind: 3.5,
        pressure: 1012
      },
      sun: {
        sunrise: new Date().setHours(6, 0, 0, 0),
        sunset: new Date().setHours(20, 0, 0, 0)
      },
      timestamp: new Date().getTime(),
      _isMock: true  // Flag per indicare che sono dati di esempio
    };
  }
}

export default new WeatherService();