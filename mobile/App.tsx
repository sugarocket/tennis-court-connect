import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';

// Mock court data (minimal, per request)
const MOCK_COURTS = [
  {
    id: '1',
    name: 'Downtown Tennis Club',
    address: '123 Main Street, Downtown',
    lat: 37.78825,
    lng: -122.4324,
    status: 'OPEN',
    availability: ['9:00 AM', '10:30 AM', '2:00 PM'],
  },
  {
    id: '2',
    name: 'Riverside Public Courts',
    address: '456 River Road, Riverside',
    lat: 37.7749,
    lng: -122.4194,
    status: 'BUSY',
    availability: ['4:00 PM', '5:30 PM'],
  },
  {
    id: '3',
    name: 'Oakwood Tennis Center',
    address: '789 Oak Avenue, Oakwood',
    lat: 37.795,
    lng: -122.41,
    status: 'OPEN',
    availability: ['8:00 AM', '11:00 AM', '3:00 PM', '6:00 PM'],
  },
];

type ViewMode = 'map' | 'list';
type Court = (typeof MOCK_COURTS)[0];

export default function CourtDiscoveryScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandAnims] = useState(() =>
    MOCK_COURTS.reduce((acc, court) => {
      acc[court.id] = new Animated.Value(0);
      return acc;
    }, {} as Record<string, Animated.Value>)
  );

  const toggleExpand = (id: string) => {
    const isExpanding = expandedId !== id;
    setExpandedId(isExpanding ? id : null);

    Animated.timing(expandAnims[id], {
      toValue: isExpanding ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const statusColor = (status: string) => {
    if (status === 'OPEN') return '#34C759';
    if (status === 'BUSY') return '#FF9500';
    return '#8E8E93';
  };

  const renderCard = (court: Court) => {
    const isExpanded = expandedId === court.id;
    const anim = expandAnims[court.id];

    return (
      <TouchableOpacity
        key={court.id}
        activeOpacity={0.8}
        onPress={() => toggleExpand(court.id)}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.courtName}>{court.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor(court.status) + '22' }]}>
            <Text style={[styles.statusText, { color: statusColor(court.status) }]}>
              {court.status}
            </Text>
          </View>
        </View>

        <Text style={styles.addressPreview}>{court.address}</Text>

        <Animated.View
          style={[
            styles.details,
            {
              opacity: anim,
              maxHeight: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 200],
              }),
            },
          ]}
        >
          <Text style={styles.detailLabel}>Address</Text>
          <Text style={styles.detailValue}>{court.address}</Text>

          <Text style={styles.detailLabel}>Available Times</Text>
          <View style={styles.timeRow}>
            {court.availability.map((t, i) => (
              <View key={i} style={styles.timeChip}>
                <Text style={styles.timeText}>{t}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.bookButton} activeOpacity={0.7}>
            <Text style={styles.bookButtonText}>Book Now</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Court Discovery</Text>
      </View>

      {/* Toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'list' && styles.toggleActive]}
          onPress={() => setViewMode('list')}
          activeOpacity={0.7}
        >
          <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
            List
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'map' && styles.toggleActive]}
          onPress={() => setViewMode('map')}
          activeOpacity={0.7}
        >
          <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>
            Map
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {viewMode === 'list' ? (
        <ScrollView contentContainerStyle={styles.listContainer}>
          {MOCK_COURTS.map(renderCard)}
        </ScrollView>
      ) : (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: 37.78825,
            longitude: -122.4324,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {MOCK_COURTS.map((court) => (
            <Marker
              key={court.id}
              coordinate={{ latitude: court.lat, longitude: court.lng }}
              title={court.name}
              description={court.status}
            />
          ))}
        </MapView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F7', // iOS system background
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#F2F2F7',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.5,
  },
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    padding: 2,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
  },
  toggleTextActive: {
    color: '#007AFF',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  courtName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
    flex: 1,
    paddingRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  addressPreview: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  details: {
    marginTop: 8,
    overflow: 'hidden',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 10,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: '#000',
  },
  timeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  timeChip: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#000',
  },
  bookButton: {
    marginTop: 12,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  map: {
    flex: 1,
  },
});
