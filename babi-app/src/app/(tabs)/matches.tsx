import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Heart, MoreVertical } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';

type MatchItem = {
  matchId: string;
  otherDogId: string;
  otherDogName: string;
  otherDogPhoto: string | null;
  otherOwnerId: string;
  hasMessages: boolean;
  lastMessage: string | null;
  lastMessageAt: string | null;
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
        hasMessages: false,
        lastMessage: null,
        lastMessageAt: null,
      });
    }

    // Her eşleşme için "son mesaj var mı" bilgisini ayrı bir sorguyla çek
    const matchIds = results.map(r => r.matchId);
    if (matchIds.length > 0) {
      const { data: msgRows } = await supabase
        .from('messages')
        .select('match_id, content, created_at')
        .in('match_id', matchIds)
        .order('created_at', { ascending: false });

      const lastMessageByMatch: Record<string, { content: string; created_at: string }> = {};
      (msgRows || []).forEach((m: any) => {
        if (!lastMessageByMatch[m.match_id]) {
          lastMessageByMatch[m.match_id] = { content: m.content, created_at: m.created_at };
        }
      });

      results.forEach(r => {
        const last = lastMessageByMatch[r.matchId];
        if (last) {
          r.hasMessages = true;
          r.lastMessage = last.content;
          r.lastMessageAt = last.created_at;
        }
      });
    }

    results.sort((a, b) => {
      if (a.hasMessages && b.hasMessages) {
        return (b.lastMessageAt || '').localeCompare(a.lastMessageAt || '');
      }
      return 0;
    });

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

  function openChat(item: MatchItem) {
    router.push({ pathname: '/chat', params: { matchId: item.matchId, dogName: item.otherDogName } });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FB923C" />
      </View>
    );
  }

  const newMatches = items.filter(i => !i.hasMessages);
  const conversations = items.filter(i => i.hasMessages);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.titleRow}>
        <Heart size={22} color="#FB923C" fill="#FB923C" />
        <Text style={styles.title}>Eşleşmeler</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Henüz eşleşmen yok.</Text>
        </View>
      ) : (
        <>
          {newMatches.length > 0 ? (
            <View style={styles.newMatchesSection}>
              <Text style={styles.sectionLabel}>YENİ EŞLEŞMELER</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyRow}>
                {newMatches.map(item => (
                  <TouchableOpacity key={item.matchId} style={styles.storyItem} onPress={() => openChat(item)}>
                    <View style={styles.storyRing}>
                      {item.otherDogPhoto ? (
                        <Image source={{ uri: item.otherDogPhoto }} style={styles.storyAvatar} />
                      ) : (
                        <View style={[styles.storyAvatar, styles.noAvatar]} />
                      )}
                    </View>
                    <Text style={styles.storyName} numberOfLines={1}>{item.otherDogName}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <Text style={styles.sectionLabel}>MESAJLAR</Text>
          {conversations.length === 0 ? (
            <Text style={styles.emptyConversationsText}>Henüz mesajlaşma başlamadı. Yukarıdan bir eşleşmeye dokunarak sohbete başla.</Text>
          ) : (
            conversations.map(item => (
              <View key={item.matchId} style={styles.row}>
                <TouchableOpacity style={styles.rowMain} onPress={() => openChat(item)}>
                  {item.otherDogPhoto ? (
                    <Image source={{ uri: item.otherDogPhoto }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.noAvatar]} />
                  )}
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.name}>{item.otherDogName}</Text>
                    <Text style={styles.preview} numberOfLines={1}>{item.lastMessage}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuButton} onPress={() => showOptions(item)}>
                  <MoreVertical size={20} color="#9A6B4B" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#FFF7ED', padding: 20, paddingTop: 60, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#431407', fontFamily: 'Fredoka_700Bold' },
  emptyText: { fontSize: 14, color: '#9A6B4B' },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: '#9A6B4B', letterSpacing: 1, marginBottom: 10 },
  newMatchesSection: { marginBottom: 24 },
  storyRow: { gap: 14, paddingRight: 8 },
  storyItem: { alignItems: 'center', width: 70 },
  storyRing: {
    width: 66, height: 66, borderRadius: 33, borderWidth: 3, borderColor: '#FB923C',
    alignItems: 'center', justifyContent: 'center', padding: 2,
  },
  storyAvatar: { width: 56, height: 56, borderRadius: 28 },
  storyName: { fontSize: 11, fontWeight: '700', color: '#431407', marginTop: 6, textAlign: 'center' },
  emptyConversationsText: { fontSize: 13, color: '#9A6B4B', lineHeight: 19 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.87)',
    borderRadius: 16, padding: 12, marginBottom: 10,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  noAvatar: { backgroundColor: '#FFEDD5' },
  rowTextWrap: { flex: 1, marginRight: 8 },
  name: { fontSize: 16, fontWeight: '700', color: '#431407' },
  preview: { fontSize: 12, color: '#9A6B4B', marginTop: 2 },
  menuButton: { paddingHorizontal: 12, paddingVertical: 8 },
});
