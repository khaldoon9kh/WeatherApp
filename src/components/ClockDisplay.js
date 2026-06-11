import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet} from 'react-native';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export default function ClockDisplay() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const dayName = DAYS[now.getDay()];
  const dateStr = `${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

  return (
    <View style={styles.container}>
      <Text style={styles.time}>
        {hours}<Text style={styles.colon}>:</Text>{minutes}
      </Text>
      <Text style={styles.day}>{dayName}</Text>
      <Text style={styles.date}>{dateStr}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  time: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1,
    includeFontPadding: false,
  },
  colon: {
    opacity: 0.7,
  },
  day: {
    fontSize: 16,
    fontWeight: '600',
    color: '#38BDF8',
    marginTop: 2,
  },
  date: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
});
