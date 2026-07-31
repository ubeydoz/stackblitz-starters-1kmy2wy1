import { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, FlatList, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { supabase } from '../../../lib/supabase';

const TYPE_OPTIONS = [
  { key: null, label: 'Tümü' },
  { key: 'otel', label: '🏨 Otel' },
  { key: 'timar_bakim', label: '✂️ Tımar/Bakım' },
  { key: 'gezdirme', label: '🐕 Gezdirme' },
] as const;

const DISTANCE_OPTIONS = [5, 10, 25, 50, 100];

type BusinessListItem = {
  id: string;
  business_name: string;
  business_type: string;
  phone: string | null;
  address: string | null;
  distance_km: number;
  avg_rating: number;
  review_count: number;
  photoUrl: string | null;
};

export default function DiscoverBusinesses() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState<BusinessListItem[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [radius, setRadius] = useState(25);

  const loadBusinesses = useCallback(async () => {
    setLoading(true);
    setError('');

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('İşletmeleri yakınlığa göre sıralayabilmek için konum izni gerekiyor.');
      setLoading(false);
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});

    const { data, error: rpcError } = await supabase.rpc('get_businesses_nearby', {
      user_lat: loc.coords.latitude,
      user_lng: loc.coords.longitude,
      radius_km: radius,
      filter_type: filterType,
      search_query: search.trim() || null,
    });

    if (rpcError) {
      setError('İşletmeler yüklenemedi: ' + rpcError.message);
      setLoading(false);
      return;
    }

    const businesses = data || [];
    const ids = businesses.map((b: any) => b.id);

    let photoMap: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: photos } = await supabase
        .from('business_photos')
        .select('business_id, url')
        .in('business_id', ids)
        .eq('position', 0);
      (photos || []).forEach((p: any) => {
        photoMap[p.business_id] = p.url;
      });
    }

    setItems(businesses.map((b: any) => ({ ...b, photoUrl: photoMap[b.id] || null })));
    setLoading(false);
  }, [radius, filterType, search]);

  useFocusEffect(
    useCallback(() => {
      loadBusinesses();
    }, [loadBusinesses])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>İşletmeleri Keşfet 🔍</Text>

      <TextInput
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
        placeholder="İşletme adı ara..."
        onSubmitEditing={loadBusinesses}
        returnKeyType="search"
      />

      <View style={styles.chipRow}>
        {TYPE_OPTIONS.map(t => (
          <TouchableOpacity
            key={t.label}
            style={[styles.chip, filterType === t.key && styles.chipActive]}
            onPress={() => setFilterType(t.key)}
          >
            <Text style={[styles.chipText, filterType === t.key && styles.chipTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.chipRow}>
        {DISTANCE_OPTIONS.map(d => (
          <TouchableOpacity
            key={d}
            style={[styles.chip, radius === d && styles.chipActive]}
            onPress={() => setRadius(d)}
          >
            <Text style={[styles.chipText, radius === d && styles.chipTextActive]}>{d} km</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FB923C" />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadBusinesses}>
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Bu kriterlere uygun işletme bulunamadı.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: '/business/[id]', params: { id: item.id } })}
            >
              {item.photoUrl ? (
                <Image source={{ uri: item.photoUrl }} style={styles.cardPhoto} />
              ) : (
                <View style={[styles.cardPhoto, styles.cardPhotoEmpty]}>
                  <Text style={{ fontSize: 22 }}>📷</Text>
                </View>
              )}
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{item.business_name}</Text>
                <Text style={styles.cardMeta}>
                  {item.distance_km.toFixed(1)} km
                  {item.review_count > 0 ? ` · ⭐ ${item.avg_rating.toFixed(1)} (${item.review_count})` : ' · Henüz değerlendirme yok'}
                </Text>
                {item.address ? <Text style={styles.cardAddress}>{item.address}</Text> : null}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED', paddingTop: 60, paddingHorizontal: 20 },
  title: { fontSize: 22, fontWeight: '800', color: '#431407', marginBottom: 16 },
  searchInput: {
    backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#FED7AA',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#431407', marginBottom: 12,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#FED7AA', backgroundColor: 'white' },
  chipActive: { backgroundColor: '#FB923C', borderColor: '#FB923C' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#9A6B4B' },
  chipTextActive: { color: 'white' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 },
  errorText: { fontSize: 13, color: '#DC2626', textAlign: 'center', marginBottom: 12 },
  retryButton: { backgroundColor: '#FB923C', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24 },
  retryButtonText: { color: 'white', fontWeight: '800', fontSize: 13 },
  emptyText: { fontSize: 14, color: '#9A6B4B', textAlign: 'center' },
  list: { paddingBottom: 40 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, padding: 12, marginBottom: 10 },
  cardPhoto: { width: 64, height: 64, borderRadius: 12 },
  cardPhotoEmpty: { backgroundColor: '#FFEDD5', alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, marginLeft: 12 },
  cardName: { fontSize: 15, fontWeight: '800', color: '#431407' },
  cardMeta: { fontSize: 12, color: '#FB923C', fontWeight: '700', marginTop: 3 },
  cardAddress: { fontSize: 12, color: '#9A6B4B', marginTop: 3 },
});