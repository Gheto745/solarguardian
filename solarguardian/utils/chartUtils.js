// File: utils/chartUtils.js
/**
 * Utilità per la sanitizzazione e la validazione dei dati dei grafici
 * per prevenire errori NaN nei percorsi SVG
 */

/**
 * Sanitizza i dati per i grafici rimuovendo valori NaN o invalidi
 * @param {Array} data - Array di dati da sanitizzare
 * @param {Number} defaultValue - Valore predefinito da usare al posto di NaN (default: 0)
 * @returns {Array} - Array sanitizzato
 */
export const sanitizeChartData = (data, defaultValue = 0) => {
  if (!data || !Array.isArray(data)) return [];
  
  return data.map(item => {
    // Se l'item è un oggetto (come nei dati per PieChart)
    if (typeof item === 'object' && item !== null) {
      const sanitizedItem = { ...item };
      
      // Sanitizza il valore se presente
      if ('value' in item && (isNaN(item.value) || !isFinite(item.value))) {
        sanitizedItem.value = defaultValue;
      }
      
      return sanitizedItem;
    }
    
    // Se è un valore semplice (come nei dati per LineChart o BarChart)
    return (isNaN(item) || !isFinite(item)) ? defaultValue : item;
  });
};

/**
 * Verifica se un oggetto di dati per grafici contiene valori NaN
 * @param {Object} chartData - Oggetto dati per grafici
 * @returns {Boolean} - true se contiene valori NaN, false altrimenti
 */
export const hasInvalidChartData = (chartData) => {
  if (!chartData || typeof chartData !== 'object') return true;
  
  // Verifica datasets
  if (chartData.datasets && Array.isArray(chartData.datasets)) {
    for (const dataset of chartData.datasets) {
      if (!dataset.data || !Array.isArray(dataset.data)) return true;
      
      for (const value of dataset.data) {
        if (isNaN(value) || !isFinite(value)) return true;
      }
    }
  }
  
  // Verifica data diretta (come in PieChart)
  if (chartData.data && Array.isArray(chartData.data)) {
    for (const item of chartData.data) {
      if (typeof item === 'object' && 'value' in item) {
        if (isNaN(item.value) || !isFinite(item.value)) return true;
      } else if (isNaN(item) || !isFinite(item)) {
        return true;
      }
    }
  }
  
  return false;
};

/**
 * Crea dati sicuri per i grafici
 * @param {Object} rawData - Dati grezzi
 * @returns {Object} - Dati sanitizzati
 */
export const createSafeChartData = (rawData) => {
  // Se non ci sono dati, restituisci un dataset minimo
  if (!rawData || typeof rawData !== 'object') {
    return {
      labels: ['Nessun dato'],
      datasets: [{ data: [0] }]
    };
  }
  
  const result = { ...rawData };
  
  // Sanitizza i dataset
  if (result.datasets && Array.isArray(result.datasets)) {
    result.datasets = result.datasets.map(dataset => ({
      ...dataset,
      data: sanitizeChartData(dataset.data)
    }));
  }
  
  // Sanitizza i dati diretti
  if (result.data && Array.isArray(result.data)) {
    result.data = sanitizeChartData(result.data);
  }
  
  return result;
};

/**
 * Valida i dati di irradianza per assicurarsi che siano in un intervallo realistico
 * @param {Number} irradianceValue - Valore di irradianza in W/m²
 * @returns {Number} - Valore di irradianza sanitizzato
 */
export const validateIrradiance = (irradianceValue) => {
  const min = 0;
  const max = 1200; // Valore massimo realistico per l'irradianza solare in W/m²
  
  if (isNaN(irradianceValue) || !isFinite(irradianceValue)) {
    return 500; // Valore predefinito se NaN
  }
  
  return Math.min(Math.max(irradianceValue, min), max);
};

/**
 * Aggiunge variazione casuale ai dati per renderli più realistici
 * @param {Number} value - Valore base
 * @param {Number} variationPercent - Percentuale di variazione (default: 10%)
 * @returns {Number} - Valore con variazione casuale
 */
export const addRandomVariation = (value, variationPercent = 10) => {
  if (isNaN(value) || !isFinite(value)) return value;
  
  const factor = 1 + ((Math.random() * variationPercent * 2) - variationPercent) / 100;
  return Math.round(value * factor * 10) / 10;
};

export default {
  sanitizeChartData,
  hasInvalidChartData,
  createSafeChartData,
  validateIrradiance,
  addRandomVariation
};