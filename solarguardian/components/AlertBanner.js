// File: components/AlertBanner.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AlertBanner = ({ alerts, onViewAll }) => {
  // Se non ci sono alert, non mostrare nulla
  if (!alerts || alerts.length === 0) {
    return null;
  }

  // Mostra solo l'alert più recente o più importante
  const priorityAlert = alerts.sort((a, b) => {
    // Prima ordina per severità
    if (a.severity === 'high' && b.severity !== 'high') return -1;
    if (a.severity !== 'high' && b.severity === 'high') return 1;
    
    // Se la severità è uguale, ordina per data (più recente)
    return new Date(b.date) - new Date(a.date);
  })[0];

  // Imposta l'icona in base al tipo di alert
  const getAlertIcon = (type) => {
    switch(type) {
      case 'technical':
        return 'warning-outline';
      case 'maintenance':
        return 'construct-outline';
      case 'performance':
        return 'trending-down-outline';
      default:
        return 'alert-circle-outline';
    }
  };

  // Imposta il colore in base alla severità
  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'high':
        return '#F44336';
      case 'medium':
        return '#FF9800';
      case 'low':
        return '#4CAF50';
      default:
        return '#2196F3';
    }
  };

  return (
    <View style={styles.container}>
      <View style={[
        styles.banner, 
        { borderLeftColor: getSeverityColor(priorityAlert.severity) }
      ]}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name={getAlertIcon(priorityAlert.type)} 
            size={22} 
            color={getSeverityColor(priorityAlert.severity)} 
          />
        </View>
        
        <View style={styles.contentContainer}>
          <Text style={styles.panelName}>
            {priorityAlert.panelName}
          </Text>
          <Text style={styles.message}>
            {priorityAlert.message}
          </Text>
        </View>
        
        <TouchableOpacity style={styles.moreButton} onPress={onViewAll}>
          {alerts.length > 1 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>+{alerts.length - 1}</Text>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={20} color="#777" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
  },
  banner: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderLeftWidth: 4,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    justifyContent: 'center',
    marginRight: 10,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  panelName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  message: {
    fontSize: 15,
    color: '#333',
  },
  moreButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
  },
  countBadge: {
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 12,
    color: '#777',
    fontWeight: '500',
  },
});

export default AlertBanner;