// File: components/ChartComponent.js
import React from 'react';
import { View, Text, StyleSheet, Platform, Dimensions } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import Svg, { Circle } from 'react-native-svg';

const ChartComponent = ({ 
  type = 'line',
  data,
  width,
  height,
  chartConfig,
  style,
  showLegend = true,
  ...props
}) => {
  const { width: screenWidth } = Dimensions.get('window');
  const chartWidth = width || screenWidth - 50;
  
  const defaultChartConfig = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    }
  };
  
  if (!data) {
    return (
      <View style={[styles.noDataContainer, style]}>
        <Text style={styles.noDataText}>Nessun dato disponibile</Text>
      </View>
    );
  }
  
  const config = chartConfig || defaultChartConfig;
  
  // GAUGE CHART (Circular Progress)
  if (type === 'gauge' && Platform.OS === 'web') {
    // Implementazione dei cerchi di progresso per Web
    return (
      <View style={[styles.gaugeContainer, style]}>
        <View style={styles.gaugesRow}>
          {data.data && data.data.map((item, index) => {
            const progress = item.value / 100;
            const size = 80;
            const strokeWidth = 8;
            const radius = (size - strokeWidth) / 2;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference - (circumference * progress);
            
            return (
              <View key={index} style={styles.gaugeItem}>
                <View style={styles.gaugeWrapper}>
                  <Svg width={size} height={size} style={styles.gaugeSvg}>
                    {/* Cerchio di sfondo */}
                    <Circle
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      stroke="#f0f0f0"
                      strokeWidth={strokeWidth}
                      fill="none"
                    />
                    {/* Cerchio di progresso */}
                    <Circle
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      stroke={item.color}
                      strokeWidth={strokeWidth}
                      fill="none"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    />
                  </Svg>
                  <View style={styles.gaugeCenter}>
                    <Text style={styles.gaugeValue}>{item.value}%</Text>
                  </View>
                </View>
                <Text style={styles.gaugeLabel}>{item.label}</Text>
              </View>
            );
          })}
        </View>
        
        {/* Mostra la legenda solo se showLegend è true */}
        {showLegend && (
          <View style={styles.gaugeLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.legendText}>Ottimale (&gt;90%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.legendText}>Attenzione (75-90%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
              <Text style={styles.legendText}>Critico (&lt;75%)</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
  
  // GAUGE CHART - Mobile Fallback
  if (type === 'gauge' && Platform.OS !== 'web') {
    return (
      <View style={[styles.gaugeContainer, style]}>
        <View style={styles.gaugesColumn}>
          {data.data && data.data.map((item, index) => (
            <View key={index} style={styles.mobileGaugeItem}>
              <View style={styles.mobileGaugeHeader}>
                <Text style={styles.mobileGaugeLabel}>{item.label}</Text>
                <Text style={[styles.mobileGaugeValue, { color: item.color }]}>
                  {item.value}%
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        width: `${item.value}%`,
                        backgroundColor: item.color 
                      }
                    ]} 
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
        
        {/* Mostra la legenda solo se showLegend è true */}
        {showLegend && Platform.OS !== 'web' && (
          <View style={styles.gaugeLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.legendText}>Ottimale (&gt;90%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.legendText}>Attenzione (75-90%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
              <Text style={styles.legendText}>Critico (&lt;75%)</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
  
  // PIE CHART
  if (type === 'pie') {
    const pieData = data.map((item, index) => ({
      name: item.name || '',
      population: item.count || item.value || 0,
      color: item.color || config.color(1 - index * 0.2),
      legendFontColor: '#333',
      legendFontSize: 12
    }));
    
    return (
      <View style={[styles.chartContainer, style]}>
        <PieChart
          data={pieData}
          width={chartWidth}
          height={height || 220}
          chartConfig={config}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          center={[10, 0]}
          hasLegend={true}
        />
      </View>
    );
  }
  
  // LINE CHART
  if (type === 'line') {
    // Verifica che i dati siano validi
    if (!data.labels || !data.datasets || !data.datasets[0] || !data.datasets[0].data) {
      return (
        <View style={[styles.noDataContainer, style]}>
          <Text style={styles.noDataText}>Dati non validi</Text>
        </View>
      );
    }
    
    // Filtra valori NaN
    const cleanData = {
      ...data,
      datasets: [{
        ...data.datasets[0],
        data: data.datasets[0].data.map(v => isNaN(v) ? 0 : v)
      }]
    };
    
    return (
      <View style={[styles.chartContainer, style]}>
        <LineChart
          data={cleanData}
          width={chartWidth}
          height={height || 220}
          chartConfig={config}
          bezier
          style={styles.chart}
          yAxisSuffix=""
          yAxisInterval={1}
          fromZero={true}
          segments={5}
          formatYLabel={(value) => Math.round(value).toString()}
          getDotColor={(dataPoint, dataPointIndex) => config.color(1)}
        />
      </View>
    );
  }
  
  // BAR CHART
  if (type === 'bar') {
    return (
      <View style={[styles.chartContainer, style]}>
        <BarChart
          data={data}
          width={chartWidth}
          height={height || 220}
          chartConfig={config}
          style={styles.chart}
          yAxisSuffix=""
          yAxisInterval={1}
          showValuesOnTopOfBars={true}
          fromZero={true}
        />
      </View>
    );
  }
  
  return null;
};

const styles = StyleSheet.create({
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  
  // Stili per gauge chart (web)
  gaugeContainer: {
    paddingHorizontal: 15,
    paddingVertical: 20,
  },
  gaugesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gaugeItem: {
    alignItems: 'center',
    flex: 1,
  },
  gaugeWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
    marginBottom: 8,
  },
  gaugeSvg: {
    position: 'absolute',
  },
  gaugeCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gaugeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  gaugeLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  
  // Stili per gauge chart (mobile)
  gaugesColumn: {
    paddingHorizontal: 10,
  },
  mobileGaugeItem: {
    marginBottom: 20,
  },
  mobileGaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mobileGaugeLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  mobileGaugeValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBackground: {
    flex: 1,
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 10,
    backgroundColor: '#2196F3',
  },
  
  // Legenda
  gaugeLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#666',
  },
});

export default ChartComponent;