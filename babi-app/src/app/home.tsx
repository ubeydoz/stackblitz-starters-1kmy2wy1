import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

type DogCard = {
  id: string;
  name: string;
  breed: string;
  age: number;
  gender: string;
  photos: { url: string }[];
};

export default function Home() {
  const router = useRouter();
  const [myDogId, setMyDogId] = useState<string | null>(null);
  const [cards, setCards] = useState<DogCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [matchInfo, setMatchInfo] = useState<DogCard | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      router.replace('/login');
      return;
    }

    // Kullanıcının kendi köpeğini bul
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

    // Daha önce swipe edilmiş köpekleri bul
    const { data: swiped } = await supabase
      .from('swipes')
      .select('target_dog_id')
      .eq('swiper_dog_id', dogId);

    const swipedIds = (swiped || []).map(s => s.target_dog_id);

    // Diğer aktif köpekleri getir (kendi köpeği ve daha önce swipe edilenler hariç)
    let query = supabase
      .from('dogs')
      .select('id, name, breed, age, gender, dog_photos(url)')
      .eq('is_active', true)
      .neq('id', dogId);

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
  }, [router]);

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
      // Karşılıklı like olup olmadığını kontrol et (trigger zaten match'i oluşturmuş olmalı)
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
        <TouchableOpacity style={styles.button} onPress={closeMatch}>
          <Text style={styles.buttonText}>Devam Et</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (currentIndex >= cards.length) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>Şu an gösterilecek başka köpek yok 🐾</Text>
        <TouchableOpacity style={styles.button} onPress={loadData}>
          <Text style={styles.buttonText}>Yenile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const current = cards[currentIndex];
  const photoUrl = current.photos[0]?.url;

  return (
    <View style={styles.container}>
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
});