// File: services/SolarAnalysisService.js
import WeatherService from './WeatherService';

class SolarAnalysisService {
  constructor() {
    console.log('🔍 SolarAnalysisService inizializzato');
  }

  analyzePanelWithRealData = async (panelData) => {
    try {
      console.log('🔍 Inizio analisi pannello con dati reali:', panelData.name);
      
      // Ottieni dati meteo per la località del pannello
      const weatherData = await WeatherService.getSolarWeatherData(
        panelData.location.lat,
        panelData.location.lon
      );
      
      // Calcola degradazione in base all'età e all'efficienza attuale
      const installDate = panelData.installationDate ? new Date(panelData.installationDate) : new Date();
      const now = new Date();
      const ageInYears = Math.max(0, (now - installDate) / (1000 * 60 * 60 * 24 * 365.25));
      
      // Efficienza nominale iniziale o corrente
      const baseEfficiency = panelData.baseEfficiency || 95;
      const currentEfficiency = panelData.efficiency || baseEfficiency;
      
      // Degradazione annuale stimata (0.5-1% all'anno)
      const yearlyDegradation = 0.7;
      const naturalDegradation = ageInYears * yearlyDegradation;
      
      // Calcola l'orientamento ottimale in base alla posizione geografica
      // Nord/Sud dell'equatore determina l'orientamento ideale
      const isNorthHemisphere = panelData.location.lat > 0;
      const optimalOrientation = isNorthHemisphere ? 'Sud' : 'Nord';
      
      // Mappa degli orientamenti con efficienza relativa
      const orientationEfficiency = {
        'Sud': 1.0,
        'Sud-Est': 0.92,
        'Sud-Ovest': 0.92,
        'Est': 0.75,
        'Ovest': 0.75,
        'Nord': 0.5,
        'Nord-Est': 0.6,
        'Nord-Ovest': 0.6
      };
      
      // Calcola impatto dell'orientamento attuale
      const currentOrientationFactor = orientationEfficiency[panelData.location.orientation] || 0.8;
      const optimalOrientationFactor = orientationEfficiency[optimalOrientation] || 1.0;
      
      // Differenza percentuale
      const orientationPercentageDiff = Math.round((optimalOrientationFactor / currentOrientationFactor - 1) * 100);
      
      // Calcola la produzione base (kWh)
      const capacityKW = panelData.capacity / 1000 || 0.35;
      const efficiencyFactor = currentEfficiency / 100;
      const dailyProduction = capacityKW * efficiencyFactor * 5; // 5 ore equivalenti
      const annualProduction = dailyProduction * 365;
      
      // Calcola la differenza di produzione e il beneficio economico
      const productionDifference = Math.round(annualProduction * (optimalOrientationFactor - currentOrientationFactor) * 10) / 10;
      const economicBenefit = Math.round(productionDifference * 0.25 * 10) / 10; // 0.25 €/kWh
      
      // Calcola impatto della polvere in base all'ultima pulizia e condizioni meteo
      const lastCleaningDate = panelData.lastCleaning ? new Date(panelData.lastCleaning) : installDate;
      const daysSinceLastCleaning = Math.max(0, (now - lastCleaningDate) / (1000 * 60 * 60 * 24));
      
      // Accumulo polvere (0-1)
      const dustAccumulation = Math.min(0.7, (daysSinceLastCleaning / 180) * 0.3 + (weatherData.current.humidity / 100) * 0.2);
      
      // Impatto umidità (0-1)
      const humidityImpact = (weatherData.current.humidity / 100) * 0.5;
      
      // Stima dell'ombreggiamento (valore casuale per demo)
      const shadingImpact = Math.random() * 0.2;
      
      // Genera previsioni per i vari orientamenti
      const orientationPredictions = Object.entries(orientationEfficiency).map(([orientation, factor]) => ({
        orientation,
        totalProduction: Math.round(annualProduction * factor * 100) / 100,
        averageEfficiency: Math.round(efficiencyFactor * factor * 100)
      }));
      
      // Stima degradazione futura
      const efficiencyIn5Years = Math.max(70, Math.round(currentEfficiency - (yearlyDegradation * 5)));
      const efficiencyNext12Months = Math.max(85, Math.round(currentEfficiency - yearlyDegradation));
      
      // Determina lo stato generale del pannello
      let panelState = 'optimal';
      if (dustAccumulation > 0.4) {
        panelState = 'needs_cleaning';
      } else if (currentEfficiency < baseEfficiency - 15) {
        panelState = 'needs_inspection';
      }
      
      // Genera raccomandazioni
      const recommendations = [];
      
      if (dustAccumulation > 0.3) {
        recommendations.push({
          title: 'Pulizia necessaria',
          description: `L'accumulo di polvere sta riducendo l'efficienza. Si consiglia una pulizia programmata.`,
          priority: dustAccumulation > 0.5 ? 'high' : 'medium',
          estimatedImpact: `+${Math.round(dustAccumulation * 100 * 0.8)}% di efficienza`
        });
      }
      
      if (orientationPercentageDiff > 15) {
        recommendations.push({
          title: 'Migliorare orientamento',
          description: `Il pannello non è orientato in modo ottimale. Considerare il riposizionamento.`,
          priority: orientationPercentageDiff > 30 ? 'high' : 'medium',
          estimatedImpact: `+${orientationPercentageDiff}% di produzione`
        });
      }
      
      if (shadingImpact > 0.15) {
        recommendations.push({
          title: 'Ridurre ombreggiamento',
          description: 'Verificare e rimuovere eventuali fonti di ombra parziale sul pannello.',
          priority: 'medium',
          estimatedImpact: `+${Math.round(shadingImpact * 100 * 1.5)}% di produzione`
        });
      }
      
      if (ageInYears > 15) {
        recommendations.push({
          title: 'Valutare sostituzione',
          description: `Il pannello ha ${Math.floor(ageInYears)} anni, considerare la sostituzione nei prossimi anni.`,
          priority: ageInYears > 20 ? 'high' : 'medium',
          estimatedImpact: 'Fino a +25% di efficienza con pannelli di nuova generazione'
        });
      }
      
      // Risultato dell'analisi completa
      const analysisResult = {
        degradation: {
          currentEfficiency: currentEfficiency,
          efficiencyDifference: baseEfficiency - currentEfficiency,
          naturalDegradation: naturalDegradation,
          state: panelState,
          efficiencyIn5Years: efficiencyIn5Years,
          next12Months: {
            efficiency: efficiencyNext12Months
          }
        },
        orientation: {
          currentOrientation: panelData.location.orientation,
          optimalOrientation: optimalOrientation,
          percentageDifference: orientationPercentageDiff,
          productionDifference: productionDifference,
          economicBenefit: economicBenefit,
          predictions: orientationPredictions
        },
        environmentalFactors: {
          dustAccumulation: dustAccumulation,
          humidityImpact: humidityImpact,
          shading: shadingImpact
        },
        weatherData: weatherData,
        recommendations: recommendations
      };
      
      console.log('✅ Analisi completata per pannello:', panelData.name);
      return analysisResult;
      
    } catch (error) {
      console.error('⚠️ Errore in analyzePanelWithRealData:', error);
      
      // Restituisci dati di fallback in caso di errore
      return {
        degradation: {
          currentEfficiency: panelData.efficiency || 90,
          efficiencyDifference: 5,
          state: panelData.status || 'optimal',
          efficiencyIn5Years: Math.max(70, (panelData.efficiency || 90) - 10),
          next12Months: {
            efficiency: Math.max(85, (panelData.efficiency || 90) - 2)
          }
        },
        orientation: {
          currentOrientation: panelData.location?.orientation || 'Sud',
          optimalOrientation: 'Sud',
          percentageDifference: 0,
          productionDifference: 0,
          economicBenefit: 0,
          predictions: [
            { orientation: 'Sud', totalProduction: 1.5, averageEfficiency: 90 },
            { orientation: 'Sud-Est', totalProduction: 1.38, averageEfficiency: 83 },
            { orientation: 'Est', totalProduction: 1.13, averageEfficiency: 68 },
            { orientation: 'Sud-Ovest', totalProduction: 1.38, averageEfficiency: 83 },
            { orientation: 'Ovest', totalProduction: 1.13, averageEfficiency: 68 }
          ]
        },
        environmentalFactors: {
          dustAccumulation: 0.2,
          humidityImpact: 0.15,
          shading: 0.05
        },
        weatherData: {
          current: {
            temperature: 25,
            humidity: 60,
            solarIrradiance: 800,
            currentCondition: 'sunny'
          },
          forecast: [{ date: new Date().toISOString(), temperature: 25, condition: 'sunny', solarIrradiance: 800 },
            { date: new Date(Date.now() + 86400000).toISOString(), temperature: 26, condition: 'partly-sunny', solarIrradiance: 750 }
          ]
        },
        recommendations: [
          {
            title: 'Manutenzione ordinaria',
            description: 'Eseguire la pulizia periodica per mantenere l\'efficienza ottimale.',
            priority: 'low'
          }
        ]
      };
    }
  }

  predictProduction = async (panelData, days = 30) => {
    try {
      const weatherData = await WeatherService.getSolarWeatherData(
        panelData.location.lat, 
        panelData.location.lon
      );

      const capacityKW = panelData.capacity / 1000;
      const efficiencyFactor = panelData.efficiency / 100;
      
      // Produzioni previste giornaliere
      const dailyPredictions = [];
      
      // Genera previsioni basate sui dati meteo
      for (let i = 0; i < Math.min(days, 7); i++) {
        const day = weatherData.forecast && weatherData.forecast[i] 
          ? weatherData.forecast[i] 
          : { 
              date: new Date(Date.now() + i * 86400000).toISOString(),
              temperature: 25,
              solarIrradiance: 800,
              condition: 'partly-sunny'
            };
            
        // Calcola produzione stimata (kWh)
        const irradianceFactor = Math.min(day.solarIrradiance, 1200) / 1000;
        const tempFactor = 1 - Math.max(0, (day.temperature - 25) * 0.005);
        const dailyProduction = capacityKW * efficiencyFactor * irradianceFactor * tempFactor * 6;
        
        dailyPredictions.push({
          date: day.date,
          production: Math.round(dailyProduction * 100) / 100,
          efficiency: Math.round(efficiencyFactor * tempFactor * 100),
          weather: day.condition
        });
      }
      
      // Genera dati casuali per i giorni rimanenti
      for (let i = dailyPredictions.length; i < days; i++) {
        const randomIrradiance = 600 + Math.random() * 400;
        const randomTemp = 20 + Math.random() * 15;
        const irradianceFactor = randomIrradiance / 1000;
        const tempFactor = 1 - Math.max(0, (randomTemp - 25) * 0.005);
        const dailyProduction = capacityKW * efficiencyFactor * irradianceFactor * tempFactor * 6;
        
        const conditions = ['sunny', 'partly-sunny', 'cloudy', 'rainy'];
        const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
        
        dailyPredictions.push({
          date: new Date(Date.now() + i * 86400000).toISOString(),
          production: Math.round(dailyProduction * 100) / 100,
          efficiency: Math.round(efficiencyFactor * tempFactor * 100),
          weather: randomCondition
        });
      }
      
      // Calcola statistiche
      const totalProduction = dailyPredictions.reduce((sum, day) => sum + day.production, 0);
      const avgEfficiency = dailyPredictions.reduce((sum, day) => sum + day.efficiency, 0) / days;
      
      return {
        dailyPredictions,
        stats: {
          totalProduction: Math.round(totalProduction * 100) / 100,
          averageEfficiency: Math.round(avgEfficiency),
          period: days,
          co2Saved: Math.round(totalProduction * 0.4 * 10) / 10, // kg CO2 risparmiati (0.4 kg/kWh)
          economicValue: Math.round(totalProduction * 0.25 * 100) / 100 // 0.25 €/kWh
        }
      };
    } catch (error) {
      console.error('Errore durante la previsione di produzione:', error);
      return {
        dailyPredictions: [],
        stats: {
          totalProduction: 0,
          averageEfficiency: 0,
          period: days,
          co2Saved: 0,
          economicValue: 0
        }
      };
    }
  }

  analyzeSystem = async (panels) => {
    try {
      console.log('🔄 Inizio analyzeSystem con', panels.length, 'pannelli');
      
      if (!panels || panels.length === 0) {
        console.log('⚠️ Nessun pannello da analizzare');
        return {
          totalProduction: 0,
          efficiency: 0,
          issues: [],
          recommendations: [],
          weatherImpact: 0
        };
      }
      
      // Ottieni dati meteo per la prima posizione disponibile
      let weatherData = null;
      for (const panel of panels) {
        if (panel.location && panel.location.lat && panel.location.lon) {
          weatherData = await WeatherService.getSolarWeatherData(
            panel.location.lat,
            panel.location.lon
          );
          break;
        }
      }
      
      if (!weatherData) {
        console.log('⚠️ Nessun dato meteo disponibile');
        weatherData = {
          current: {
            temperature: 25,
            humidity: 60,
            solarIrradiance: 800,
            currentCondition: 'sunny'
          }
        };
      }
      
      // Calcola la produzione totale e l'efficienza media
      let totalProduction = 0;
      let totalEfficiency = 0;
      let panelsWithIssues = 0;
      
      // Analizza ogni pannello
      const panelIssues = [];
      
      for (const panel of panels) {
        // Calcola produzione attuale
        const capacityKW = panel.capacity / 1000;
        const efficiency = panel.efficiency / 100;
        const production = capacityKW * efficiency * 5; // 5 ore equivalenti
        
        totalProduction += panel.currentProduction || Math.round(production * 1000);
        totalEfficiency += panel.efficiency || 95;
        
        // Controlla problemi
        if (panel.status && panel.status !== 'optimal') {
          panelsWithIssues++;
          
          const issue = {
            panelId: panel.id,
            panelName: panel.name,
            type: panel.status,
            severity: panel.status === 'needs_cleaning' ? 'medium' : 'high',
            impact: panel.status === 'needs_cleaning' ? 5 : 15,
            description: panel.status === 'needs_cleaning' 
              ? `Il pannello "${panel.name}" necessita di pulizia` 
              : `Il pannello "${panel.name}" richiede manutenzione`
          };
          
          panelIssues.push(issue);
        }
        
        // Controlla età se disponibile
        if (panel.installationDate) {
          const installDate = new Date(panel.installationDate);
          const now = new Date();
          const ageInYears = (now - installDate) / (1000 * 60 * 60 * 24 * 365.25);
          
          if (ageInYears > 15) {
            panelsWithIssues++;
            
            const issue = {
              panelId: panel.id,
              panelName: panel.name,
              type: 'age',
              severity: ageInYears > 20 ? 'high' : 'medium',
              impact: Math.round(ageInYears * 0.7),
              description: `Il pannello "${panel.name}" ha ${Math.floor(ageInYears)} anni, considerare la sostituzione`
            };
            
            panelIssues.push(issue);
          }
        }
        
        // Controlla orientamento
        if (panel.location && panel.location.orientation && panel.location.orientation !== 'Sud') {
          const orientationMap = {
            'Sud': { rank: 4 },
            'Sud-Est': { rank: 3 },
            'Sud-Ovest': { rank: 3 },
            'Est': { rank: 2 },
            'Ovest': { rank: 2 },
            'Nord-Est': { rank: 1 },
            'Nord-Ovest': { rank: 1 },
            'Nord': { rank: 0 }
          };
          
          const currentRank = orientationMap[panel.location.orientation]?.rank || 2;
          const optimalRank = orientationMap['Sud'].rank;
          const rankDifference = optimalRank - currentRank;
          
          if (rankDifference > 1) {
            panelsWithIssues++;
            
            const issue = {
              panelId: panel.id,
              panelName: panel.name,
              type: 'orientation',
              severity: rankDifference > 2 ? 'medium' : 'low',
              impact: rankDifference * 8,
              description: `Il pannello "${panel.name}" non ha un orientamento ottimale (${panel.location.orientation})`
            };
            
            panelIssues.push(issue);
          }
        }
      }
      
      // Calcola l'efficienza media
      const avgEfficiency = panels.length > 0 ? totalEfficiency / panels.length : 0;
      
      // Genera raccomandazioni di sistema
      const recommendations = [];
      
      if (panelsWithIssues > 0) {
        const percentageWithIssues = Math.round((panelsWithIssues / panels.length) * 100);
        
        recommendations.push({
          title: 'Pianifica manutenzione',
          description: `${panelsWithIssues} pannelli (${percentageWithIssues}%) necessitano di manutenzione o hanno problemi di configurazione.`,
          priority: panelsWithIssues > panels.length * 0.3 ? 'high' : 'medium',
          type: 'maintenance'
        });
      }
      
      // Stima impatto meteo
      let weatherImpact = 0;
      
      if (weatherData) {
        const currentTemp = weatherData.current.temperature;
        const currentHumidity = weatherData.current.humidity;
        
        if (currentTemp > 30) {
          weatherImpact += (currentTemp - 30) * 0.5; // 0.5% per ogni grado sopra 30°C
          
          recommendations.push({
            title: 'Temperatura elevata',
            description: `L'attuale temperatura di ${currentTemp}°C riduce l'efficienza di circa ${Math.round(weatherImpact)}%.`,
            priority: weatherImpact > 5 ? 'medium' : 'low',
            type: 'weather'
          });
        }
        
        if (currentHumidity > 80) {
          const humidityImpact = (currentHumidity - 80) * 0.2; // 0.2% per ogni punto sopra 80%
          weatherImpact += humidityImpact;
          
          recommendations.push({
            title: 'Umidità elevata',
            description: `L'attuale umidità del ${currentHumidity}% potrebbe ridurre l'efficienza e accelerare la degradazione dei componenti.`,
            priority: 'low',
            type: 'weather'
          });
        }
      }
      
      console.log('✅ analyzeSystem completato con successo');
      
      return {
        totalProduction,
        efficiency: Math.round(avgEfficiency),
        issues: panelIssues,
        recommendations,
        weatherImpact: Math.round(weatherImpact)
      };
      
    } catch (error) {
      console.error('Errore durante l\'analisi di sistema:', error);
      throw error;
    }
  }
}

export default SolarAnalysisService;