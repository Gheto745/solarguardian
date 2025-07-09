// File: utils/ModelDownloader.js
import * as FileSystem from 'expo-file-system';
import * as tf from '@tensorflow/tfjs';
import { bundleResourceIO } from '@tensorflow/tfjs-react-native';

/**
 * Utility per gestire il download e il caricamento dei modelli ML
 */
class ModelDownloader {
  constructor() {
    this.modelCache = {};
    this.isDownloading = {};
  }

  /**
   * Scarica un modello da un URL remoto e lo salva in cache locale
   * @param {string} modelUrl - URL del modello da scaricare
   * @param {string} modelName - Nome del modello (per salvataggio locale)
   * @param {Function} progressCallback - Callback per aggiornamenti progresso
   * @returns {Promise<string>} Path locale del modello scaricato
   */
  async downloadModel(modelUrl, modelName, progressCallback = null) {
    // Evita download multipli dello stesso modello
    if (this.isDownloading[modelName]) {
      console.log(`Il modello ${modelName} è già in download`);
      return null;
    }
    
    try {
      this.isDownloading[modelName] = true;
      
      // Crea directory per il modello se non esiste
      const modelDir = `${FileSystem.cacheDirectory}ml_models/${modelName}/`;
      const dirInfo = await FileSystem.getInfoAsync(modelDir);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
      }
      
      // Path file di destinazione
      const localModelPath = `${modelDir}model.json`;
      
      // Verifica se il modello è già scaricato
      const modelInfo = await FileSystem.getInfoAsync(localModelPath);
      if (modelInfo.exists) {
        console.log(`Modello ${modelName} già presente in cache`);
        this.isDownloading[modelName] = false;
        return localModelPath;
      }
      
      // Scarica il file model.json
      console.log(`Download del modello ${modelName} in corso...`);
      const downloadResult = await FileSystem.downloadAsync(
        modelUrl,
        localModelPath,
        {
          md5: true
        }
      );
      
      if (downloadResult.status !== 200) {
        throw new Error(`Errore nel download del modello: ${downloadResult.status}`);
      }
      
      // Leggi il file model.json per trovare i pesi (weights)
      const modelJson = await FileSystem.readAsStringAsync(localModelPath);
      const modelConfig = JSON.parse(modelJson);
      
      // Scarica i file dei pesi se presenti
      if (modelConfig.weightsManifest && modelConfig.weightsManifest.length > 0) {
        const weightsManifest = modelConfig.weightsManifest[0];
        
        if (weightsManifest.paths && weightsManifest.paths.length > 0) {
          const baseUrl = modelUrl.substring(0, modelUrl.lastIndexOf('/') + 1);
          
          for (let i = 0; i < weightsManifest.paths.length; i++) {
            const weightPath = weightsManifest.paths[i];
            const weightUrl = `${baseUrl}${weightPath}`;
            const localWeightPath = `${modelDir}${weightPath}`;
            
            console.log(`Scaricamento peso ${i+1}/${weightsManifest.paths.length}: ${weightPath}`);
            
            await FileSystem.downloadAsync(
              weightUrl,
              localWeightPath,
              {
                md5: true
              }
            );
            
            if (progressCallback) {
              const progress = (i + 1) / weightsManifest.paths.length;
              progressCallback(progress);
            }
          }
        }
      }
      
      console.log(`Modello ${modelName} scaricato con successo`);
      this.isDownloading[modelName] = false;
      return localModelPath;
      
    } catch (error) {
      console.error(`Errore nel download del modello ${modelName}:`, error);
      this.isDownloading[modelName] = false;
      throw error;
    }
  }
  
  /**
   * Carica un modello TensorFlow dalla memoria locale
   * @param {string} modelPath - Path locale del modello
   * @returns {Promise<tf.LayersModel>} Modello TensorFlow caricato
   */
  async loadModel(modelPath) {
    try {
      if (this.modelCache[modelPath]) {
        console.log('Modello recuperato dalla cache');
        return this.modelCache[modelPath];
      }
      
      console.log(`Caricamento modello da ${modelPath}`);
      const model = await tf.loadLayersModel(`file://${modelPath}`);
      
      // Memorizza in cache
      this.modelCache[modelPath] = model;
      
      return model;
    } catch (error) {
      console.error('Errore nel caricamento del modello:', error);
      throw error;
    }
  }
  
  /**
   * Carica un modello precaricato in memoria
   * @param {ArrayBuffer} modelJson - JSON del modello
   * @param {ArrayBuffer[]} modelWeights - Pesi del modello
   * @returns {Promise<tf.LayersModel>} Modello TensorFlow caricato
   */
  async loadBundledModel(modelJson, modelWeights) {
    try {
      const bundleID = JSON.stringify(modelJson).length;
      
      if (this.modelCache[bundleID]) {
        console.log('Modello precaricato recuperato dalla cache');
        return this.modelCache[bundleID];
      }
      
      console.log('Caricamento modello precaricato');
      const model = await tf.loadLayersModel(bundleResourceIO(modelJson, modelWeights));
      
      // Memorizza in cache
      this.modelCache[bundleID] = model;
      
      return model;
    } catch (error) {
      console.error('Errore nel caricamento del modello precaricato:', error);
      throw error;
    }
  }
  
  /**
   * Pulisce la cache dei modelli in memoria
   */
  clearModelCache() {
    for (const key in this.modelCache) {
      if (this.modelCache[key]) {
        this.modelCache[key].dispose();
      }
    }
    
    this.modelCache = {};
    console.log('Cache dei modelli pulita');
  }
}

// Esportazione del singleton
export default new ModelDownloader();