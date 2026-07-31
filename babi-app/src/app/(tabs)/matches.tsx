import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';

type MatchItem = {
  matchId: string;
  otherDogId: string;
  otherDogName: string;
  otherDogPhoto: string | null;
  otherOwnerId: string;
};

export default function Matches() {
  const router = useRouter();
  const [items, setItems] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadMatches();
  }, []);

  async function loadMatches() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const currentUserId = userData.user?.id;
    if (!currentUserId) {
      router.replace('/login');
      return;
    }
    setUserId(currentUserId);

    const { data: myDogs } = await supabase.from('dogs').select('id').eq('owner_id', currentUserId);
    const myDogIds = (myDogs || []).map(d => d.id);

    if (myDogIds.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    // Engellenen kullanıcıları topla (iki yönlü: ben kimi engelledim + beni kim engelledi)
    const { data: iBlocked } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', currentUserId);
    const { data: blockedMe } = await supabase.from('blocks').select('blocker_id').eq('blocked_id', currentUserId);
    const blockedUserIds = new Set<string>([
      ...(iBlocked || []).map(b => b.blocked_id),
      ...(blockedMe || []).map(b => b.blocker_id),
    ]);

    const orFilter = myDogIds.map(id => `dog_a_id.eq.${id},dog_b_id.eq.${id}`).join(',');
    const { data: matchRows, error } = await supabase
      .from('matches')
      .select('id, dog_a_id, dog_b_id')
      .or(orFilter);

    if (error || !matchRows) {
      setItems([]);
      setLoading(false);
      return;
    }

    const results: MatchItem[] = [];
    for (const m of matchRows) {
      const otherDogId = myDogIds.includes(m.dog_a_id) ? m.dog_b_id : m.dog_a_id;
      const { data: dogData } = await supabase
        .from('dogs')
        .select('name, owner_id, dog_photos(url)')
        .eq('id', otherDogId)
        .single();

      if (!dogData) continue;
      if (blockedUserIds.has(dogData.owner_id)) continue; // engellenen kullanıcının eşleşmesini gösterme

      results.push({
        matchId: m.id,
        otherDogId,
        otherDogName: dogData.name || 'Bilinmeyen',
        otherDogPhoto: (dogData as any)?.dog_photos?.[0]?.url || null,
        otherOwnerId: dogData.owner_id,
      });
    }

    setItems(results);
    setLoading(false);
  }

  function confirmBlock(item: MatchItem) {
    Alert.alert(
      'Kullanıcıyı Engelle',
      `${item.otherDogName} sahibiyle eşleşmeniz kaldırılacak ve birbirinizi bir daha göremeyeceksiniz. Emin misin?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Engelle', style: 'destructive', onPress: () => handleBlock(item) },
      ]
    );
  }

  async function handleBlock(item: MatchItem) {
    if (!userId) return;
    const { error } = await supabase.from('blocks').insert({
      blocker_id: userId,
      blocked_id: item.otherOwnerId,
    });
    if (error) {
      Alert.alert('Hata', 'Engelleme işlemi başarısız oldu, tekrar dene.');
      return;
    }
    setItems(prev => prev.filter(i => i.matchId !== item.matchId));
  }

  function showOptions(item: MatchItem) {
    Alert.alert(
      item.otherDogName,
      undefined,
      [
        { text: 'Engelle', style: 'destructive', onPress: () => confirmBlock(item) },
        { text: 'İptal', style: 'cancel' },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FB923C" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Eşleşmeler</Text>
      {items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Henüz eşleşmen yok.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.matchId}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <TouchableOpacity
                style={styles.rowMain}
                onPress={() => router.push({ pathname: '/chat', params: { matchId: item.matchId, dogName: item.otherDogName } })}
              >
                {item.otherDogPhoto ? (
                  <Image source={{ uri: item.otherDogPhoto }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.noAvatar]} />
                )}
                <Text style={styles.name}>{item.otherDogName}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuButton} onPress={() => showOptions(item)}>
                <Text style={styles.menuDots}>⋯</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED', padding: 20, paddingTop: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#431407', marginBottom: 20 },
  emptyText: { fontSize: 14, color: '#9A6B4B' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, padding: 12, marginBottom: 10 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  noAvatar: { backgroundColor: '#FFEDD5' },
  name: { fontSize: 16, fontWeight: '700', color: '#431407' },
  menuButton: { paddingHorizontal: 12, paddingVertical: 8 },
  menuDots: { fontSize: 20, color: '#9A6B4B', fontWeight: '700' },
});