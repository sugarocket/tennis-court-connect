import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Animated,
  TextInput,
  Linking,
  RefreshControl,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

// Toronto default center
const TORONTO_LAT = 43.6532;
const TORONTO_LNG = -79.3832;

// CKAN API for Toronto tennis courts
const CKAN_URL = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/datastore_search?resource_id=1148d254-f942-4018-b730-342ed5727c2b&limit=100';

type ViewMode = 'map' | 'list';
type Court = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type?: string;
  lights?: string;
  courts?: number;
  winterPlay?: string;
  phone?: string;
  website?: string;
  availability: string[];
};

export default function CourtDiscoveryScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [expandAnims] = useState<Record<string, Animated.Value>>({});
  // Phase 2 filters
  const [filterType, setFilterType] = useState<'all' | 'Public' | 'Club'>('all');
  const [lightsOnly, setLightsOnly] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [sortMode, setSortMode] = useState<'name' | 'distance'>('name');
  const [refreshing, setRefreshing] = useState(false);

  const toggleExpand = (id: string) => {
    const isExpanding = expandedId !== id;
    setExpandedId(isExpanding ? id : null);

    if (!expandAnims[id]) {
      expandAnims[id] = new Animated.Value(isExpanding ? 0 : 1);
    }
    Animated.timing(expandAnims[id], {
      toValue: isExpanding ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  // Fetch real Toronto courts from CKAN API, with GPS location
  useEffect(() => {
    async function init() {
      try {
        // 1. Request location permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({});
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        } else {
          setUserLocation({ lat: TORONTO_LAT, lng: TORONTO_LNG });
        }

        // 2. Fetch courts from CKAN API
        const res = await fetch(CKAN_URL);
        const json = await res.json();
        if (!json.result || !json.result.records) {
          throw new Error('Invalid API response');
        }

        const records = json.result.records;
        const mapped: Court[] = records.map((r: any, i: number) => {
          // geometry can be { coordinates: [lng, lat] } or x/y fields
          let lat = TORONTO_LAT;
          let lng = TORONTO_LNG;
          if (r.geometry && r.geometry.coordinates) {
            lng = r.geometry.coordinates[0];
            lat = r.geometry.coordinates[1];
          } else if (r.x && r.y) {
            lng = r.x;
            lat = r.y;
          }

          return {
            id: r._id ? String(r._id) : String(i),
            name: r.Name || 'Unknown Court',
            address: r.LocationAddress || r.ClubInfo || 'Address unavailable',
            lat,
            lng,
            type: r.Type,
            lights: r.Lights,
            courts: r.Courts,
            winterPlay: r.WinterPlay,
            phone: r.Phone,
            website: r.ClubWebsite,
            availability: ['Contact club for times'],
          };
        });

        setCourts(mapped);
        setLoading(false);
      } catch (e: any) {
        setError(e.message || 'Failed to load courts');
        setLoading(false);
        // Fallback: empty list (user sees error state)
      }
    }
    init();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(CKAN_URL);
      const json = await res.json();
      const records = json.result?.records || [];
      const mapped: Court[] = records.map((r: any, i: number) => {
        let lat = TORONTO_LAT;
        let lng = TORONTO_LNG;
        if (r.geometry?.coordinates) {
          lng = r.geometry.coordinates[0];
          lat = r.geometry.coordinates[1];
        } else if (r.x && r.y) {
          lng = r.x;
          lat = r.y;
        }
        return {
          id: r._id ? String(r._id) : String(i),
          name: r.Name || 'Unknown Court',
          address: r.LocationAddress || r.ClubInfo || 'Address unavailable',
          lat,
          lng,
          type: r.Type,
          lights: r.Lights,
          courts: r.Courts,
          winterPlay: r.WinterPlay,
          phone: r.Phone,
          website: r.ClubWebsite,
          availability: ['Contact club for times'],
        };
      });
      setCourts(mapped);
    } catch {}
    setRefreshing(false);
  };

  // Apply Phase 2 filters and sort
  const filteredCourts = courts
    .filter((c) => {
      if (filterType !== 'all' && c.type !== filterType) return false;
      if (lightsOnly && c.lights !== 'Y') return false;
      const q = searchText.toLowerCase();
      if (q && !(c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q))) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortMode === 'name') return a.name.localeCompare(b.name);
      if (sortMode === 'distance' && userLocation) {
        const da = Math.hypot(a.lat - userLocation.lat, a.lng - userLocation.lng);
        const db = Math.hypot(b.lat - userLocation.lat, b.lng - userLocation.lng);
        return da - db;
      }
      return 0;
    });

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
          {userLocation && (
            <View style={[styles.statusBadge, { backgroundColor: '#34C75922' }]}>
              <Text style={[styles.statusText, { color: '#34C759' }]}>
                {Math.round(Math.hypot(court.lat - userLocation.lat, court.lng - userLocation.lng) * 111)}km
              </Text>
            </View>
          )}
          {court.type && (
            <View style={[styles.statusBadge, { backgroundColor: '#007AFF22' }]}>
              <Text style={[styles.statusText, { color: '#007AFF' }]}>
                {court.type}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.addressPreview}>{court.address}</Text>

        <Animated.View
          style={[
            styles.details,
            {
              opacity: anim ?? new Animated.Value(0),
              maxHeight: (anim ?? new Animated.Value(0)).interpolate({
                inputRange: [0, 1],
                outputRange: [0, 200],
              }),
            },
          ]}
        >
          <Text style={styles.detailLabel}>Address</Text>
          <Text style={styles.detailValue}>{court.address}</Text>

          {court.courts && (
            <Text style={styles.detailValue}>🎾 {court.courts} court{court.courts > 1 ? 's' : ''}</Text>
          )}
          {court.lights && (
            <Text style={styles.detailValue}>{court.lights === 'Y' ? '🟢 Lit' : '⚪ Unlit'}</Text>
          )}
          {court.winterPlay === 'Y' && (
            <Text style={styles.detailValue}>❄️ Winter play available</Text>
          )}
          {court.phone && (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${court.phone}`)}>
              <Text style={[styles.detailValue, styles.linkText]}>☎️ {court.phone}</Text>
            </TouchableOpacity>
          )}
          {court.website && (
            <TouchableOpacity onPress={() => Linking.openURL(court.website!)}>
              <Text style={[styles.detailValue, styles.linkText]}>🔗 Club website</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.mapLinkButton}
            activeOpacity={0.7}
            onPress={() => {
              const url = `maps://maps.apple.com/?ll=${court.lat},${court.lng}`;
              Linking.openURL(url).catch(() =>
                Linking.openURL(`https://maps.google.com/?q=${court.lat},${court.lng}`)
              );
            }}
          >
            <Text style={styles.mapLinkButtonText}>Open in Maps</Text>
          </TouchableOpacity>

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

      {/* Phase 2 Filters */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[styles.filterChipText, filterType === 'all' && styles.filterChipTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterType === 'Public' && styles.filterChipActive]}
          onPress={() => setFilterType('Public')}
        >
          <Text style={[styles.filterChipText, filterType === 'Public' && styles.filterChipTextActive]}>Public</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterType === 'Club' && styles.filterChipActive]}
          onPress={() => setFilterType('Club')}
        >
          <Text style={[styles.filterChipText, filterType === 'Club' && styles.filterChipTextActive]}>Club</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, lightsOnly && styles.filterChipActive]}
          onPress={() => setLightsOnly(!lightsOnly)}
        >
          <Text style={[styles.filterChipText, lightsOnly && styles.filterChipTextActive]}>💡 Lit</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search name or address..."
          value={searchText}
          onChangeText={setSearchText}
          clearButtonMode="while-editing"
        />
        <TouchableOpacity style={styles.sortBtn} onPress={() => setSortMode(sortMode === 'name' ? 'distance' : 'name')}>
          <Text style={styles.sortBtnText}>{sortMode === 'name' ? '↕ Name' : '↕ Dist'}</Text>
        </TouchableOpacity>
      </View>

      {/* Loading / Error */}
      {loading && (
        <View style={styles.center}>
          <Text style={styles.infoText}>Loading Toronto courts…</Text>
        </View>
      )}
      {error && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Content */}
      {!loading && !error && (
        viewMode === 'list' ? (
          filteredCourts.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.infoText}>No courts match your filters.</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.listContainer}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
              {filteredCourts.map(renderCard)}
            </ScrollView>
          )
        ) : (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: userLocation ? userLocation.lat : TORONTO_LAT,
              longitude: userLocation ? userLocation.lng : TORONTO_LNG,
              latitudeDelta: 0.08,
              longitudeDelta: 0.08,
            }}
          >
            {filteredCourts.map((court) => (
              <Marker
                key={court.id}
                coordinate={{ latitude: court.lat, longitude: court.lng }}
                title={court.name}
                description={court.type ? `${court.type} • ${court.courts || ''} courts` : undefined}
              />
            ))}
          </MapView>
        )
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  infoText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    backgroundColor: '#E5E5EA',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginRight: 8,
  },
  sortBtn: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  sortBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  linkText: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  mapLinkButton: {
    marginTop: 12,
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  mapLinkButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
