// services/PanelDetectionService.js
const fs = require('fs');
const path = require('path');

/**
 * Service for analyzing solar panel images and detecting issues
 * This is a backend version that doesn't rely on TensorFlow.js
 */
class PanelDetectionService {
  constructor() {
    this.initialized = false;
    
    // Panel issue detection keywords for rule-based detection
    this.panelIssues = {
      // Keywords related to dust or dirt
      dust_accumulated: [
        'dust', 'dirty', 'soil', 'sand', 'dirt', 'smudge', 'stain', 'grime', 
        'muddy', 'filth', 'soiled', 'unclean', 'grimy'
      ],
      // Keywords related to discoloration
      discoloration: [
        'discolor', 'faded', 'yellow', 'discoloration', 'stain', 'tint', 'hue',
        'pigment', 'blemish', 'tarnish', 'patina'
      ],
      // Keywords related to cracks or structural damage
      micro_cracks: [
        'crack', 'fracture', 'break', 'damage', 'split', 'rupture', 'fissure',
        'shatter', 'broken', 'crushed', 'cracked'
      ],
      // Keywords related to severe degradation
      severe_degradation: [
        'corrosion', 'rust', 'damage', 'broken', 'deterioration', 'degradation',
        'decay', 'ruin', 'destroyed', 'worn', 'eroded', 'dilapidated', 'weathered'
      ],
      // Keywords related to solar panels
      solar_panel: [
        'panel', 'solar', 'photovoltaic', 'pv', 'module', 'silicon', 'cell', 
        'array', 'electricity', 'power', 'energy', 'sun', 'light', 'renewable'
      ],
      // Keywords related to reflective surfaces or glass
      reflective_surface: [
        'glass', 'mirror', 'reflective', 'shiny', 'glossy', 'transparent',
        'translucent', 'screen', 'surface', 'polished', 'gleaming'
      ]
    };
  }

  /**
   * Initializes the service
   * @returns {Promise<boolean>} Initialization status
   */
  async initialize() {
    if (this.initialized) {
      return true;
    }
    
    try {
      // In a real implementation, this is where you would:
      // 1. Load detection models
      // 2. Initialize image processing libraries
      // 3. Set up any other resources needed for analysis
      
      console.log('Panel detection service initialized successfully');
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize panel detection service:', error);
      return false;
    }
  }

  /**
   * Analyzes an image of a solar panel
   * @param {string} imagePath - Path to the image file
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeImage(imagePath) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Check if the file exists
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }
      
      // In a real implementation, this would use computer vision libraries
      // Here we'll use a simple deterministic algorithm based on the image file
      
      // Get image file stats for deterministic "analysis"
      const stats = fs.statSync(imagePath);
      const fileSize = stats.size;
      const modTime = stats.mtime.getTime();
      
      // Generate a deterministic hash from the file path to simulate analysis
      const hash = this.simpleHash(imagePath + fileSize + modTime);
      
      // Create virtual "predictions" based on the hash
      const simulatedPredictions = this.createSimulatedPredictions(hash);
      
      // Analyze these predictions to determine panel condition
      return this.analyzePanelCondition(simulatedPredictions);
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw new Error(`Image analysis failed: ${error.message}`);
    }
  }
  
  /**
   * Create simulated predictions based on a hash value
   * @param {number} hash - Hash value to use for simulation
   * @returns {Array} Array of simulated predictions
   */
  createSimulatedPredictions(hash) {
    // Determine problem types based on the hash
    const isDustProblem = hash % 5 === 0;
    const isDiscolorationProblem = hash % 7 === 0;
    const isCrackProblem = hash % 11 === 0;
    const isDegradationProblem = hash % 13 === 0;
    
    // Calculate probabilities
    const dustProbability = isDustProblem ? 0.6 + (hash % 30) / 100 : 0.1 + (hash % 15) / 100;
    const discolorationProbability = isDiscolorationProblem ? 0.5 + (hash % 40) / 100 : 0.05 + (hash % 10) / 100;
    const crackProbability = isCrackProblem ? 0.7 + (hash % 25) / 100 : 0.03 + (hash % 8) / 100;
    const degradationProbability = isDegradationProblem ? 0.65 + (hash % 30) / 100 : 0.02 + (hash % 5) / 100;
    
    // Create the predictions array (simulating ML model output)
    return [
      {
        className: 'solar panel',
        probability: 0.85 + (hash % 15) / 100
      },
      {
        className: 'glass surface',
        probability: 0.75 + (hash % 20) / 100
      },
      {
        className: isDustProblem ? 'dust accumulation' : 'clean surface',
        probability: dustProbability
      },
      {
        className: isDiscolorationProblem ? 'discoloration' : 'even coloration',
        probability: discolorationProbability
      },
      {
        className: isCrackProblem ? 'micro cracks' : 'intact surface',
        probability: crackProbability
      },
      {
        className: isDegradationProblem ? 'material degradation' : 'good condition',
        probability: degradationProbability
      }
    ];
  }
  
  /**
   * Simple string hash function
   * @param {string} str - Input string
   * @returns {number} Hash value
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Analyzes predictions to determine panel condition
   * @param {Array} predictions - Model predictions
   * @returns {Object} Panel condition analysis
   */
  analyzePanelCondition(predictions) {
    // Calculate match scores for each issue type
    const matchScores = {
      optimal: 0,
      dust_accumulated: 0,
      discoloration: 0,
      micro_cracks: 0,
      severe_degradation: 0,
      is_panel: 0
    };
    
    let totalConfidence = 0;
    
    // Analyze each prediction
    predictions.forEach(prediction => {
      const { className, probability } = prediction;
      const lowerClassName = className.toLowerCase();
      
      // Check if it's a solar panel
      this.panelIssues.solar_panel.forEach(keyword => {
        if (lowerClassName.includes(keyword)) {
          matchScores.is_panel += probability * 2; // Double weight
        }
      });
      
      // Check if it's a reflective surface
      this.panelIssues.reflective_surface.forEach(keyword => {
        if (lowerClassName.includes(keyword)) {
          matchScores.is_panel += probability;
        }
      });
      
      // Check for various issues
      for (const [issueType, keywords] of Object.entries(this.panelIssues)) {
        if (issueType === 'solar_panel' || issueType === 'reflective_surface') {
          continue; // Skip these categories for this analysis
        }
        
        keywords.forEach(keyword => {
          if (lowerClassName.includes(keyword)) {
            matchScores[issueType] += probability;
          }
        });
      }
      
      totalConfidence += probability;
    });
    
    // Normalize the scores
    for (const key in matchScores) {
      if (key !== 'is_panel') {
        matchScores[key] = matchScores[key] / totalConfidence;
      }
    }
    
    // Ensure minimum panel confidence
    if (matchScores.is_panel < 0.1) {
      matchScores.is_panel = 0.1;
    }
    
    // Determine the most likely condition
    let condition = 'optimal';
    let maxScore = matchScores.optimal;
    
    for (const [issueType, score] of Object.entries(matchScores)) {
      if (issueType !== 'is_panel' && issueType !== 'optimal' && score > maxScore) {
        maxScore = score;
        condition = issueType;
      }
    }
    
    // If no significant issues, mark as optimal
    if (maxScore < 0.15) {
      condition = 'optimal';
    }
    
    // Calculate health score
    const healthScore = this.calculateHealthScore(condition, matchScores);
    
    // Calculate efficiency impact
    const efficiencyImpact = this.calculateEfficiencyImpact(condition, healthScore);
    
    // Generate description and recommendations
    const { description, recommendations } = this.generateDescriptionAndRecommendations(
      condition,
      efficiencyImpact.efficiencyReduction
    );
    
    // Return the complete analysis
    return {
      condition,
      confidence: matchScores.is_panel * (1 - maxScore / 2),
      healthScore,
      efficiencyImpact,
      description,
      recommendations,
      debug: {
        matchScores,
        rawPredictions: predictions
      }
    };
  }
  
  /**
   * Calculate panel health score
   * @param {string} condition - Panel condition
   * @param {Object} matchScores - Condition match scores
   * @returns {number} Health score (0-100)
   */
  calculateHealthScore(condition, matchScores) {
    const baseScores = {
      optimal: 95,
      dust_accumulated: 80,
      discoloration: 70,
      micro_cracks: 55,
      severe_degradation: 40
    };
    
    // Start with the base score for the condition
    let score = baseScores[condition];
    
    // Adjust based on problem intensity
    const problemIntensity = matchScores[condition];
    
    if (condition !== 'optimal') {
      // Higher problem score means lower health score
      score -= problemIntensity * 20;
    }
    
    // Add some natural variation
    score += (Math.random() * 5) - 2.5;
    
    // Limit score between 10 and 100
    return Math.min(100, Math.max(10, Math.round(score)));
  }
  
  /**
   * Calculate efficiency impact based on detected condition
   * @param {string} condition - Panel condition
   * @param {number} healthScore - Panel health score
   * @returns {Object} Efficiency impact data
   */
  calculateEfficiencyImpact(condition, healthScore) {
    // Base efficiency reduction percentages
    const baseReduction = {
      optimal: 0,
      dust_accumulated: 8,
      discoloration: 15,
      micro_cracks: 25,
      severe_degradation: 40
    };
    
    // Calculate efficiency reduction
    let efficiencyReduction = baseReduction[condition];
    
    // Adjust based on health score (lower health = higher reduction)
    const healthFactor = (100 - healthScore) / 20; // Factor 0-5
    efficiencyReduction = efficiencyReduction * (1 + healthFactor * 0.2);
    
    // Round to 1 decimal place
    efficiencyReduction = Math.round(efficiencyReduction * 10) / 10;
    
    // Calculate economic impact
    const avgKwhPrice = 0.25; // €/kWh
    const panelCapacity = 350; // W (typical)
    const dailyProduction = 5; // equivalent production hours per day
    const annualProduction = panelCapacity / 1000 * dailyProduction * 365; // kWh/year
    
    const lostProduction = annualProduction * (efficiencyReduction / 100);
    const economicImpact = Math.round(lostProduction * avgKwhPrice);
    
    return {
      efficiencyReduction,
      economicImpact
    };
  }
  
  /**
   * Generate description and recommendations based on detected condition
   * @param {string} condition - Panel condition
   * @param {number} efficiencyReduction - Efficiency reduction percentage
   * @returns {Object} Description and recommendations
   */
  generateDescriptionAndRecommendations(condition, efficiencyReduction) {
    let description, recommendations;
    
    switch(condition) {
      case 'optimal':
        description = "L'analisi visiva ha rilevato che il pannello è in condizioni ottimali. "+
                     "Non sono stati identificati problemi significativi di accumulo di polvere, "+
                     "decolorazione o micro-fratture. La superficie appare pulita e integra.";
        recommendations = [
          "Continuare con la manutenzione ordinaria programmata",
          "Eseguire un'ispezione visiva ogni 3-6 mesi",
          "Monitorare l'efficienza per individuare eventuali cali di prestazione"
        ];
        break;
        
      case 'dust_accumulated':
        description = `L'analisi visiva ha rilevato un accumulo significativo di polvere sulla superficie del pannello. `+
                     `Questo sta riducendo l'efficienza del pannello di circa ${efficiencyReduction}%. `+
                     `La distribuzione della polvere appare ${efficiencyReduction > 10 ? 'non uniforme, con aree particolarmente coperte' : 'relativamente uniforme'}.`;
        recommendations = [
          "Programmare una pulizia entro 7-14 giorni",
          "Utilizzare acqua demineralizzata e strumenti non abrasivi per la pulizia",
          "Considerare l'installazione di un sistema di pulizia automatica",
          "Aumentare la frequenza delle pulizie durante i periodi secchi o polverosi"
        ];
        break;
        
      case 'discoloration':
        description = `L'analisi visiva ha rilevato segni di decolorazione sulla superficie del pannello. `+
                     `Questo fenomeno, causato dall'esposizione prolungata ai raggi UV e agli agenti atmosferici, `+
                     `sta riducendo l'efficienza del pannello di circa ${efficiencyReduction}%. `+
                     `La decolorazione è ${efficiencyReduction > 15 ? 'diffusa su ampie aree' : 'localizzata in alcune zone'}.`;
        recommendations = [
          "Pianificare un'ispezione tecnica professionale",
          "Verificare l'età del pannello rispetto alla vita utile prevista",
          "Considerare l'applicazione di rivestimenti protettivi UV se disponibili",
          "Monitorare la progressione della decolorazione nei prossimi mesi"
        ];
        break;
        
      case 'micro_cracks':
        description = `L'analisi visiva ha rilevato la presenza di micro-fratture nelle celle del pannello. `+
                     `Questo problema, che può essere causato da stress termico, impatti meccanici o difetti di produzione, `+
                     `sta riducendo l'efficienza del pannello di circa ${efficiencyReduction}%. `+
                     `Le fratture sono ${efficiencyReduction > 25 ? 'estese e potrebbero progredire rapidamente' : 'limitate ma potrebbero espandersi nel tempo'}.`;
        recommendations = [
          "Richiedere un'ispezione tecnica urgente",
          "Eseguire un test elettrico completo del pannello",
          "Verificare il sistema di montaggio per eventuali stress meccanici",
          "Considerare la sostituzione del pannello se le fratture sono estese"
        ];
        break;
        
      case 'severe_degradation':
        description = `L'analisi visiva ha rilevato una degradazione grave del pannello. `+
                     `Sono presenti multiple problematiche, tra cui possibili delaminazioni, `+
                     `decolorazioni estese e potenziali microfratture. Questa condizione `+
                     `sta riducendo l'efficienza del pannello di circa ${efficiencyReduction}%, `+
                     `compromettendo seriamente le sue prestazioni.`;
        recommendations = [
          "Programmare la sostituzione del pannello nel breve termine",
          "Eseguire immediatamente un'ispezione tecnica professionale",
          "Verificare la garanzia del produttore",
          "Isolare il pannello dal sistema se possibile per evitare effetti negativi sul resto dell'impianto"
        ];
        break;
        
      default:
        description = "L'analisi visiva ha fornito risultati non conclusivi. Si consiglia un'ispezione manuale.";
        recommendations = [
          "Eseguire un'ispezione visiva manuale",
          "Consultare un tecnico specializzato"
        ];
    }
    
    return { description, recommendations };
  }
}

module.exports = PanelDetectionService;