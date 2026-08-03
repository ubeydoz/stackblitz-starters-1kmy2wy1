import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Modal, ScrollView, PanResponder, Animated, Dimensions, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { ImageOff, X, Heart, MapPin, Info, RotateCcw } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import PawMeetAnimation from '../../components/PawMeetAnimation';

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
};

type DogPhoto = { id: string; url: string; position?: number };

type DogCard = {
  id: string;
  name: string;
  breed: string;
  age: number;
  gender: string;
  about?: string | null;
  purpose?: string[];
  distance_km?: number;
  photos: DogPhoto[];
};

type LastSwipe = { dogId: string; action: 'like' | 'dislike'; swipeRowId: string };

const BREEDS = ['Golden Retriever', 'Labrador', 'Husky', 'Corgi', 'Poodle', 'Bulldog', 'Pomeranian', 'Diğer'];
const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 80;
const DISTANCE_OPTIONS = [5, 10, 25, 50, 100];

export default function Home() {
  const router = useRouter();
  const [myDogId, setMyDogId] = useState<string | null>(null);
  const [cards, setCards] = useState<DogCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [matchInfo, setMatchInfo] = useState<DogCard | null>(null);
  const [hasBusiness, setHasBusiness] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const [lastSwipe, setLastSwipe] = useState<LastSwipe | null>(null);
  const [usingDistanceQuery, setUsingDistanceQuery] = useState(false);

  const [filterVisible, setFilterVisible] = useState(false);
  const [filterBreed, setFilterBreed] = useState<string | null>(null);
  const [filterGender, setFilterGender] = useState<'male' | 'female' | null>(null);
  const [filterMinAge, setFilterMinAge] = useState(0);
  const [filterMaxAge, setFilterMaxAge] = useState(20);
  const [filterDistance, setFilterDistance] = useState<number | null>(null);

  const pan = useRef(new Animated.ValueXY()).current;
  const swipingRef = useRef(false);

  useEffect(() => {
    setPhotoIndex(0);
  }, [currentIndex]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    setHasBusiness(false);
    setLastSwipe(null);

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
      const { data: myBusinesses } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('owner_id', userId)
        .limit(1);

      if (myBusinesses && myBusinesses.length > 0) {
        setHasBusiness(true);
      } else {
        setError('Önce bir köpek profili oluşturmalısınız.');
      }
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

    let baseDogs: any[] = [];

    if (filterDistance) {
      // Konum bazlı sorgu
      setUsingDistanceQuery(true);
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const { data: nearbyDogs, error: rpcError } = await supabase.rpc('get_dogs_nearby', {
          user_lat: loc.coords.latitude,
          user_lng: loc.coords.longitude,
          radius_km: filterDistance,
          exclude_dog_id: dogId,
          min_age: filterMinAge,
          max_age: filterMaxAge,
          filter_breed: filterBreed || null,
          filter_gender: filterGender || null,
        });

        if (!rpcError && nearbyDogs) {
          const ids = nearbyDogs.map((d: any) => d.id);
          if (ids.length > 0) {
            // Tüm fotoğrafları çek (sadece ilk foto değil, hepsi)
            const { data: photos } = await supabase
              .from('dog_photos')
              .select('id, dog_id, url, position')
              .in('dog_id', ids)
              .order('position', { ascending: true });

            // about/purpose RPC dönüşünde yoksa buradan tamamla
            const { data: extraInfo } = await supabase
              .from('dogs')
              .select('id, about, purpose')
              .in('id', ids);
            const extraMap = new Map((extraInfo || []).map((e: any) => [e.id, e]));

            baseDogs = nearbyDogs.map((d: any) => ({
              ...d,
              about: extraMap.get(d.id)?.about ?? null,
              purpose: extraMap.get(d.id)?.purpose ?? [],
              photos: (photos || [])
                .filter(p => p.dog_id === d.id)
                .map(p => ({ id: p.id, url: p.url, position: p.position })),
            }));
          }
        }
      } else {
        setError('Mesafe filtresi için konum izni gerekiyor.');
        setLoading(false);
        return;
      }
    } else {
      // Normal sorgu (mesafe filtresi yok)
      setUsingDistanceQuery(false);
      let query = supabase
        .from('dogs')
        .select('id, name, breed, age, gender, about, purpose, dog_photos(id, url, position)')
        .eq('is_active', true)
        .neq('id', dogId)
        .gte('age', filterMinAge)
        .lte('age', filterMaxAge);

      if (filterBreed) query = query.eq('breed', filterBreed);
      if (filterGender) query = query.eq('gender', filterGender);

      const { data: otherDogs, error: dogsError } = await query;

      if (dogsError) {
        setError('Köpekler yüklenemedi: ' + dogsError.message);
        setLoading(false);
        return;
      }

      baseDogs = (otherDogs || []).map(d => ({
        id: d.id,
        name: d.name,
        breed: d.breed,
        age: d.age,
        gender: d.gender,
        about: (d as any).about ?? null,
        purpose: (d as any).purpose ?? [],
        photos: ((d as any).dog_photos || [])
          .slice()
          .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0)),
      }));
    }

    const filtered = baseDogs.filter(d => !swipedIds.includes(d.id));
    setCards(filtered);
    setCurrentIndex(0);
    setPhotoIndex(0);
    pan.setValue({ x: 0, y: 0 });
    setLoading(false);
  }, [router, filterBreed, filterGender, filterMinAge, filterMaxAge, filterDistance]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function goToPhoto(direction: 'prev' | 'next') {
    const current = cards[currentIndex];
    if (!current || current.photos.length <= 1) return;
    setPhotoIndex(prev => {
      if (direction === 'next') return Math.min(prev + 1, current.photos.length - 1);
      return Math.max(prev - 1, 0);
    });
  }

  async function handleSwipe(action: 'like' | 'dislike') {
    if (!myDogId || currentIndex >= cards.length || swipingRef.current) return;
    swipingRef.current = true;

    const targetDog = cards[currentIndex];
    const shownPhoto = targetDog.photos[photoIndex] || targetDog.photos[0];

    const { data: insertedSwipe, error: swipeError } = await supabase
      .from('swipes')
      .insert({
        swiper_dog_id: myDogId,
        target_dog_id: targetDog.id,
        action,
        shown_photo_id: shownPhoto?.id || null,
      })
      .select()
      .single();

    if (swipeError || !insertedSwipe) {
      setError('Bir hata oluştu: ' + (swipeError?.message || ''));
      swipingRef.current = false;
      return;
    }

    setLastSwipe({ dogId: targetDog.id, action, swipeRowId: insertedSwipe.id });

    if (action === 'like') {
      const { data: matchData } = await supabase
        .from('matches')
        .select('id')
        .or(`dog_a_id.eq.${targetDog.id},dog_b_id.eq.${targetDog.id}`)
        .or(`dog_a_id.eq.${myDogId},dog_b_id.eq.${myDogId}`);

      if (matchData && matchData.length > 0) {
        setMatchInfo(targetDog);
        pan.setValue({ x: 0, y: 0 });
        swipingRef.current = false;
        return;
      }
    }

    pan.setValue({ x: 0, y: 0 });
    setCurrentIndex(prev => prev + 1);
    swipingRef.current = false;
  }

  async function handleRewind() {
    if (!lastSwipe || swipingRef.current) return;
    swipingRef.current = true;
    const { dogId, action, swipeRowId } = lastSwipe;

    await supabase.from('swipes').delete().eq('id', swipeRowId);

    if (action === 'like' && myDogId) {
      // Bu swipe bir eşleşme oluşturmuş olabilir — geri alınca eşleşme de silinmeli,
      // yoksa silinmiş bir swipe'a rağmen eşleşme sistemde kalır.
      await supabase
        .from('matches')
        .delete()
        .or(`and(dog_a_id.eq.${myDogId},dog_b_id.eq.${dogId}),and(dog_a_id.eq.${dogId},dog_b_id.eq.${myDogId})`);
    }

    setLastSwipe(null);
    setCurrentIndex(prev => Math.max(0, prev - 1));
    pan.setValue({ x: 0, y: 0 });
    swipingRef.current = false;
  }

  function animateSwipeOut(direction: 'like' | 'dislike') {
    const toX = direction === 'like' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
    Animated.timing(pan, {
      toValue: { x: toX, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => handleSwipe(direction));
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 6,
      onPanResponderMove: (_, gesture) => {
        pan.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          animateSwipeOut('like');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          animateSwipeOut('dislike');
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
      },
      onPanResponderTerminate: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          animateSwipeOut('like');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          animateSwipeOut('dislike');
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  function closeMatch() {
    setMatchInfo(null);
    setCurrentIndex(prev => prev + 1);
  }

  function clearFilters() {
    setFilterBreed(null);
    setFilterGender(null);
    setFilterMinAge(0);
    setFilterMaxAge(20);
    setFilterDistance(null);
    setFilterVisible(false);
  }

  function applyFilters() {
    setFilterVisible(false);
  }

  const renderFilterModal = () => (
    <Modal visible={filterVisible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Filtrele</Text>
          <ScrollView>
            <Text style={styles.filterLabel}>MESAFE</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, filterDistance === null && styles.chipActive]}
                onPress={() => setFilterDistance(null)}
              >
                <Text style={[styles.chipText, filterDistance === null && styles.chipTextActive]}>Tümü</Text>
              </TouchableOpacity>
              {DISTANCE_OPTIONS.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, filterDistance === d && styles.chipActive]}
                  onPress={() => setFilterDistance(d)}
                >
                  <Text style={[styles.chipText, filterDistance === d && styles.chipTextActive]}>{d} km</Text>
                </TouchableOpacity>
              ))}
            </View>

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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FB923C" />
      </View>
    );
  }

  if (hasBusiness) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>
          Bu bölüm köpek sahipleri için 🐾{'\n'}İşletme profilini buradan yönetebilirsin.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/business/manage')}>
          <Text style={styles.buttonText}>İşletmelerimi Yönet</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={[styles.button, { marginTop: 16 }]} onPress={loadData}>
          <Text style={styles.buttonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (matchInfo) {
    return (
      <View style={styles.centerContainer}>
        <PawMeetAnimation size={70} color="#FB923C" />
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
      </View>
    );
  }

  const current = cards[currentIndex];
  const next1 = cards[currentIndex + 1];
  const next2 = cards[currentIndex + 2];
  const activePhoto = current.photos[photoIndex] || current.photos[0];
  const photoUrl = activePhoto?.url;
  const hasMultiplePhotos = current.photos.length > 1;
  const showDistanceBadge = usingDistanceQuery && current.distance_km != null;

  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-15deg', '0deg', '15deg'],
  });

  const likeOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {renderFilterModal()}

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Babi.App</Text>
        <TouchableOpacity onPress={() => setFilterVisible(true)}>
          <Text style={styles.headerLink}>
            Filtre {filterDistance ? `· ${filterDistance}km` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardStackWrap}>
        {next2 ? (
          <View pointerEvents="none" style={[styles.card, styles.stackCardBack2]}>
            {next2.photos[0]?.url ? (
              <Image source={{ uri: next2.photos[0].url }} style={styles.stackCardImage} />
            ) : (
              <View style={[styles.stackCardImage, styles.noPhoto]}>
                <ImageOff size={28} color="#FB923C" />
              </View>
            )}
          </View>
        ) : null}

        {next1 ? (
          <View pointerEvents="none" style={[styles.card, styles.stackCardBack1]}>
            {next1.photos[0]?.url ? (
              <Image source={{ uri: next1.photos[0].url }} style={styles.stackCardImage} />
            ) : (
              <View style={[styles.stackCardImage, styles.noPhoto]}>
                <ImageOff size={28} color="#FB923C" />
              </View>
            )}
          </View>
        ) : null}

        <Animated.View
          style={[
            styles.card,
            { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.cardClip}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.cardImage} />
            ) : (
              <View style={[styles.cardImage, styles.noPhoto]}>
                <ImageOff size={32} color="#FB923C" />
              </View>
            )}

            {hasMultiplePhotos ? (
              <>
                <View style={styles.progressRow}>
                  {current.photos.map((p, idx) => (
                    <View key={p.id} style={styles.progressTrack}>
                      <View style={[styles.progressFill, idx <= photoIndex && styles.progressFillActive]} />
                    </View>
                  ))}
                </View>
                <Pressable style={styles.tapZoneLeft} onPress={() => goToPhoto('prev')} />
                <Pressable style={styles.tapZoneRight} onPress={() => goToPhoto('next')} />
              </>
            ) : null}

            <Animated.View style={[styles.likeLabel, { opacity: likeOpacity }]}>
              <Text style={styles.likeLabelText}>LIKE</Text>
            </Animated.View>
            <Animated.View style={[styles.nopeLabel, { opacity: nopeOpacity }]}>
              <Text style={styles.nopeLabelText}>NOPE</Text>
            </Animated.View>

            <TouchableOpacity style={styles.infoButton} onPress={() => setInfoVisible(true)}>
              <Info size={18} color="white" />
            </TouchableOpacity>

            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{current.name}, {current.age}</Text>
              <View style={styles.cardMetaRow}>
                <Text style={styles.cardBreed}>{current.breed}</Text>
                {showDistanceBadge ? (
                  <View style={styles.distanceBadge}>
                    <MapPin size={11} color="white" />
                    <Text style={styles.distanceBadgeText}>{current.distance_km!.toFixed(1)} km</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </Animated.View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.rewindButton, !lastSwipe && styles.rewindButtonDisabled]}
          onPress={handleRewind}
          disabled={!lastSwipe}
        >
          <RotateCcw size={20} color={lastSwipe ? '#FB923C' : '#D8CDBF'} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.dislikeButton]} onPress={() => animateSwipeOut('dislike')}>
          <X size={28} color="#EF4444" strokeWidth={2.5} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.likeButton]} onPress={() => animateSwipeOut('like')}>
          <Heart size={26} color="white" fill="white" />
        </TouchableOpacity>
      </View>

      <Modal visible={infoVisible} animationType="slide" transparent onRequestClose={() => setInfoVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.infoModalContent}>
            <View style={styles.infoModalHeader}>
              <Text style={styles.modalTitle}>{current.name}</Text>
              <TouchableOpacity onPress={() => setInfoVisible(false)}>
                <X size={20} color="#9A6B4B" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.infoPhotoScroll}>
                {current.photos.map(p => (
                  <Image key={p.id} source={{ uri: p.url }} style={styles.infoPhoto} />
                ))}
              </ScrollView>

              <Text style={styles.infoName}>{current.name}, {current.age}</Text>
              <Text style={styles.infoBreed}>{current.breed} · {current.gender === 'female' ? 'Dişi' : 'Erkek'}</Text>
              {showDistanceBadge ? (
                <View style={styles.iconRow}>
                  <MapPin size={13} color="#9A6B4B" />
                  <Text style={styles.infoMeta}>{current.distance_km!.toFixed(1)} km uzaklıkta</Text>
                </View>
              ) : null}

              {current.about ? (
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionLabel}>HAKKINDA</Text>
                  <Text style={styles.infoAbout}>{current.about}</Text>
                </View>
              ) : null}

              {current.purpose && current.purpose.length > 0 ? (
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionLabel}>AMAÇ</Text>
                  <View style={styles.purposeRow}>
                    {current.purpose.map(p => (
                      <View key={p} style={styles.purposeTag}>
                        <Text style={styles.purposeTagText}>{p}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED', alignItems: 'center', paddingTop: 64, padding: 20 },
  centerContainer: { flex: 1, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: 360, marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#431407', fontFamily: 'Fredoka_700Bold' },
  headerLink: { fontSize: 14, fontWeight: '700', color: '#FB923C' },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },

  cardStackWrap: { width: '100%', maxWidth: 360, aspectRatio: 0.75, position: 'relative' },
  card: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 24, backgroundColor: 'white', ...CARD_SHADOW },
  cardClip: { flex: 1, borderRadius: 24, overflow: 'hidden' },
  stackCardBack1: { transform: [{ scale: 0.95 }, { translateY: 10 }] },
  stackCardBack2: { transform: [{ scale: 0.9 }, { translateY: 20 }] },
  stackCardImage: { width: '100%', height: '100%', borderRadius: 24 },
  cardImage: { width: '100%', height: '80%' },
  noPhoto: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFEDD5' },
  cardInfo: { padding: 16 },
  cardName: { fontSize: 20, fontWeight: '800', color: '#431407' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  cardBreed: { fontSize: 14, color: '#9A6B4B' },
  distanceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(67,20,7,0.65)',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
  },
  distanceBadgeText: { color: 'white', fontSize: 11, fontWeight: '800' },
  infoButton: {
    position: 'absolute', bottom: '20%', right: 12, marginBottom: 8, width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
  },
  likeLabel: { position: 'absolute', top: 40, left: 20, borderWidth: 4, borderColor: '#22C55E', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, transform: [{ rotate: '-20deg' }] },
  likeLabelText: { color: '#22C55E', fontSize: 28, fontWeight: '900' },
  nopeLabel: { position: 'absolute', top: 40, right: 20, borderWidth: 4, borderColor: '#EF4444', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, transform: [{ rotate: '20deg' }] },
  nopeLabelText: { color: '#EF4444', fontSize: 28, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: 20, marginTop: 32, alignItems: 'center' },
  actionButton: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  dislikeButton: { backgroundColor: 'white', borderWidth: 2, borderColor: '#FCA5A5' },
  likeButton: { backgroundColor: '#FB923C' },
  rewindButton: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'white', borderWidth: 2, borderColor: '#FED7AA',
  },
  rewindButtonDisabled: { opacity: 0.5 },
  errorText: { fontSize: 14, color: '#DC2626', textAlign: 'center' },
  emptyText: { fontSize: 16, color: '#431407', textAlign: 'center', marginBottom: 16 },
  matchTitle: { fontSize: 28, fontWeight: '900', color: '#431407', marginTop: 12, fontFamily: 'Fredoka_700Bold' },
  matchSubtitle: { fontSize: 14, color: '#9A6B4B', marginTop: 8, textAlign: 'center' },
  button: { backgroundColor: '#FB923C', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, marginTop: 24 },
  buttonText: { color: 'white', fontSize: 14, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF7ED', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#431407' },
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

  progressRow: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', gap: 4 },
  progressTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)', overflow: 'hidden' },
  progressFill: { flex: 1, backgroundColor: 'transparent' },
  progressFillActive: { backgroundColor: 'white' },
  tapZoneLeft: { position: 'absolute', top: 0, bottom: '20%', left: 0, width: '50%' },
  tapZoneRight: { position: 'absolute', top: 0, bottom: '20%', right: 0, width: '50%' },

  infoModalContent: { backgroundColor: '#FFF7ED', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, maxHeight: '85%' },
  infoModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  infoPhotoScroll: { height: 260, borderRadius: 18, marginBottom: 16 },
  infoPhoto: { width: SCREEN_WIDTH - 40, height: 260, borderRadius: 18 },
  infoName: { fontSize: 20, fontWeight: '900', color: '#431407', marginTop: 4 },
  infoBreed: { fontSize: 14, color: '#9A6B4B', marginTop: 2, marginBottom: 6 },
  infoMeta: { fontSize: 13, color: '#9A6B4B' },
  infoSection: { marginTop: 16 },
  infoSectionLabel: { fontSize: 10, fontWeight: '800', color: '#9A6B4B', letterSpacing: 1, marginBottom: 6 },
  infoAbout: { fontSize: 14, color: '#5C4033', lineHeight: 20 },
  purposeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  purposeTag: { backgroundColor: '#FFEDD5', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  purposeTagText: { fontSize: 12, fontWeight: '700', color: '#FB923C' },
});
