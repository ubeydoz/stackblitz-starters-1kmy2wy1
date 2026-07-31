import { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';

const TYPE_LABELS: Record<string, string> = {
  otel: '🏨 Köpek Oteli',
  timar_bakim: '✂️ Tımar / Bakım',
  gezdirme: '🐕 Köpek Gezdirme',
};

type BusinessItem = {
  id: string;
  business_name: string;
  business_type: string;
  photoUrl: string | null;
  avgRating: number;
  reviewCount: number;
};

export default function ManageBusinesses() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);

  useEffect(() => {
    loadBusinesses();
  }, []);

  async function loadBusinesses() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      router.replace('/login');
      return;
    }

    const { data, error } = await supabase
      .from('business_profiles')
      .select('id, business_name, business_type, business_photos(url), business_reviews(rating)')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const items: BusinessItem[] = data.map((b: any) => {
        const ratings = (b.business_reviews || []).map((r: any) => r.rating);
        const avg = ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0;
        return {
          id: b.id,
          business_name: b.business_name,
          business_type: b.business_type,
          photoUrl: b.business_photos?.[0]?.url || null,
          avgRating: avg,
          reviewCount: ratings.length,
        };
      });
      setBusinesses(items);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FB923C" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>İşletmelerim 🏢</Text>
      <Text style={styles.subtitle}>Profillerini yönet, yorumlarını gör</Text>

      {businesses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Henüz bir işletme profilin yok.</Text>
        </View>
      ) : (
        businesses.map(b => (
          <TouchableOpacity
            key={b.id}
            style={styles.card}
            onPress={() => router.push({ pathname: '/business/[id]', params: { id: b.id } })}
          >
            {b.photoUrl ? (
              <Image source={{ uri: b.photoUrl }} style={styles.cardPhoto} />
            ) : (
              <View style={[styles.cardPhoto, styles.cardPhotoEmpty]}>
                <Text style={{ fontSize: 24 }}>📷</Text>
              </View>
            )}
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{b.business_name}</Text>
              <Text style={styles.cardType}>{TYPE_LABELS[b.business_type] || b.business_type}</Text>
              <Text style={styles.cardRating}>
                {b.reviewCount > 0
                  ? `⭐ ${b.avgRating.toFixed(1)} (${b.reviewCount} değerlendirme)`
                  : 'Henüz değerlendirme yok'}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))
      )}

      <TouchableOpacity style={styles.addButton} onPress={() => router.push('/business/create')}>
        <Text style={styles.addButtonText}>+ Yeni İşletme Ekle</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 60, backgroundColor: '#FFF7ED', flexGrow: 1 },
  centerContainer: { flex: 1, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#431407' },
  subtitle: { fontSize: 14, color: '#9A6B4B', marginTop: 4, marginBottom: 20 },
  emptyState: { backgroundColor: 'white', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16 },
  emptyText: { fontSize: 14, color: '#9A6B4B' },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    borderRadius: 16, padding: 12, marginBottom: 10,
  },
  cardPhoto: { width: 60, height: 60, borderRadius: 12 },
  cardPhotoEmpty: { backgroundColor: '#FFEDD5', alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, marginLeft: 12 },
  cardName: { fontSize: 15, fontWeight: '800', color: '#431407' },
  cardType: { fontSize: 12, color: '#9A6B4B', marginTop: 2 },
  cardRating: { fontSize: 12, color: '#FB923C', fontWeight: '700', marginTop: 4 },
  chevron: { fontSize: 24, color: '#FED7AA' },
  addButton: {
    backgroundColor: '#FB923C', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  addButtonText: { color: 'white', fontWeight: '800', fontSize: 14 },
});