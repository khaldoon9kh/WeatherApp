import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {loadPrefs, savePrefs} from '../storage/prefsStorage';

export default function SettingsScreen() {
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPrefs().then(setPrefs);
  }, []);

  const update = useCallback(async (key, value) => {
    const updated = {...prefs, [key]: value};
    setPrefs(updated);
    setSaving(true);
    await savePrefs(updated);
    setSaving(false);
  }, [prefs]);

  if (!prefs) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#38BDF8" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>Settings</Text>
        {saving && <ActivityIndicator size="small" color="#38BDF8" />}
      </View>

      {/* Temperature Unit */}
      <SettingsSection title="Units">
        <SettingsRow label="Temperature" icon="thermometer">
          <SegmentControl
            options={[
              {label: '°C', value: 'C'},
              {label: '°F', value: 'F'},
            ]}
            value={prefs.tempUnit}
            onChange={v => update('tempUnit', v)}
          />
        </SettingsRow>
      </SettingsSection>

      {/* Widget */}
      <SettingsSection title="Widget">
        <SettingsRow label="Display" icon="widgets">
          <SegmentControl
            options={[
              {label: 'Temp', value: 'temp_only'},
              {label: 'Temp + Cond.', value: 'temp_condition'},
              {label: 'Temp + AQI', value: 'temp_condition_aqi'},
            ]}
            value={prefs.widgetDisplay}
            onChange={v => update('widgetDisplay', v)}
            vertical
          />
        </SettingsRow>
        <SettingsRow label="Theme" icon="palette">
          <SegmentControl
            options={[
              {label: 'Dark', value: 'dark'},
              {label: 'Light', value: 'light'},
              {label: 'Clear', value: 'transparent'},
            ]}
            value={prefs.widgetTheme}
            onChange={v => update('widgetTheme', v)}
          />
        </SettingsRow>
      </SettingsSection>

      {/* Location */}
      <SettingsSection title="Location">
        <SettingsRow label="Precision" icon="crosshairs-gps">
          <SegmentControl
            options={[
              {label: 'Exact', value: 'exact'},
              {label: 'Private (~1 km)', value: 'privacy'},
            ]}
            value={prefs.locationPrecision}
            onChange={v => update('locationPrecision', v)}
          />
        </SettingsRow>
      </SettingsSection>

      {/* Update Frequency */}
      <SettingsSection title="Background Updates">
        <SettingsRow label="Frequency" icon="clock-outline">
          <SegmentControl
            options={[
              {label: '30 min', value: 30},
              {label: '1 hr', value: 60},
              {label: '3 hrs', value: 180},
            ]}
            value={prefs.updateFrequency}
            onChange={v => update('updateFrequency', v)}
          />
        </SettingsRow>
      </SettingsSection>

      {/* Allergy Alerts */}
      <SettingsSection title="Notifications">
        <SettingsRow label="Allergy Alerts" icon="bell-alert" description="Notify when pollen is High or Very High">
          <Switch
            value={prefs.allergyAlertsEnabled}
            onValueChange={v => update('allergyAlertsEnabled', v)}
            trackColor={{false: '#334155', true: 'rgba(56,189,248,0.4)'}}
            thumbColor={prefs.allergyAlertsEnabled ? '#38BDF8' : '#64748B'}
          />
        </SettingsRow>
      </SettingsSection>

      {/* About */}
      <View style={styles.about}>
        <Text style={styles.aboutText}>
          Weather data from{' '}
          <Text style={styles.link}>Open-Meteo</Text>
          {' '}· No API key required
        </Text>
        <Text style={styles.version}>WeatherApp v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

function SettingsSection({title, children}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function SettingsRow({label, icon, description, children}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Icon name={icon} size={18} color="#38BDF8" style={styles.rowIcon} />
        <View>
          <Text style={styles.rowLabel}>{label}</Text>
          {description && <Text style={styles.rowDesc}>{description}</Text>}
        </View>
      </View>
      <View style={styles.rowRight}>{children}</View>
    </View>
  );
}

function SegmentControl({options, value, onChange, vertical = false}) {
  return (
    <View style={[styles.segment, vertical && styles.segmentVertical]}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={String(opt.value)}
            style={[styles.segmentItem, active && styles.segmentItemActive]}
            onPress={() => onChange(opt.value)}>
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F1F5F9',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38BDF8',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionBody: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  rowIcon: {
    marginTop: 1,
  },
  rowLabel: {
    fontSize: 15,
    color: '#F1F5F9',
    fontWeight: '500',
  },
  rowDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    maxWidth: 180,
  },
  rowRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  segmentVertical: {
    flexDirection: 'column',
    minWidth: 140,
  },
  segmentItem: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  segmentItemActive: {
    backgroundColor: '#38BDF8',
  },
  segmentText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },
  segmentTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  about: {
    marginHorizontal: 20,
    marginTop: 8,
    alignItems: 'center',
    gap: 4,
  },
  aboutText: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
  },
  link: {
    color: '#38BDF8',
  },
  version: {
    fontSize: 12,
    color: '#334155',
    marginTop: 4,
  },
});
