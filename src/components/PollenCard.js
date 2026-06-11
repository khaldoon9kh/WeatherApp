import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {getPollenInfo} from '../services/airQualityService';

const POLLEN_ICONS = {
  grass: 'grass',
  tree: 'tree',
  weed: 'flower-pollen',
};

export default function PollenCard({type, value, label}) {
  const info = getPollenInfo(value);
  const iconName = POLLEN_ICONS[type] || 'flower-pollen-outline';
  const displayValue = value != null ? Math.round(value) : '—';

  return (
    <View style={[styles.card, {backgroundColor: info.bg, borderColor: info.color + '50'}]}>
      <Icon name={iconName} size={22} color={info.color} style={styles.icon} />
      <Text style={styles.typeLabel}>{label}</Text>
      <Text style={[styles.level, {color: info.color}]}>{info.label}</Text>
      <Text style={[styles.value, {color: info.color + 'CC'}]}>{displayValue}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  icon: {
    marginBottom: 2,
  },
  typeLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  level: {
    fontSize: 13,
    fontWeight: '700',
  },
  value: {
    fontSize: 11,
    fontWeight: '500',
  },
});
