import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

type MatchItem = {
  matchId: string;
  otherDogId: string;
  otherDogName: string;
  otherDogPhoto: string | null;
};

export default function Matches() {
  const router = useRouter();
  const [items, setItems] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, []);

  async function loadMatches() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      router.replace('/login');
      return;
    }

    const { data: myDogs } = await supabase.from('dogs').select('id').eq('owner_id', userId);
    const myDogIds = (myDogs || []).map(d => d.id);

    if (myDogIds.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

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
        .select('name, dog_photos(url)')
        .eq('id', otherDogId)
        .single();

      results.push({
        matchId: m.id,
        otherDogId,
        otherDogName: dogData?.name || 'Bilinmeyen',
        otherDogPhoto: (dogData as any)?.dog_photos?.[0]?.url || null,
      });
    }

    setItems(results);
    setLoading(false);
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
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push({ pathname: '/chat', params: { matchId: item.matchId, dogName: item.otherDogName } })}
            >
              {item.otherDogPhoto ? (
                <Image source={{ uri: item.otherDogPhoto }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.noAvatar]} />
              )}
              <Text style={styles.name}>{item.otherDogName}</Text>
            </TouchableOpacity>
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
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  noAvatar: { backgroundColor: '#FFEDD5' },
  name: { fontSize: 16, fontWeight: '700', color: '#431407' },
});