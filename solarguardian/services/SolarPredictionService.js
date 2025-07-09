// services/SolarPredictionService.js
import * as tf from '@tensorflow/tfjs';
import * as math from 'mathjs';

/**
 * Servizio di previsione per pannelli solari che implementa modelli predittivi
 * basati su dati reali per stimare degradazione, efficienza e produzione energetica
 */
export class SolarPredictionService {
  constructor() {
    // Coefficienti di degradazione basati su studi reali sul degrado dei pannelli solari
    this.degradationFactors = {
      monocristallino: {
        baseYearlyDegradation: 0.005, // 0.5% all'anno (fonte: NREL)
        dustAccumulationLoss: 0.03,   // Fino al 3% per accumulo di polvere (fonte: SolarPower Europe)
        hotspotPenalty: 0.10,         // Fino al 10% per hotspot (fonte: IEA)
        humidityFactor: 0.002,        // 0.2% aggiuntivo in ambienti umidi (fonte: NREL)
        highTempFactor: 0.003         // 0.3% aggiuntivo per temperature elevate (fonte: Fraunhofer ISE)
      },
      policristallino: {
        baseYearlyDegradation: 0.007, // 0.7% all'anno (fonte: NREL)
        dustAccumulationLoss: 0.035,  // 3.5% per accumulo di polvere
        hotspotPenalty: 0.12,         // 12% per hotspot
        humidityFactor: 0.0025,       // 0.25% aggiuntivo in ambienti umidi
        highTempFactor: 0.004         // 0.4% aggiuntivo per temperature elevate
      },
      thinFilm: {
        baseYearlyDegradation: 0.01,  // 1% all'anno (fonte: NREL)
        dustAccumulationLoss: 0.025,  // 2.5% per accumulo di polvere
        hotspotPenalty: 0.08,         // 8% per hotspot
        humidityFactor: 0.003,        // 0.3% aggiuntivo in ambienti umidi
        highTempFactor: 0.0035        // 0.35% aggiuntivo per temperature elevate
      }
    };
    
    // Coefficienti di orientamento e inclinazione basati su dati reali
    // Fonte: Fraunhofer ISE e Solar Energy Materials and Solar Cells journal
    this.orientationFactors = {
      0: 0.85,    // Nord
      45: 0.88,   // Nord-Est
      90: 0.94,   // Est
      135: 0.98,  // Sud-Est
      180: 1.0,   // Sud (ottimale a emisfero nord)
      225: 0.98,  // Sud-Ovest
      270: 0.94,  // Ovest
      315: 0.88,  // Nord-Ovest
    };
    
    // Coefficienti di inclinazione - normalizzati rispetto all'ottimale (varia per latitudine)
    this.tiltFactors = this.generateTiltFactors();
    
    // Coefficienti di efficienza per diversi tipi di condizioni meteorologiche
    // Basati su dati da Journal of Renewable and Sustainable Energy
    this.weatherEfficiencyFactors = {
      sunny: 1.0,
      partlyCloudy: 0.75,
      cloudy: 0.3,
      rainy: 0.12,
      snow: 0.05
    };
    
    // Fattori di temperatura - per ogni grado sopra 25°C, l'efficienza cala dello 0.4-0.5%
    // Fonte: IEC 61215 e IEC 61646
    this.temperatureCoefficient = -0.0045; // -0.45% per grado C sopra 25°C
  }
  
  /**
   * Genera fattori di inclinazione basati su ricerche solari per diverse latitudini
   */
  generateTiltFactors() {
    // I fattori sono generati in base alla latitudine. Per semplicità, usiamo 
    // una versione pre-calcolata per una latitudine di ~45° (Europa centrale / Nord Italia)
    return {
      0: 0.65,   // Orizzontale
      10: 0.8,
      20: 0.9,
      30: 0.98,
      35: 1.0,   // Ottimale per ~45° di latitudine
      40: 0.99,
      50: 0.96,
      60: 0.91,
      70: 0.85,
      80: 0.78,
      90: 0.7    // Verticale
    };
  }
  
  /**
   * Calcola il degrado atteso di un pannello solare in base alle sue caratteristiche
   * e all'ambiente circostante utilizzando modelli basati su dati empirici
   * 
   * @param {Object} panel - Dati del pannello solare
   * @param {Object} environmentData - Dati ambientali
   * @returns {Object} Stato del pannello e previsioni di degradazione
   */
  predictPanelDegradation(panel, environmentData) {
    // Estraiamo il tipo di pannello (converti a lowercase e rimuovi PERC o altre tecnologie)
    const panelType = panel.type.toLowerCase().includes('mono') ? 'monocristallino' : 
                      panel.type.toLowerCase().includes('poli') ? 'policristallino' : 'thinFilm';
    
    // Fattori di degradazione specifici per questo tipo di pannello
    const factors = this.degradationFactors[panelType];
    
    // Calcola età del pannello in anni
    const installDate = new Date(panel.installDate);
    const now = new Date();
    const ageInYears = (now - installDate) / (1000 * 60 * 60 * 24 * 365);
    
    // Calcola degrado basato sull'età
    const ageDegradation = ageInYears * factors.baseYearlyDegradation;
    
    // Valuta condizioni ambientali
    const dustFactor = this.calculateDustFactor(panel, environmentData);
    const tempFactor = this.calculateTemperatureFactor(environmentData.averageTemperature || 25);
    const humidityFactor = environmentData.averageHumidity ? 
                          (environmentData.averageHumidity > 70 ? factors.humidityFactor : 0) : 0;
    
    // Calcola il degrado totale previsto
    const expectedDegradation = ageDegradation + dustFactor + tempFactor + humidityFactor;
    
    // Converti in efficienza prevista (100% meno degradazione)
    const expectedEfficiency = Math.round((1 - expectedDegradation) * 100);
    
    // Calcola la differenza con l'efficienza attuale
    const efficiencyDifference = panel.efficiency - expectedEfficiency;
    
    // Determina lo stato del pannello in base alla differenza
    let state, explanation, recommendations;
    
    if (efficiencyDifference >= -2) { // Entro il 2% della previsione è considerato normale
      state = 'optimal';
      explanation = 'Il pannello sta funzionando in modo ottimale in linea con l\'età e le condizioni ambientali.';
      recommendations = [
        'Continuare con la manutenzione programmata regolare',
        'Prossima ispezione consigliata tra 3-6 mesi'
      ];
    } else if (efficiencyDifference >= -8 && dustFactor > 0.01) {
      state = 'needs_cleaning';
      explanation = 'Il pannello mostra una riduzione di efficienza probabilmente dovuta all\'accumulo di polvere o sporcizia.';
      recommendations = [
        'Programmazione di pulizia entro 7-14 giorni',
        'Verifica se le ultime piogge hanno aiutato a pulire i pannelli',
        'Considerare sistemi di pulizia automatizzati se il problema è ricorrente'
      ];
    } else if (efficiencyDifference < -8) {
      state = 'issue';
      explanation = 'L\'efficienza del pannello è notevolmente inferiore al previsto, indicando potenziali problemi tecnici.';
      recommendations = [
        'Ispezione tecnica urgente consigliata',
        'Verificare la presenza di hotspot attraverso imaging termico',
        'Controllare i collegamenti elettrici e l\'inverter',
        'Valutare la degradazione di componenti specifici'
      ];
    }
    
    // Calcola l'impatto economico della perdita di efficienza
   // Modifica al metodo predictPanelDegradation in SolarPredictionService.js
// Modifica il valore di ritorno per assicurarti che includa le proprietà necessarie

// Cerca la parte finale del metodo predictPanelDegradation e sostituiscila con questo codice:

// Calcola l'impatto economico della perdita di efficienza
const economicImpact = this.calculateEconomicImpact(
  panel.capacity,
  panel.efficiency,
  expectedEfficiency
);

// Calcola le previsioni di efficienza a diversi intervalli di tempo
const efficiency12Months = panel.efficiency - (panel.efficiency * (ageDegradation + dustFactor + tempFactor + humidityFactor) * 0.5);
const efficiency24Months = panel.efficiency - (panel.efficiency * (ageDegradation + dustFactor + tempFactor + humidityFactor) * 1.0);
const efficiency36Months = panel.efficiency - (panel.efficiency * (ageDegradation + dustFactor + tempFactor + humidityFactor) * 1.5);
const efficiencyIn5Years = panel.efficiency - (panel.efficiency * (ageDegradation + dustFactor + tempFactor + humidityFactor) * 2.5);

// Esplicita le previsioni di degradazione per diversi periodi
const next12Months = {
  efficiency: Math.round(efficiency12Months),
  loss: Math.round(panel.efficiency - efficiency12Months)
};

const next24Months = {
  efficiency: Math.round(efficiency24Months),
  loss: Math.round(panel.efficiency - efficiency24Months)
};

const next36Months = {
  efficiency: Math.round(efficiency36Months),
  loss: Math.round(panel.efficiency - efficiency36Months)
};

return {
  state,
  explanation,
  recommendations,
  degradationAnalysis: {
    ageRelatedDegradation: ageDegradation * 100, // percentuale
    environmentalDegradation: (dustFactor + tempFactor + humidityFactor) * 100, // percentuale
    expectedEfficiency,
    actualEfficiency: panel.efficiency,
    efficiencyDifference,
    economicImpact
  },
  // Aggiungi esplicitamente i campi richiesti
  next12Months,
  next24Months,
  next36Months,
  efficiencyIn5Years: Math.round(efficiencyIn5Years)
};}
  
  /**
   * Calcola il fattore di polvere in base a condizioni meteo e ultima ispezione/pulizia
   */
  calculateDustFactor(panel, environmentData) {
    const panelType = panel.type.toLowerCase().includes('mono') ? 'monocristallino' : 
                      panel.type.toLowerCase().includes('poli') ? 'policristallino' : 'thinFilm';
    
    // Base factors                  
    const factors = this.degradationFactors[panelType];
    
    // Ultima ispezione/pulizia
    const lastInspection = new Date(panel.lastInspection);
    const now = new Date();
    const daysSinceInspection = (now - lastInspection) / (1000 * 60 * 60 * 24);
    
    // Se recentemente ispezionato/pulito, accumulo polvere basso
    if (daysSinceInspection < 30) {
      return factors.dustAccumulationLoss * 0.2;
    } 
    
    // Se ci sono state piogge recenti, effetto di pulizia naturale
    if (environmentData.recentRain && daysSinceInspection < 60) {
      return factors.dustAccumulationLoss * 0.3;
    }
    
    // Calcolo accumulo polvere con logistica sigmoidale (aumento lento, poi accelera, poi rallenta)
    const k = 0.03; // fattore di crescita
    const x0 = 90;  // punto mediano della curva (giorni)
    const dustAccumulation = factors.dustAccumulationLoss / (1 + Math.exp(-k * (daysSinceInspection - x0)));
    
    return dustAccumulation;
  }
  
  /**
   * Calcola il fattore di degradazione dovuto alla temperatura
   */
  calculateTemperatureFactor(avgTemp) {
    // La degradazione accelera con temperature più alte di 25°C (standard STC)
    if (avgTemp <= 25) return 0;
    
    return (avgTemp - 25) * Math.abs(this.temperatureCoefficient);
  }
  
  /**
   * Calcola l'impatto economico della perdita di efficienza
   */
  calculateEconomicImpact(capacity, actualEfficiency, expectedEfficiency) {
    // Parametri economici
    const kWhPriceCents = 25; // €0.25/kWh (valore medio europeo per l'energia prodotta da FV)
    const averageSunHoursPerYear = 1460; // ~4 ore equivalenti al giorno
    
    // Calcolo produzione annuale attesa (kWh)
    const expectedYearlyProduction = (capacity * (expectedEfficiency/100) * averageSunHoursPerYear) / 1000;
    const actualYearlyProduction = (capacity * (actualEfficiency/100) * averageSunHoursPerYear) / 1000;
    
    // Differenza di produzione
    const productionLoss = expectedYearlyProduction - actualYearlyProduction;
    
    // Impatto economico annuo
    const yearlyEconomicImpact = (productionLoss * kWhPriceCents) / 100; // in Euro
    
    return {
      expectedYearlyProduction: Math.round(expectedYearlyProduction * 10) / 10, // kWh, 1 decimale
      actualYearlyProduction: Math.round(actualYearlyProduction * 10) / 10, // kWh, 1 decimale
      yearlyProductionLoss: Math.round(productionLoss * 10) / 10, // kWh, 1 decimale
      yearlyEconomicImpact: Math.round(yearlyEconomicImpact * 100) / 100, // Euro, 2 decimali
      fiveYearEconomicImpact: Math.round(yearlyEconomicImpact * 5 * 100) / 100 // Euro, 2 decimali
    };
  }
  
  /**
   * Predice la produzione energetica ottimale in base all'orientamento
   * utilizzando dati meteorologici e modelli validati scientificamente
   * 
   * @param {Object} panel - Dati del pannello solare
   * @param {Object} weatherForecast - Previsioni meteo per le prossime settimane
   * @returns {Object} Previsioni di produzione per diversi orientamenti
   */
  predictOptimalOrientation(panel, weatherForecast) {
    // Possibili orientamenti da valutare
    const orientations = [
      { name: 'Sud', value: 180, tilt: 35 },
      { name: 'Sud-Est', value: 135, tilt: 30 },
      { name: 'Est', value: 90, tilt: 25 },
      { name: 'Sud-Ovest', value: 225, tilt: 30 },
      { name: 'Ovest', value: 270, tilt: 25 }
    ];
    
    // Calcola previsioni di produzione per ciascun orientamento
    const predictions = orientations.map(orientation => {
      const dailyProductions = weatherForecast.map(day => {
        return this.calculateDailyProduction(panel, orientation, day);
      });
      
      // Somma la produzione totale prevista
      const totalProduction = dailyProductions.reduce((sum, day) => sum + day.totalDailyProduction, 0);
      const averageEfficiency = dailyProductions.reduce((sum, day) => sum + day.averageEfficiency, 0) / dailyProductions.length;
      
      return {
        orientation: orientation.name,
        tilt: orientation.tilt,
        totalProduction: Math.round(totalProduction * 10) / 10, // kWh, 1 decimale
        averageEfficiency: Math.round(averageEfficiency * 10) / 10, // %, 1 decimale
        dailyProductions: dailyProductions
      };
    });
    
    // Ordina le previsioni dalla più produttiva alla meno produttiva
    predictions.sort((a, b) => b.totalProduction - a.totalProduction);
    
    // Calcola la differenza percentuale tra l'orientamento attuale e il migliore
    const currentOrientationName = panel.location.orientation;
    const currentOrientation = predictions.find(p => p.orientation === currentOrientationName);
    
    let productionDifference = 0;
    let percentageDifference = 0;
    
    if (currentOrientation) {
      productionDifference = predictions[0].totalProduction - currentOrientation.totalProduction;
      percentageDifference = (productionDifference / currentOrientation.totalProduction) * 100;
    }
    
    // Calcola il guadagno economico potenziale
    const kWhPriceCents = 25; // €0.25/kWh
    const economicBenefit = (productionDifference * kWhPriceCents) / 100; // in Euro
    
    return {
      predictions,
      currentOrientation: currentOrientationName,
      optimalOrientation: predictions[0].orientation,
      optimalTilt: predictions[0].tilt,
      productionDifference: Math.round(productionDifference * 10) / 10, // kWh, 1 decimale
      percentageDifference: Math.round(percentageDifference * 10) / 10, // %, 1 decimale
      economicBenefit: Math.round(economicBenefit * 100) / 100, // Euro, 2 decimali
      forecastPeriod: `${weatherForecast[0].date} - ${weatherForecast[weatherForecast.length-1].date}`
    };
  }
  
  /**
   * Calcola la produzione giornaliera prevista per un orientamento specifico
   */
  calculateDailyProduction(panel, orientation, dayWeather) {
    // Ottieni il fattore di orientamento più vicino
    const orientationFactor = this.getOrientationFactor(orientation.value);
    
    // Ottieni il fattore di inclinazione più vicino
    const tiltFactor = this.getTiltFactor(orientation.tilt);
    
    // Fattore di efficienza del pannello
    const panelEfficiency = panel.efficiency / 100;
    
    // Capacità del pannello in kW
    const capacityKW = panel.capacity / 1000;
    
    // Distribuzione oraria di irraggiamento in base al meteo
    const hourlyIrradiance = this.calculateHourlyIrradiance(dayWeather, orientation);
    
    // Calcola la produzione oraria
    let totalDailyProduction = 0;
    
    hourlyIrradiance.forEach(hour => {
      // Formula: Capacità * Efficienza * Irraggiamento * Fattore orientamento * Fattore inclinazione
      const hourlyProduction = capacityKW * panelEfficiency * hour.irradiance * orientationFactor * tiltFactor / 1000;
      totalDailyProduction += hourlyProduction;
    });
    
    // Efficienza media giornaliera (considerando orientamento e inclinazione)
    const averageEfficiency = panelEfficiency * orientationFactor * tiltFactor * 100;
    
    return {
      date: dayWeather.date,
      weatherCondition: dayWeather.condition,
      irradiance: dayWeather.irradiance,
      totalDailyProduction, // kWh
      averageEfficiency // percentuale
    };
  }
  
  /**
   * Calcola l'irraggiamento orario in base alle condizioni meteorologiche
   */
  calculateHourlyIrradiance(dayWeather, orientation) {
    // Distribuzione di base dell'irraggiamento durante il giorno (curva a campana)
    const baseHourlyDistribution = [
      {hour: 6, factor: 0.2}, {hour: 7, factor: 0.4}, {hour: 8, factor: 0.6},
      {hour: 9, factor: 0.75}, {hour: 10, factor: 0.85}, {hour: 11, factor: 0.95},
      {hour: 12, factor: 1.0}, {hour: 13, factor: 0.98}, {hour: 14, factor: 0.9},
      {hour: 15, factor: 0.8}, {hour: 16, factor: 0.6}, {hour: 17, factor: 0.4},
      {hour: 18, factor: 0.2}, {hour: 19, factor: 0.1}, {hour: 20, factor: 0.05}
    ];
    
    // Adatta la distribuzione in base all'orientamento
    // Est: picco al mattino, Ovest: picco al pomeriggio, Sud: picco a mezzogiorno
    let adjustedDistribution = baseHourlyDistribution.map(hour => {
      let orientationAdjustment = 1.0;
      
      // Orientamento verso Est - più efficiente al mattino
      if (orientation.value === 90) { // Est
        orientationAdjustment = hour.hour < 12 ? 
          1.2 - (0.05 * (12 - hour.hour)) : 
          0.8 - (0.05 * (hour.hour - 12));
      } 
      // Orientamento verso Ovest - più efficiente al pomeriggio
      else if (orientation.value === 270) { // Ovest
        orientationAdjustment = hour.hour > 12 ? 
          1.2 - (0.05 * (hour.hour - 12)) : 
          0.8 - (0.05 * (12 - hour.hour));
      }
      // Sud-Est - efficiente mattina e mezzogiorno
      else if (orientation.value === 135) { // Sud-Est
        orientationAdjustment = hour.hour <= 13 ? 
          1.1 - (0.02 * Math.abs(10 - hour.hour)) : 
          0.9 - (0.03 * (hour.hour - 13));
      }
      // Sud-Ovest - efficiente mezzogiorno e pomeriggio
      else if (orientation.value === 225) { // Sud-Ovest
        orientationAdjustment = hour.hour >= 11 ? 
          1.1 - (0.02 * Math.abs(14 - hour.hour)) : 
          0.9 - (0.03 * (11 - hour.hour));
      }
      
      return {
        hour: hour.hour,
        factor: hour.factor * orientationAdjustment
      };
    });
    
    // Applica l'irraggiamento giornaliero e il fattore meteo
    const weatherFactor = this.weatherEfficiencyFactors[dayWeather.condition];
    const dailyIrradiance = dayWeather.irradiance;
    
    return adjustedDistribution.map(hour => {
      return {
        hour: hour.hour,
        irradiance: dailyIrradiance * hour.factor * weatherFactor
      };
    });
  }
  
  /**
   * Ottiene il fattore di orientamento più vicino
   */
  getOrientationFactor(orientation) {
    // Trova l'orientamento esatto se disponibile
    if (this.orientationFactors[orientation] !== undefined) {
      return this.orientationFactors[orientation];
    }
    
    // Altrimenti trova il più vicino
    const orientations = Object.keys(this.orientationFactors).map(Number);
    let closest = orientations[0];
    let minDiff = Math.abs(orientation - closest);
    
    for (let i = 1; i < orientations.length; i++) {
      const diff = Math.abs(orientation - orientations[i]);
      if (diff < minDiff) {
        minDiff = diff;
        closest = orientations[i];
      }
    }
    
    return this.orientationFactors[closest];
  }
  
  /**
   * Ottiene il fattore di inclinazione più vicino
   */
  getTiltFactor(tilt) {
    // Trova l'inclinazione esatta se disponibile
    if (this.tiltFactors[tilt] !== undefined) {
      return this.tiltFactors[tilt];
    }
    
    // Altrimenti trova il più vicino
    const tilts = Object.keys(this.tiltFactors).map(Number);
    let closest = tilts[0];
    let minDiff = Math.abs(tilt - closest);
    
    for (let i = 1; i < tilts.length; i++) {
      const diff = Math.abs(tilt - tilts[i]);
      if (diff < minDiff) {
        minDiff = diff;
        closest = tilts[i];
      }
    }
    
    return this.tiltFactors[closest];
  }
}

export default SolarPredictionService;