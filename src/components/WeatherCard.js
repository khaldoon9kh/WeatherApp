import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function WeatherCard({icon, label, value, unit, color = '#38BDF8'}) {
  return (
    <View style={styles.card}>
      <Icon name={icon} size={22} color={color} />
      <Text style={styles.value}>
        {value}<Text style={styles.unit}>{unit}</Text>
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minWidth: 62,
    gap: 3,
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  unit: {
    fontSize: 11,
    fontWeight: '400',
    color: '#94A3B8',
  },
  label: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
});
