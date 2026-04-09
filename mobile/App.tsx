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
import AsyncStorage from '@react-native-async-storage/async-storage';

// Toronto default center
const TORONTO_LAT = 43.6532;
const TORONTO_LNG = -79.3832;

// CKAN API for Toronto tennis courts
const CKAN_URL = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/datastore_search?resource_id=1148d254-f942-4018-b730-342ed5727c2b&limit=100';

// Generate mock weekly schedule: some slots busy per day
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
function mockSchedule(): Record<string, string[]> {
  const s: Record<string, string[]> = {};
  for (const d of DAYS) {
    // Random 2-5 busy slots per day
    const busy = [...TIMES].sort(() => Math.random() - 0.5).slice(0, Math.floor(Math.random() * 4) + 2);
    s[d] = busy;
  }
  return s;
}

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
  schedule: Record<string, string[]>; // day → busy times, e.g. { Mon: ["09:00", "14:00"] }
};

export default function CourtDiscoveryScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [expandAnims] = useState<Record<string, Animated.Value>>({});
  // Main tab: Discover | My
  const [mainTab, setMainTab] = useState<'discover' | 'my'>('discover');
  // My sub-tab: Favorites | Bookings
  const [mySubTab, setMySubTab] = useState<'favorites' | 'bookings'>('favorites');
  // Favorites: array of court IDs
  const [favorites, setFavorites] = useState<string[]>([]);
  // Bookings: {courtId, day, time}
  const [bookings, setBookings] = useState<{ courtId: string; day: string; time: string }[]>([]);
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
            schedule: mockSchedule(),
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

  // Load favorites and bookings from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const fav = await AsyncStorage.getItem('favorites');
        if (fav) setFavorites(JSON.parse(fav));
        const bk = await AsyncStorage.getItem('bookings');
        if (bk) setBookings(JSON.parse(bk));
      } catch {}
    })();
  }, []);

  const toggleFavorite = async (courtId: string) => {
    const next = favorites.includes(courtId)
      ? favorites.filter(id => id !== courtId)
      : [...favorites, courtId];
    setFavorites(next);
    await AsyncStorage.setItem('favorites', JSON.stringify(next));
  };

  const addBooking = async (courtId: string, day: string, time: string) => {
    const next = [...bookings, { courtId, day, time }];
    setBookings(next);
    await AsyncStorage.setItem('bookings', JSON.stringify(next));
  };

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
          schedule: mockSchedule(),
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
          <TouchableOpacity onPress={() => toggleFavorite(court.id)} style={{ marginLeft: 8 }}>
            <Text style={{ fontSize: 20 }}>{favorites.includes(court.id) ? '❤️' : '♡'}</Text>
          </TouchableOpacity>
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

          <Text style={styles.detailLabel}>Availability (🟢 free / 🔴 busy)</Text>
          <View style={styles.availabilityGrid}>
            {DAYS.map((day) => (
              <View key={day} style={styles.availRow}>
                <Text style={styles.availDay}>{day}</Text>
                <View style={styles.availSlots}>
                  {TIMES.slice(0, 6).map((t) => {
                    const busy = court.schedule[day]?.includes(t);
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[styles.slotChip, busy ? styles.slotBusy : styles.slotFree]}
                        onPress={() => !busy && addBooking(court.id, day, t)}
                        activeOpacity={0.6}
                      >
                        <Text style={styles.slotText}>{busy ? '🔴' : '🟢'}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

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
        <View style={styles.mainTabRow}>
          <TouchableOpacity style={[styles.mainTab, mainTab === 'discover' && styles.mainTabActive]} onPress={() => setMainTab('discover')}>
            <Text style={[styles.mainTabText, mainTab === 'discover' && styles.mainTabTextActive]}>Discover</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.mainTab, mainTab === 'my' && styles.mainTabActive]} onPress={() => setMainTab('my')}>
            <Text style={[styles.mainTabText, mainTab === 'my' && styles.mainTabTextActive]}>My</Text>
          </TouchableOpacity>
        </View>
        {mainTab === 'my' && (
          <View style={styles.mySubTabRow}>
            <TouchableOpacity style={[styles.mySubTab, mySubTab === 'favorites' && styles.mySubTabActive]} onPress={() => setMySubTab('favorites')}>
              <Text style={[styles.mySubTabText, mySubTab === 'favorites' && styles.mySubTabTextActive]}>Favorites</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.mySubTab, mySubTab === 'bookings' && styles.mySubTabActive]} onPress={() => setMySubTab('bookings')}>
              <Text style={[styles.mySubTabText, mySubTab === 'bookings' && styles.mySubTabTextActive]}>Bookings</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Discover content */}
      {mainTab === 'discover' && (
        <>
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
      </>)}
      {/* My tab content */}
      {mainTab === 'my' && (
        <View style={{ flex: 1, padding: 16 }}>
          {mySubTab === 'favorites' ? (
            favorites.length === 0 ? (
              <View style={styles.center}>
                <Text style={styles.infoText}>No favorites yet. Tap ❤️ on a court.</Text>
              </View>
            ) : (
              <ScrollView>
                {courts.filter(c => favorites.includes(c.id)).map(renderCard)}
              </ScrollView>
            )
          ) : (
            bookings.length === 0 ? (
              <View style={styles.center}>
                <Text style={styles.infoText}>No bookings yet.</Text>
              </View>
            ) : (
              <ScrollView>
                {bookings.map((b, i) => {
                  const court = courts.find(c => c.id === b.courtId);
                  return (
                    <View key={i} style={styles.card}>
                      <Text style={styles.courtName}>{court?.name || 'Unknown'}</Text>
                      <Text style={styles.detailValue}>{b.day} • {b.time}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            )
          )}
        </View>
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
  mainTabRow: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    padding: 2,
    marginBottom: 8,
  },
  mainTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  mainTabActive: {
    backgroundColor: '#FFF',
  },
  mainTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
  },
  mainTabTextActive: {
    color: '#007AFF',
  },
  mySubTabRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  mySubTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: '#E5E5EA',
  },
  mySubTabActive: {
    backgroundColor: '#007AFF',
  },
  mySubTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  mySubTabTextActive: {
    color: '#FFF',
  },
  availabilityGrid: {
    marginTop: 8,
  },
  availRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  availDay: {
    width: 36,
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  availSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  slotChip: {
    width: 32,
    height: 28,
    borderRadius: 6,
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotFree: {
    backgroundColor: '#E0F7E9',
  },
  slotBusy: {
    backgroundColor: '#FFE5E5',
  },
  slotText: {
    fontSize: 14,
  },
});
