import { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Building2, Scissors, Dog, Stethoscope, ImageOff, Star, ChevronRight, Plus, LucideIcon } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';

const MOSS = '#6B8F71';

const TYPE_LABELS: Record<string, { label: string; Icon: LucideIcon }> = {
  otel: { label: 'Köpek Oteli', Icon: Building2 },
  timar_bakim: { label: 'Pet Kuaför', Icon: Scissors },
  gezdirme: { label: 'Köpek Gezdirme', Icon: Dog },
  veteriner: { label: 'Veteriner Kliniği', Icon: Stethoscope },
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
      <View style={styles.titleRow}>
        <Building2 size={22} color="#431407" />
        <Text style={styles.title}>İşletmelerim</Text>
      </View>
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
                <ImageOff size={22} color="#FB923C" />
              </View>
            )}
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{b.business_name}</Text>
              <View style={styles.cardTypeRow}>
                {TYPE_LABELS[b.business_type] ? (
                  <>
                    {(() => { const TypeIcon = TYPE_LABELS[b.business_type].Icon; return <TypeIcon size={11} color="#9A6B4B" />; })()}
                    <Text style={styles.cardType}>{TYPE_LABELS[b.business_type].label}</Text>
                  </>
                ) : (
                  <Text style={styles.cardType}>{b.business_type}</Text>
                )}
              </View>
              {b.reviewCount > 0 ? (
                <View style={styles.cardRatingRow}>
                  <Star size={11} color={MOSS} fill={MOSS} />
                  <Text style={styles.cardRatingMoss}>{b.avgRating.toFixed(1)} ({b.reviewCount} değerlendirme)</Text>
                </View>
              ) : (
                <Text style={styles.cardRating}>Henüz değerlendirme yok</Text>
              )}
            </View>
            <ChevronRight size={22} color="#FED7AA" />
          </TouchableOpacity>
        ))
      )}

      <TouchableOpacity style={[styles.addButton, styles.addButtonRow]} onPress={() => router.push('/business/create')}>
        <Plus size={16} color="white" strokeWidth={3} />
        <Text style={styles.addButtonText}>Yeni İşletme Ekle</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 60, backgroundColor: '#FFF7ED', flexGrow: 1 },
  centerContainer: { flex: 1, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#431407', fontFamily: 'Fredoka_700Bold' },
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
  cardTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cardType: { fontSize: 12, color: '#9A6B4B' },
  cardRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  cardRating: { fontSize: 12, color: '#9A6B4B', fontWeight: '700', marginTop: 4 },
  cardRatingMoss: { fontSize: 12, color: MOSS, fontWeight: '700' },
  addButton: {
    backgroundColor: '#FB923C', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  addButtonRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  addButtonText: { color: 'white', fontWeight: '800', fontSize: 14 },
});