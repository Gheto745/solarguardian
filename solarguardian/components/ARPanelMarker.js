// File: components/ARPanelMarker.js - AR Panel Marker Component
import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ARPanelMarker = ({ 
  panel, 
  position, 
  onPress, 
  isSelected = false,
  animationDelay = 0 
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: animationDelay,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        delay: animationDelay,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Pulse animation for selected or problematic panels
    if (isSelected || panel.status !== 'optimal') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isSelected, panel.status]);
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'optimal': return '#4CAF50';
      case 'needs_cleaning': return '#FF9800';
      case 'needs_inspection': return '#FF9800';
      case 'issue': return '#F44336';
      default: return '#2196F3';
    }
  };
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'optimal': return 'checkmark-circle';
      case 'needs_cleaning': return 'brush';
      case 'needs_inspection': return 'eye';
      case 'issue': return 'warning';
      default: return 'help-circle';
    }
  };
  
  const formatDistance = (distance) => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };
  
  return (
    <Animated.View
      style={[
        styles.marker,
        {
          left: position.x - 30,
          top: position.y - 40,
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { scale: pulseAnim }
          ]
        }
      ]}
    >
      <TouchableOpacity
        style={styles.markerTouchable}
        onPress={() => onPress(panel)}
        activeOpacity={0.8}
      >
        {/* Main Icon */}
        <View style={[
          styles.iconContainer,
          { 
            backgroundColor: getStatusColor(panel.status),
            borderColor: isSelected ? '#fff' : 'transparent',
            borderWidth: isSelected ? 3 : 0,
          }
        ]}>
          <Ionicons 
            name="sunny" 
            size={24} 
            color="#fff" 
          />
          
          {/* Status indicator */}
          <View style={[
            styles.statusIndicator,
            { backgroundColor: getStatusColor(panel.status) }
          ]}>
            <Ionicons 
              name={getStatusIcon(panel.status)} 
              size={12} 
              color="#fff" 
            />
          </View>
        </View>
        
        {/* Info Panel */}
        <View style={[
          styles.infoPanel,
          { borderTopColor: getStatusColor(panel.status) }
        ]}>
          <Text style={styles.panelName} numberOfLines={1}>
            {panel.name}
          </Text>
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={12} color="#ccc" />
              <Text style={styles.infoText}>
                {formatDistance(panel.distance)}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Ionicons name="speedometer-outline" size={12} color="#ccc" />
              <Text style={styles.infoText}>
                {panel.efficiency}%
              </Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="flash-outline" size={12} color="#ccc" />
              <Text style={styles.infoText}>
                {panel.currentProduction}W
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Ionicons name="battery-half-outline" size={12} color="#ccc" />
              <Text style={styles.infoText}>
                {panel.capacity}W
              </Text>
            </View>
          </View>
          
          {/* Alert indicator */}
          {panel.alerts && panel.alerts.length > 0 && (
            <View style={styles.alertIndicator}>
              <Ionicons name="notifications" size={10} color="#F44336" />
              <Text style={styles.alertCount}>
                {panel.alerts.length}
              </Text>
            </View>
          )}
        </View>
        
        {/* Connection Line */}
        <View style={[
          styles.connectionLine,
          { backgroundColor: getStatusColor(panel.status) }
        ]} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  marker: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  markerTouchable: {
    alignItems: 'center',
  },
  
  // Icon Container
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    position: 'relative',
  },
  statusIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  
  // Info Panel
  infoPanel: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 8,
    padding: 8,
    marginTop: 5,
    minWidth: 120,
    borderTopWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  panelName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  infoText: {
    color: '#ccc',
    fontSize: 11,
    marginLeft: 3,
  },
  
  // Alert Indicator
  alertIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F44336',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  alertCount: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  
  // Connection Line
  connectionLine: {
    width: 2,
    height: 20,
    marginTop: 2,
    opacity: 0.6,
  },
});

export default ARPanelMarker;