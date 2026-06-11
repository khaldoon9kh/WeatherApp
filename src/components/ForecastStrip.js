import React from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {getWeatherInfo, convertTemp} from '../services/weatherService';

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ForecastStrip({forecast, unit = 'C'}) {
  if (!forecast || forecast.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}>
      {forecast.map((day, index) => {
        const date = new Date(day.date + 'T00:00:00');
        const dayLabel = index === 0 ? 'Today' : SHORT_DAYS[date.getDay()];
        const info = getWeatherInfo(day.weatherCode);

        return (
          <View key={day.date} style={[styles.dayCard, index === 0 && styles.todayCard]}>
            <Text style={[styles.dayLabel, index === 0 && styles.todayLabel]}>{dayLabel}</Text>
            <Icon
              name={info.icon}
              size={26}
              color={index === 0 ? '#38BDF8' : '#94A3B8'}
              style={styles.icon}
            />
            <Text style={styles.high}>{convertTemp(day.tempMax, unit)}°</Text>
            <Text style={styles.low}>{convertTemp(day.tempMin, unit)}°</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: {
    paddingHorizontal: 4,
    gap: 8,
  },
  dayCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    minWidth: 68,
    gap: 4,
  },
  todayCard: {
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderColor: 'rgba(56,189,248,0.3)',
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  todayLabel: {
    color: '#38BDF8',
  },
  icon: {
    marginVertical: 4,
  },
  high: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  low: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
});
