// File: backend/server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Keys
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || '98b176a1a10eccf8f37b6dae4c84b1e1';
const SOLCAST_API_KEY = process.env.SOLCAST_API_KEY || 'bc-kRmjKn8N9TI4RIXrPAdCbGGf6FX4i';
console.log('Server avviato con OpenWeather API Key:', OPENWEATHER_API_KEY.substring(0, 5) + '...');
console.log('Server avviato con Solcast API Key:', SOLCAST_API_KEY.substring(0, 5) + '...');

// Cache migliorata
const cache = {
  solar: new Map(),
  weather: new Map(),
  forecast: new Map(),
  CACHE_DURATION: {
    solar: 4 * 60 * 60 * 1000,  // 4 ore per dati solari
    weather: 30 * 60 * 1000,    // 30 minuti per meteo attuale
    forecast: 3 * 60 * 60 * 1000 // 3 ore per previsioni
  }
};

// Import the image analysis service
const imageAnalysisService = require('./services/imageAnalysisService');
const multer = require('multer');
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Endpoint for panel image analysis
app.post('/api/panel/analyze', upload.single('image'), async (req, res) => {
  try {
    // Check if image is provided
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }
    
    // Extract metadata from request body
    const metadata = {
      panelId: req.body.panelId,
      panelType: req.body.panelType,
      installDate: req.body.installDate,
      lastCleaning: req.body.lastCleaning,
      location: req.body.location ? JSON.parse(req.body.location) : undefined
    };
    
    // Analyze the image
    const analysisResults = await imageAnalysisService.analyzePanelImage(
      req.file.buffer,
      metadata
    );
    
    // Return the analysis results
    res.json({
      success: true,
      results: analysisResults
    });
    
  } catch (error) {
    console.error('Error in panel analysis endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to analyze panel image',
      message: error.message 
    });
  }
});

// Endpoint di debug per svuotare la cache
app.get('/api/debug/clear-cache', (req, res) => {
  cache.solar.clear();
  cache.weather.clear();
  cache.forecast.clear();
  console.log('🗑️ Cache pulita manualmente');
  res.json({ success: true, message: 'Cache pulita' });
});

// Endpoint di debug per testare direttamente Solcast API con fallback a PVGIS
app.get('/api/debug/solcast', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    // Se non sono specificati, usa coordinate di default (Bari)
    const latitude = lat || '41.1071';
    const longitude = lon || '16.8719';
    
    console.log('DEBUG SOLCAST: Test diretto API Solcast con fallback a PVGIS');
    
    // Prova prima Solcast
    try {
      console.log(`Tentativo chiamata Solcast per lat=${latitude}, lon=${longitude}`);
      const apiUrl = 'https://api.solcast.com.au/radiation/forecasts';
      const params = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        hours: 168,
        format: 'json',
        api_key: SOLCAST_API_KEY
      };
      
      const response = await axios.get(apiUrl, { params, timeout: 10000 });
      
      console.log('SUCCESSO con Solcast! Status:', response.status);
      
      return res.json({
        success: true,
        source: 'Solcast',
        data: response.data
      });
    } catch (solcastError) {
      console.log(`Solcast fallito - ${solcastError.message}`);
      
      // Se Solcast fallisce, prova PVGIS
      try {
        console.log(`Tentativo chiamata PVGIS per lat=${latitude}, lon=${longitude}`);
        
        // Modifica del parametro per ottenere dati mensili più completi
        const url = `https://re.jrc.ec.europa.eu/api/seriescalc`;
        const params = {
          lat: parseFloat(latitude),
          lon: parseFloat(longitude),
          outputformat: 'json',
          startyear: 2020,
          endyear: 2020,
          pvcalculation: 0,
          peakpower: 1,
          loss: 14,
          trackingtype: 0,
          angle: 35,
          aspect: 0,
          optimalinclination: 0,
          optimalangles: 0,
          components: 1  // Richiedi i componenti della radiazione
        };
        
        const response = await axios.get(url, { params, timeout: 30000 });
        
        console.log('SUCCESSO con PVGIS! Status:', response.status);
        console.log('Dati PVGIS ricevuti, elaborazione...');
        
        // Stampa esempio di risposta per debug
        console.log('Struttura dati PVGIS:', Object.keys(response.data));
        
        // Verifica la struttura dati
        if (!response.data.outputs || !response.data.outputs.hourly) {
          console.error('Struttura dati PVGIS non valida:', JSON.stringify(response.data).substring(0, 500));
          throw new Error('Struttura dati PVGIS non valida o incompleta');
        }
        
        // Stampa esempio di un record per debug
        if (response.data.outputs.hourly.length > 0) {
          console.log('Esempio dati orari PVGIS:', JSON.stringify(response.data.outputs.hourly[0]));
        }
        
        // Converti i dati PVGIS nel formato Solcast
        const forecasts = [];
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        // Utilizza i dati orari per 7 giorni
        // PVGIS restituisce dati tipici mensili, utilizziamo quelli del mese corrente
        const hourlyData = response.data.outputs.hourly;
        
        // Crea un array di dati orari utilizzabili
        const usableData = [];
        for (let i = 0; i < hourlyData.length; i++) {
          const item = hourlyData[i];
          
          // Verifica se il record ha dati validi di radiazione globale
          // Utilizziamo la somma di diretta (Gb), diffusa (Gd) e riflessa (Gr) come radiazione globale
          const gb = parseFloat(item['Gb(i)'] || 0);
          const gd = parseFloat(item['Gd(i)'] || 0);
          const gr = parseFloat(item['Gr(i)'] || 0);
          const globalRadiation = gb + gd + gr;
          
          if (globalRadiation > 0) {
            // Aggiungiamo la radiazione globale calcolata al record
            item.G = globalRadiation;
            usableData.push(item);
          }
        }
        
        console.log(`Trovati ${usableData.length} record orari con dati validi`);
        
        // Se non ci sono dati validi, lancia un errore
        if (usableData.length === 0) {
          throw new Error('Nessun dato di radiazione valido trovato in PVGIS');
        }
        
        // Usa i dati disponibili e ripeti per coprire 7 giorni
        for (let day = 0; day < 7; day++) {
          const dayDate = new Date(now);
          dayDate.setDate(dayDate.getDate() + day);
          
          // Ogni giorno utilizziamo lo stesso pattern
          for (let h = 0; h < 24; h++) {
            // Trova un dato per questa ora del giorno
            // Estrai l'ora dal formato "YYYYMMDD:HHMM"
            const hourData = usableData.find(d => {
              if (!d.time) return false;
              const timeParts = d.time.split(':');
              if (timeParts.length !== 2) return false;
              
              const hourMinute = timeParts[1];
              const hour = parseInt(hourMinute.substring(0, 2), 10);
              return hour === h;
            });
            
            if (hourData) {
              const time = new Date(dayDate);
              time.setHours(h, 0, 0, 0);
              
              // Usa la radiazione globale calcolata
              const ghi = Math.round(hourData.G * 1000); // kW/m² -> W/m²
              
              forecasts.push({
                ghi: ghi,
                period_end: time.toISOString(),
                period: "PT60M",
                _source: "PVGIS"
              });
            }
          }
        }
        
        console.log(`Generati ${forecasts.length} punti dati da PVGIS`);
        
        if (forecasts.length === 0) {
          throw new Error('Nessun dato di previsione generato da PVGIS');
        }
        
        return res.json({
          success: true,
          source: 'PVGIS',
          data: { forecasts }
        });
      } catch (pvgisError) {
        console.error(`Anche PVGIS fallito - ${pvgisError.message}`);
        
        // Se anche PVGIS fallisce, prova NASA POWER
        try {
          console.log(`Tentativo chiamata NASA POWER per lat=${latitude}, lon=${longitude}`);
          
          // Configura i parametri per la NASA POWER API
          const currentDate = new Date();
          const year = currentDate.getFullYear();
          const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
          const day = currentDate.getDate().toString().padStart(2, '0');
          
          // Formato YYYYMMDD
          const today = `${year}${month}${day}`;
          
          // Richiediamo solo l'ultimo mese di dati
          const startDate = `${year}${month}01`;
          const endDate = today;
          
          const url = `https://power.larc.nasa.gov/api/temporal/hourly/point`;
          const params = {
            start: startDate,
            end: endDate,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            parameters: 'ALLSKY_SFC_SW_DWN',  // Radiazione solare globale
            community: 'RE',                  // Renewable Energy
            format: 'JSON',
            user: 'SolarGuardianApp'
          };
          
          const response = await axios.get(url, { params, timeout: 30000 });
          
          console.log(`✅ API Solare: NASA POWER ha risposto! Status: ${response.status}`);
          console.log('Dati NASA POWER ricevuti, elaborazione...');
          
          // Verifica la struttura dati
          if (!response.data.properties || !response.data.properties.parameter || !response.data.properties.parameter.ALLSKY_SFC_SW_DWN) {
            console.error('Struttura dati NASA POWER non valida:', JSON.stringify(response.data).substring(0, 500));
            throw new Error('Struttura dati NASA POWER non valida o incompleta');
          }
          
          // Estrai i dati di radiazione solare
          const radiationData = response.data.properties.parameter.ALLSKY_SFC_SW_DWN;
          
          // Converti i dati NASA POWER nel formato Solcast
          const forecasts = [];
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          
          // Crea un array di dati orari utilizzabili
          const usableData = [];
          
          // Elabora i dati di radiazione
          Object.entries(radiationData).forEach(([timestamp, value]) => {
            // Il timestamp ha formato "YYYYMMDD:HH"
            if (value > 0) {
              const date = timestamp.split(':')[0]; // YYYYMMDD
              const hour = parseInt(timestamp.split(':')[1], 10); // HH
              
              usableData.push({
                date,
                hour,
                radiation: value // W/m²
              });
            }
          });
          
          console.log(`Trovati ${usableData.length} record orari con dati validi da NASA POWER`);
          
          // Se non ci sono dati validi, lancia un errore
          if (usableData.length === 0) {
            throw new Error('Nessun dato di radiazione valido trovato in NASA POWER');
          }
          
          // Usa i dati disponibili e ripeti per coprire 7 giorni
          for (let day = 0; day < 7; day++) {
            const dayDate = new Date(now);
            dayDate.setDate(dayDate.getDate() + day);
            
            // Formatta la data nel formato YYYYMMDD
            const formattedDate = dayDate.getFullYear().toString() +
                               (dayDate.getMonth() + 1).toString().padStart(2, '0') +
                               dayDate.getDate().toString().padStart(2, '0');
            
            // Per ogni ora del giorno
            for (let h = 0; h < 24; h++) {
              // Prima cerca dati esatti per questa data
              let hourData = usableData.find(d => d.date === formattedDate && d.hour === h);
              
              // Se non ci sono dati esatti, cerca dati per la stessa ora da altre date
              if (!hourData) {
                hourData = usableData.find(d => d.hour === h);
              }
              
              if (hourData) {
                const time = new Date(dayDate);
                time.setHours(h, 0, 0, 0);
                
                forecasts.push({
                  ghi: hourData.radiation, // Già in W/m²
                  period_end: time.toISOString(),
                  period: "PT60M",
                  _source: "NASA_POWER"
                });
              }
            }
          }
          
          console.log(`Generati ${forecasts.length} punti dati da NASA POWER`);
          
          if (forecasts.length === 0) {
            throw new Error('Nessun dato di previsione generato da NASA POWER');
          }
          
          return res.json({
            success: true,
            source: 'NASA_POWER',
            data: { forecasts }
          });
        } catch (nasaError) {
          console.error(`Anche NASA POWER fallito - ${nasaError.message}`);
          return res.status(500).json({
            success: false,
            message: 'Tutti i servizi falliti',
            solcastError: solcastError.message,
            pvgisError: pvgisError.message,
            nasaError: nasaError.message
          });
        }
      }
    }
  } catch (error) {
    console.error('Errore generale:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Errore generale',
      error: error.message
    });
  }
});

// Endpoint for system-wide analysis
app.get('/api/system/analyze', async (req, res) => {
  try {
    // This endpoint would analyze all panels in the system
    // Here we'll return mock data for now
    
    // In a real implementation, you would:
    // 1. Retrieve all panel data from database
    // 2. Analyze each panel's condition
    // 3. Aggregate results and provide system-wide recommendations
    
    const systemAnalysis = {
      timestamp: new Date().toISOString(),
      panelCount: 4,
      systemHealth: {
        overallScore: 87,
        statusCounts: {
          optimal: 2,
          needsCleaning: 1,
          hasIssues: 1
        }
      },
      recommendations: [
        {
          priority: "high",
          action: "Clean Panel #2 within 7 days",
          impact: "Increase efficiency by 8%"
        },
        {
          priority: "high",
          action: "Inspect Panel #4 for possible cell damage",
          impact: "Prevent further degradation"
        },
        {
          priority: "medium",
          action: "Adjust Panel #3 orientation by 15° eastward",
          impact: "Increase morning production by 12%"
        }
      ],
      productionForecast: {
        today: 15.2, // kWh
        tomorrow: 14.8, // kWh
        weekly: 98.5 // kWh
      }
    };
    
    res.json({
      success: true,
      analysis: systemAnalysis
    });
    
  } catch (error) {
    console.error('Error in system analysis endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to analyze system',
      message: error.message 
    });
  }
});

// Funzione helper per controllare cache
const checkCache = (cacheMap, key, durationType) => {
  if (cacheMap.has(key)) {
    const { data, timestamp } = cacheMap.get(key);
    if (Date.now() - timestamp < cache.CACHE_DURATION[durationType]) {
      console.log(`Serving ${durationType} data from cache for ${key}`);
      return data;
    }
  }
  return null;
};

// Funzione helper per salvare in cache
const saveToCache = (cacheMap, key, data, durationType) => {
  cacheMap.set(key, {
    data,
    timestamp: Date.now()
  });
  console.log(`Saved ${durationType} data to cache for ${key}`);
};

app.get('/api/weather/current', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    // Verifica che lat e lon siano definiti
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing latitude or longitude parameters' });
    }
    
    // Controlla cache
    const cacheKey = `${lat}_${lon}`;
    const cachedData = checkCache(cache.weather, cacheKey, 'weather');
    if (cachedData) {
      return res.json(cachedData);
    }
    
    console.log(`Calling OpenWeatherMap API for current weather at ${lat},${lon}`);
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather`,
      {
        params: {
          lat,
          lon,
          units: 'metric',
          appid: OPENWEATHER_API_KEY
        },
        timeout: 15000
      }
    );
    
    // Salva in cache e restituisci
    saveToCache(cache.weather, cacheKey, response.data, 'weather');
    res.json(response.data);
  } catch (error) {
    console.error('Weather API error:', error);
    res.status(500).json({ error: 'Failed to fetch weather data', message: error.message });
  }
});

app.get('/api/weather/forecast', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    // Verifica che lat e lon siano definiti
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing latitude or longitude parameters' });
    }
    
    // Controlla cache
    const cacheKey = `${lat}_${lon}`;
    const cachedData = checkCache(cache.forecast, cacheKey, 'forecast');
    if (cachedData) {
      return res.json(cachedData);
    }
    
    console.log(`Calling OpenWeatherMap API for forecast at ${lat},${lon}`);
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast`,
      {
        params: {
          lat,
          lon,
          units: 'metric',
          appid: OPENWEATHER_API_KEY
        },
        timeout: 15000
      }
    );
    
    // Salva in cache e restituisci
    saveToCache(cache.forecast, cacheKey, response.data, 'forecast');
    res.json(response.data);
  } catch (error) {
    console.error('Forecast API error:', error);
    res.status(500).json({ error: 'Failed to fetch forecast data', message: error.message });
  }
});

// Funzione per ottenere dati da NASA POWER API come terzo fallback
const getNASAPowerData = async (lat, lon) => {
  console.log(`📡 API Solare: Tentativo chiamata NASA POWER per lat=${lat}, lon=${lon}`);
  
  // Configura i parametri per la NASA POWER API
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
  const day = currentDate.getDate().toString().padStart(2, '0');
  
  // Formato YYYYMMDD
  const today = `${year}${month}${day}`;
  
  // Richiediamo solo l'ultimo mese di dati
  const startDate = `${year}${month}01`;
  const endDate = today;
  
  const url = `https://power.larc.nasa.gov/api/temporal/hourly/point`;
  const params = {
    start: startDate,
    end: endDate,
    latitude: parseFloat(lat),
    longitude: parseFloat(lon),
    parameters: 'ALLSKY_SFC_SW_DWN',  // Radiazione solare globale
    community: 'RE',                  // Renewable Energy
    format: 'JSON',
    user: 'SolarGuardianApp'
  };
  
  const response = await axios.get(url, { params, timeout: 30000 });
  
  console.log(`✅ API Solare: NASA POWER ha risposto! Status: ${response.status}`);
  console.log('Dati NASA POWER ricevuti, elaborazione...');
  
  // Verifica la struttura dati
  if (!response.data.properties || !response.data.properties.parameter || !response.data.properties.parameter.ALLSKY_SFC_SW_DWN) {
    console.error('Struttura dati NASA POWER non valida:', JSON.stringify(response.data).substring(0, 500));
    throw new Error('Struttura dati NASA POWER non valida o incompleta');
  }
  
  // Estrai i dati di radiazione solare
  const radiationData = response.data.properties.parameter.ALLSKY_SFC_SW_DWN;
  
  // Converti i dati NASA POWER nel formato Solcast
  const forecasts = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  // Crea un array di dati orari utilizzabili
  const usableData = [];
  
  // Elabora i dati di radiazione
  Object.entries(radiationData).forEach(([timestamp, value]) => {
    // Il timestamp ha formato "YYYYMMDD:HH"
    if (value > 0) {
      const date = timestamp.split(':')[0]; // YYYYMMDD
      const hour = parseInt(timestamp.split(':')[1], 10); // HH
      
      usableData.push({
        date,
        hour,
        radiation: value // W/m²
      });
    }
  });
  
  console.log(`Trovati ${usableData.length} record orari con dati validi da NASA POWER`);
  
  // Se non ci sono dati validi, lancia un errore
  if (usableData.length === 0) {
    throw new Error('Nessun dato di radiazione valido trovato in NASA POWER');
  }
  
  // Usa i dati disponibili e ripeti per coprire 7 giorni
  for (let day = 0; day < 7; day++) {
    const dayDate = new Date(now);
    dayDate.setDate(dayDate.getDate() + day);
    
    // Formatta la data nel formato YYYYMMDD
    const formattedDate = dayDate.getFullYear().toString() +
                     (dayDate.getMonth() + 1).toString().padStart(2, '0') +
                     dayDate.getDate().toString().padStart(2, '0');
    
    // Per ogni ora del giorno
    for (let h = 0; h < 24; h++) {
      // Prima cerca dati esatti per questa data
      let hourData = usableData.find(d => d.date === formattedDate && d.hour === h);
      
      // Se non ci sono dati esatti, cerca dati per la stessa ora da altre date
      if (!hourData) {
        hourData = usableData.find(d => d.hour === h);
      }
      
      if (hourData) {
        const time = new Date(dayDate);
        time.setHours(h, 0, 0, 0);
        
        forecasts.push({
          ghi: hourData.radiation, // Già in W/m²
          period_end: time.toISOString(),
          period: "PT60M",
          _source: "NASA_POWER"
        });
      }
    }
  }
  
  console.log(`Generati ${forecasts.length} punti dati da NASA POWER`);
  
  if (forecasts.length === 0) {
    throw new Error('Nessun dato di previsione generato da NASA POWER');
  }
  
  return { forecasts };
};

// Endpoint solar/radiation con fallback multipli 
app.get('/api/solar/radiation', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    // Verifica che lat e lon siano definiti
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing latitude or longitude parameters' });
    }
    
    // Log di inizio
    console.log(`⏳ API Solare: Richiesta ricevuta per lat=${lat}, lon=${lon}`);
    
    // Controlla cache
    const cacheKey = `${lat}_${lon}`;
    const cachedData = checkCache(cache.solar, cacheKey, 'solar');
    if (cachedData) {
      console.log(`✅ API Solare: Dati restituiti dalla cache per ${cacheKey}`);
      return res.json(cachedData);
    }
    
    // Funzione per ottenere dati da Solcast
    const getSolcastData = async () => {
      console.log(`📡 API Solare: Tentativo chiamata Solcast per lat=${lat}, lon=${lon}`);
      
      const apiUrl = 'https://api.solcast.com.au/radiation/forecasts';
      const params = {
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        hours: 168,
        format: 'json',
        api_key: SOLCAST_API_KEY
      };
      
      const response = await axios.get(apiUrl, { params, timeout: 10000 });
      
      console.log(`✅ API Solare: Solcast ha risposto! Status: ${response.status}`);
      
      if (!response.data.forecasts || response.data.forecasts.length === 0) {
        throw new Error('No forecast data in response');
      }
      
      return response.data;
    };
    
    // Funzione per ottenere dati da PVGIS come fallback
    const getPVGISData = async () => {
      console.log(`📡 API Solare: Tentativo chiamata PVGIS per lat=${lat}, lon=${lon}`);
      
      // Modifica del parametro per ottenere dati mensili più completi
      const url = `https://re.jrc.ec.europa.eu/api/seriescalc`;
      const params = {
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        outputformat: 'json',
        startyear: 2020,
        endyear: 2020,
        pvcalculation: 0,
        peakpower: 1,
        loss: 14,
        trackingtype: 0,
        angle: 35,
        aspect: 0,
        optimalinclination: 0,
        optimalangles: 0,
        components: 1  // Richiedi i componenti della radiazione
      };
      
      const response = await axios.get(url, { params, timeout: 30000 });
      
      console.log(`✅ API Solare: PVGIS ha risposto! Status: ${response.status}`);
      console.log('Dati PVGIS ricevuti, elaborazione...');
      
      // Stampa esempio di risposta per debug
      console.log('Struttura dati PVGIS:', Object.keys(response.data));
      
      // Verifica la struttura dati
      if (!response.data.outputs || !response.data.outputs.hourly) {
        console.error('Struttura dati PVGIS non valida:', JSON.stringify(response.data).substring(0, 500));
        throw new Error('Struttura dati PVGIS non valida o incompleta');
      }
      
      // Stampa esempio di un record per debug
      if (response.data.outputs.hourly.length > 0) {
        console.log('Esempio dati orari PVGIS:', JSON.stringify(response.data.outputs.hourly[0]));
      }
      
      // Converti i dati PVGIS nel formato Solcast
      const forecasts = [];
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      // Utilizza i dati orari per 7 giorni
      // PVGIS restituisce dati tipici mensili, utilizziamo quelli del mese corrente
      const hourlyData = response.data.outputs.hourly;
      
      // Crea un array di dati orari utilizzabili
      const usableData = [];
      for (let i = 0; i < hourlyData.length; i++) {
        const item = hourlyData[i];
        
        // Verifica se il record ha dati validi di radiazione globale
        // Utilizziamo la somma di diretta (Gb), diffusa (Gd) e riflessa (Gr) come radiazione globale
        const gb = parseFloat(item['Gb(i)'] || 0);
        const gd = parseFloat(item['Gd(i)'] || 0);
        const gr = parseFloat(item['Gr(i)'] || 0);
        const globalRadiation = gb + gd + gr;
        
        if (globalRadiation > 0) {
          // Aggiungiamo la radiazione globale calcolata al record
          item.G = globalRadiation;
          usableData.push(item);
        }
      }
      
      console.log(`Trovati ${usableData.length} record orari con dati validi`);
      
      // Se non ci sono dati validi, lancia un errore
      if (usableData.length === 0) {
        throw new Error('Nessun dato di radiazione valido trovato in PVGIS');
      }
      
      // Usa i dati disponibili e ripeti per coprire 7 giorni
      for (let day = 0; day < 7; day++) {
        const dayDate = new Date(now);
        dayDate.setDate(dayDate.getDate() + day);
        
        // Ogni giorno utilizziamo lo stesso pattern
        for (let h = 0; h < 24; h++) {
          // Trova un dato per questa ora del giorno
          // Estrai l'ora dal formato "YYYYMMDD:HHMM"
          const hourData = usableData.find(d => {
            if (!d.time) return false;
            const timeParts = d.time.split(':');
            if (timeParts.length !== 2) return false;
            
            const hourMinute = timeParts[1];
            const hour = parseInt(hourMinute.substring(0, 2), 10);
            return hour === h;
          });
          
          if (hourData) {
            const time = new Date(dayDate);
            time.setHours(h, 0, 0, 0);
            
            // Usa la radiazione globale calcolata
            const ghi = Math.round(hourData.G * 1000); // kW/m² -> W/m²
            
            forecasts.push({
              ghi: ghi,
              period_end: time.toISOString(),
              period: "PT60M",
              _source: "PVGIS"
            });
          }
        }
      }
      
      console.log(`Generati ${forecasts.length} punti dati da PVGIS`);
      
      if (forecasts.length === 0) {
        throw new Error('Nessun dato di previsione generato da PVGIS');
      }
      
      return { forecasts };
    };
    
    // Prova prima Solcast, poi PVGIS se fallisce, infine NASA POWER
    let solarData;
    let dataSource = 'Solcast';
    
    try {
      // Prima prova Solcast
      solarData = await getSolcastData();
    } catch (solcastError) {
      console.log(`⚠️ API Solare: Solcast fallito - ${solcastError.message}`);
      
      // Se Solcast fallisce, prova PVGIS
      try {
        solarData = await getPVGISData();
        dataSource = 'PVGIS';
      } catch (pvgisError) {
        console.error(`⚠️ API Solare: Anche PVGIS fallito - ${pvgisError.message}`);
        
        // Se anche PVGIS fallisce, prova NASA POWER
        try {
          solarData = await getNASAPowerData(lat, lon);
          dataSource = 'NASA_POWER';
        } catch (nasaError) {
          console.error(`❌ API Solare: Anche NASA POWER fallito - ${nasaError.message}`);
          throw new Error('Tutti i servizi di dati solari hanno fallito');
        }
      }
    }
    
    // Aggiungi metadati per debug
    solarData._source = dataSource;
    solarData._timestamp = new Date().toISOString();
    
    // Salva in cache
    saveToCache(cache.solar, cacheKey, solarData, 'solar');
    
    // Restituisci i dati al client
    return res.json(solarData);
    
  } catch (error) {
    console.error('❌ API Solare: Errore generale:', error.message);
    
    return res.status(503).json({
      error: 'Solar data service error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Initialize panel detection service
console.log('Panel detection service initialized successfully');

// Avvia il server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Per accedere da altri dispositivi: http://{TUO-IP}:${PORT}`);
});