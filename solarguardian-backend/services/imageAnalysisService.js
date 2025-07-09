// services/imageAnalysisService.js

const PanelDetectionService = require('./PanelDetectionService');
const fs = require('fs').promises;
const path = require('path');

// Initialize the panel detection service
const panelDetector = new PanelDetectionService();

// Initialize the service when module loads
(async function() {
  try {
    await panelDetector.initialize();
    console.log('Panel detection service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize panel detection service:', error);
  }
})();

/**
 * Analyzes an image of a solar panel and returns diagnostic information
 * 
 * @param {Buffer} imageData - Binary image data
 * @param {Object} metadata - Additional information about the panel
 * @returns {Promise<Object>} Analysis results
 */
async function analyzePanelImage(imageData, metadata = {}) {
  try {
    // Process the image data
    const tempFilePath = await saveTemporaryImage(imageData);
    
    // Analyze the image using the detection service
    const analysisResults = await panelDetector.analyzeImage(tempFilePath);
    
    // Clean up temporary file
    await cleanupTemporaryImage(tempFilePath);
    
    // Enhance results with any provided metadata
    const enhancedResults = enhanceResultsWithMetadata(analysisResults, metadata);
    
    return enhancedResults;
  } catch (error) {
    console.error('Error analyzing panel image:', error);
    throw new Error('Image analysis failed: ' + error.message);
  }
}

// Helper functions
async function saveTemporaryImage(imageData) {
  // Implementation for saving image data to a temporary file
  const tempDir = path.join(__dirname, '../temp');
  
  // Ensure temp directory exists
  try {
    await fs.mkdir(tempDir, { recursive: true });
  } catch (err) {
    // Directory already exists or cannot be created
    if (err.code !== 'EEXIST') throw err;
  }
  
  const tempFilePath = path.join(tempDir, `panel_${Date.now()}.jpg`);
  await fs.writeFile(tempFilePath, imageData);
  return tempFilePath;
}

async function cleanupTemporaryImage(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.warn('Failed to delete temporary file:', error);
  }
}

function enhanceResultsWithMetadata(results, metadata) {
  // Add metadata to results if available
  if (metadata.panelId) {
    results.panelId = metadata.panelId;
  }
  
  if (metadata.panelType) {
    // Adjust results based on panel type if needed
    if (metadata.panelType.toLowerCase().includes('mono')) {
      // Adjust for monocrystalline panels
      results.typeSpecificDetails = {
        typicalEfficiency: '18-22%',
        typicalDegradation: '0.5% per year'
      };
    } else if (metadata.panelType.toLowerCase().includes('poly')) {
      // Adjust for polycrystalline panels
      results.typeSpecificDetails = {
        typicalEfficiency: '15-18%',
        typicalDegradation: '0.7% per year'
      };
    }
  }
  
  // Add timestamp
  results.analysisTimestamp = new Date().toISOString();
  
  return results;
}

module.exports = {
  analyzePanelImage
};