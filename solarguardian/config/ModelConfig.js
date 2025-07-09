// File: config/ModelConfig.js

/**
 * Configurazioni per i modelli ML utilizzati nell'app
 */
export const ModelConfig = {
  // MobileNet
  mobilenet: {
    name: 'mobilenet-v2',
    version: 2,
    alpha: 1.0,
    // URL del modello se vogliamo precaricare una versione specifica
    // altrimenti viene caricato da TensorFlow Hub
    modelUrl: null
  },
  
  // Definizioni di problemi del pannello solare
  panelIssues: {
    // Parole chiave correlate alla polvere o sporco
    dust_accumulated: [
      'dust', 'dirty', 'soil', 'sand', 'dirt', 'smudge', 'stain', 'grime', 
      'muddy', 'filth', 'soiled', 'unclean', 'grimy'
    ],
    // Parole chiave correlate a discolorazione
    discoloration: [
      'discolor', 'faded', 'yellow', 'discoloration', 'stain', 'tint', 'hue',
      'pigment', 'blemish', 'tarnish', 'patina'
    ],
    // Parole chiave correlate a crepe o danni strutturali
    micro_cracks: [
      'crack', 'fracture', 'break', 'damage', 'split', 'rupture', 'fissure',
      'shatter', 'broken', 'crushed', 'cracked'
    ],
    // Parole chiave correlate a degradazione grave
    severe_degradation: [
      'corrosion', 'rust', 'damage', 'broken', 'deterioration', 'degradation',
      'decay', 'ruin', 'destroyed', 'worn', 'eroded', 'dilapidated', 'weathered'
    ],
    // Parole chiave correlate ai pannelli solari
    solar_panel: [
      'panel', 'solar', 'photovoltaic', 'pv', 'module', 'silicon', 'cell', 
      'array', 'electricity', 'power', 'energy', 'sun', 'light', 'renewable'
    ],
    // Parole chiave correlate a superfici riflettenti o vetro
    reflective_surface: [
      'glass', 'mirror', 'reflective', 'shiny', 'glossy', 'transparent',
      'translucent', 'screen', 'surface', 'polished', 'gleaming'
    ]
  }
};

export default ModelConfig;