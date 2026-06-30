import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';

type DogCard = {
  id: string;
  name: string;
  breed: string;
  age: number;
  gender: string;
  photos: { url: string }[];
};

const BREEDS = ['Golden Retriever', 'Labrador', 'Husky', 'Corgi', 'Poodle', 'Bulldog', 'Pomeranian', 'Diğer'];

export default function Home() {
  const router = useRouter();
  const [myDogId, setMyDogId] = useState<string | null>(null);
  const [cards, setCards] = useState<DogCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [matchInfo, setMatchInfo] = useState<DogCard | null>(null);

  const [filterVisible, setFilterVisible] = useState(false);
  const [filterBreed, setFilterBreed] = useState<string | null>(null);
  const [filterGender, setFilterGender] = useState<'male' | 'female' | null>(null);
  const [filterMinAge, setFilterMinAge] = useState(0);
  const [filterMaxAge, setFilterMaxAge] = useState(20);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      router.replace('/login');
      return;
    }

    const { data: myDogs, error: myDogError } = await supabase
      .from('dogs')
      .select('id')
      .eq('owner_id', userId)
      .limit(1);

    if (myDogError || !myDogs || myDogs.length === 0) {
      setError('Önce bir köpek profili oluşturmalısınız.');
      setLoading(false);
      return;
    }

    const dogId = myDogs[0].id;
    setMyDogId(dogId);

    const { data: swiped } = await supabase
      .from('swipes')
      .select('target_dog_id')
      .eq('swiper_dog_id', dogId);

    const swipedIds = (swiped || []).map(s => s.target_dog_id);

    let query = supabase
      .from('dogs')
      .select('id, name, breed, age, gender, dog_photos(url)')
      .eq('is_active', true)
      .neq('id', dogId)
      .gte('age', filterMinAge)
      .lte('age', filterMaxAge);

    if (filterBreed) {
      query = query.eq('breed', filterBreed);
    }
    if (filterGender) {
      query = query.eq('gender', filterGender);
    }

    const { data: otherDogs, error: dogsError } = await query;

    if (dogsError) {
      setError('Köpekler yüklenemedi: ' + dogsError.message);
      setLoading(false);
      return;
    }

    const filtered = (otherDogs || [])
      .filter(d => !swipedIds.includes(d.id))
      .map(d => ({
        id: d.id,
        name: d.name,
        breed: d.breed,
        age: d.age,
        gender: d.gender,
        photos: (d as any).dog_photos || [],
      }));

    setCards(filtered);
    setCurrentIndex(0);
    setLoading(false);
  }, [router, filterBreed, filterGender, filterMinAge, filterMaxAge]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSwipe(action: 'like' | 'dislike') {
    if (!myDogId || currentIndex >= cards.length) return;

    const targetDog = cards[currentIndex];

    const { error: swipeError } = await supabase.from('swipes').insert({
      swiper_dog_id: myDogId,
      target_dog_id: targetDog.id,
      action,
    });

    if (swipeError) {
      setError('Bir hata oluştu: ' + swipeError.message);
      return;
    }

    if (action === 'like') {
      const { data: matchData } = await supabase
        .from('matches')
        .select('id')
        .or(`dog_a_id.eq.${targetDog.id},dog_b_id.eq.${targetDog.id}`)
        .or(`dog_a_id.eq.${myDogId},dog_b_id.eq.${myDogId}`);

      if (matchData && matchData.length > 0) {
        setMatchInfo(targetDog);
        return;
      }
    }

    setCurrentIndex(prev => prev + 1);
  }

  function closeMatch() {
    setMatchInfo(null);
    setCurrentIndex(prev => prev + 1);
  }

  function clearFilters() {
    setFilterBreed(null);
    setFilterGender(null);
    setFilterMinAge(0);
    setFilterMaxAge(20);
    setFilterVisible(false);
  }

  function applyFilters() {
    setFilterVisible(false);
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FB923C" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (matchInfo) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.matchEmoji}>🎉</Text>
        <Text style={styles.matchTitle}>Eşleştiniz!</Text>
        <Text style={styles.matchSubtitle}>{matchInfo.name} ile artık mesajlaşabilirsiniz</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/matches')}>
          <Text style={styles.buttonText}>Mesajlaş</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={closeMatch} style={{ marginTop: 12 }}>
          <Text style={{ color: '#9A6B4B', fontWeight: '700' }}>Devam Et</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderFilterModal = () => (
    <Modal visible={filterVisible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Filtrele</Text>

          <ScrollView>
            <Text style={styles.filterLabel}>IRK</Text>
            <View style={styles.chipRow}>
              {BREEDS.map(b => (
                <TouchableOpacity
                  key={b}
                  style={[styles.chip, filterBreed === b && styles.chipActive]}
                  onPress={() => setFilterBreed(filterBreed === b ? null : b)}
                >
                  <Text style={[styles.chipText, filterBreed === b && styles.chipTextActive]}>{b}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>CİNSİYET</Text>
            <View style={styles.chipRow}>
              {(['female', 'male'] as const).map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.chip, filterGender === g && styles.chipActive]}
                  onPress={() => setFilterGender(filterGender === g ? null : g)}
                >
                  <Text style={[styles.chipText, filterGender === g && styles.chipTextActive]}>
                    {g === 'female' ? 'Dişi ♀' : 'Erkek ♂'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>YAŞ ARALIĞI: {filterMinAge} - {filterMaxAge}</Text>
            <View style={styles.ageRow}>
              {[0, 2, 5, 10, 15, 20].map(age => (
                <TouchableOpacity
                  key={`min-${age}`}
                  style={[styles.ageChip, filterMinAge === age && styles.chipActive]}
                  onPress={() => setFilterMinAge(age)}
                >
                  <Text style={[styles.chipText, filterMinAge === age && styles.chipTextActive]}>{age}+</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Temizle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <Text style={styles.applyButtonText}>Uygula</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (currentIndex >= cards.length) {
    return (
      <View style={styles.centerContainer}>
        {renderFilterModal()}
        <Text style={styles.emptyText}>Şu an gösterilecek başka köpek yok 🐾</Text>
        <TouchableOpacity style={styles.button} onPress={loadData}>
          <Text style={styles.buttonText}>Yenile</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFilterVisible(true)} style={{ marginTop: 12 }}>
          <Text style={{ color: '#FB923C', fontWeight: '700' }}>Filtrele</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/library')} style={{ marginTop: 12 }}>
          <Text style={{ color: '#FB923C', fontWeight: '700' }}>Kütüphane</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/matches')} style={{ marginTop: 12 }}>
          <Text style={{ color: '#FB923C', fontWeight: '700' }}>Mesajlarım</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/profile')} style={{ marginTop: 12 }}>
          <Text style={{ color: '#FB923C', fontWeight: '700' }}>Profil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const current = cards[currentIndex];
  const photoUrl = current.photos[0]?.url;

  return (
    <View style={styles.container}>
      {renderFilterModal()}

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Babi.App</Text>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <TouchableOpacity onPress={() => setFilterVisible(true)}>
            <Text style={styles.headerLink}>Filtre</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/library')}>
            <Text style={styles.headerLink}>Kütüphane</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/matches')}>
            <Text style={styles.headerLink}>Mesajlar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/profile')}>
            <Text style={styles.headerLink}>Profil</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImage, styles.noPhoto]}>
            <Text>📷</Text>
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{current.name}, {current.age}</Text>
          <Text style={styles.cardBreed}>{current.breed}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionButton, styles.dislikeButton]} onPress={() => handleSwipe('dislike')}>
          <Text style={styles.actionIcon}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.likeButton]} onPress={() => handleSwipe('like')}>
          <Text style={styles.actionIcon}>♥</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED', alignItems: 'center', paddingTop: 60, padding: 20 },
  centerContainer: { flex: 1, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: 360, marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#431407' },
  headerLink: { fontSize: 14, fontWeight: '700', color: '#FB923C' },
  card: { width: '100%', maxWidth: 360, aspectRatio: 0.75, borderRadius: 24, overflow: 'hidden', backgroundColor: 'white' },
  cardImage: { width: '100%', height: '80%' },
  noPhoto: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFEDD5' },
  cardInfo: { padding: 16 },
  cardName: { fontSize: 20, fontWeight: '800', color: '#431407' },
  cardBreed: { fontSize: 14, color: '#9A6B4B', marginTop: 4 },
  actions: { flexDirection: 'row', gap: 24, marginTop: 32 },
  actionButton: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  dislikeButton: { backgroundColor: 'white', borderWidth: 2, borderColor: '#FCA5A5' },
  likeButton: { backgroundColor: '#FB923C' },
  actionIcon: { fontSize: 28, color: '#431407' },
  errorText: { fontSize: 14, color: '#DC2626', textAlign: 'center' },
  emptyText: { fontSize: 16, color: '#431407', textAlign: 'center', marginBottom: 16 },
  matchEmoji: { fontSize: 64 },
  matchTitle: { fontSize: 28, fontWeight: '900', color: '#431407', marginTop: 8 },
  matchSubtitle: { fontSize: 14, color: '#9A6B4B', marginTop: 8, textAlign: 'center' },
  button: {
    backgroundColor: '#FB923C', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, marginTop: 24,
  },
  buttonText: { color: 'white', fontSize: 14, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF7ED', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#431407', marginBottom: 16 },
  filterLabel: { fontSize: 11, fontWeight: '800', color: '#9A6B4B', letterSpacing: 1, marginTop: 16, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#FED7AA', backgroundColor: 'white' },
  chipActive: { backgroundColor: '#FB923C', borderColor: '#FB923C' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#9A6B4B' },
  chipTextActive: { color: 'white' },
  ageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ageChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#FED7AA', backgroundColor: 'white' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  clearButton: { flex: 1, borderWidth: 2, borderColor: '#FED7AA', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  clearButtonText: { color: '#9A6B4B', fontWeight: '800' },
  applyButton: { flex: 1, backgroundColor: '#FB923C', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  applyButtonText: { color: 'white', fontWeight: '800' },
});