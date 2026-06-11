import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {getAQIInfo} from '../services/airQualityService';

export default function AQIBadge({aqi, size = 'normal'}) {
  if (aqi == null) {
    return null;
  }
  const info = getAQIInfo(aqi);
  const isSmall = size === 'small';

  return (
    <View style={[styles.badge, {backgroundColor: info.bg, borderColor: info.color + '60'}, isSmall && styles.badgeSmall]}>
      <Text style={[styles.label, {color: info.color}, isSmall && styles.labelSmall]}>
        AQI
      </Text>
      <Text style={[styles.value, {color: info.color}, isSmall && styles.valueSmall]}>
        {Math.round(aqi)}
      </Text>
      <Text style={[styles.level, {color: info.color}, isSmall && styles.levelSmall]}>
        {info.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontSize: 9,
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
  },
  valueSmall: {
    fontSize: 13,
  },
  level: {
    fontSize: 12,
    fontWeight: '600',
  },
  levelSmall: {
    fontSize: 10,
  },
});
