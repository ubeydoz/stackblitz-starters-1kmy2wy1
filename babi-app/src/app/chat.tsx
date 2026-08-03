import { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MoreVertical } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

type Message = {
  id: string;
  sender_dog_id: string;
  content: string;
  created_at: string;
};

export default function Chat() {
  const router = useRouter();
  const { matchId, dogName } = useLocalSearchParams<{ matchId: string; dogName: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [myDogId, setMyDogId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [otherOwnerId, setOtherOwnerId] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData.user?.id;
      if (!currentUserId) {
        router.replace('/login');
        return;
      }
      setUserId(currentUserId);

      const { data: myDogs } = await supabase.from('dogs').select('id').eq('owner_id', currentUserId).limit(1);
      let currentMyDogId: string | null = null;
      if (myDogs && myDogs.length > 0) {
        currentMyDogId = myDogs[0].id;
        setMyDogId(currentMyDogId);
      }

      // Karşı tarafın sahibini bul (Block/Report için gerekli)
      if (currentMyDogId) {
        const { data: matchRow } = await supabase
          .from('matches')
          .select('dog_a_id, dog_b_id')
          .eq('id', matchId)
          .single();
        if (matchRow) {
          const otherDogId = matchRow.dog_a_id === currentMyDogId ? matchRow.dog_b_id : matchRow.dog_a_id;
          const { data: otherDog } = await supabase.from('dogs').select('owner_id').eq('id', otherDogId).single();
          if (otherDog) setOtherOwnerId(otherDog.owner_id);
        }
      }

      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });
      setMessages(data || []);

      channel = supabase
        .channel(`chat-${matchId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
          payload => {
            setMessages(prev => [...prev, payload.new as Message]);
          }
        )
        .subscribe();
    }

    init();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [matchId, router]);

  async function sendMessage() {
    if (!input.trim() || !myDogId) return;
    const content = input.trim();
    setInput('');

    await supabase.from('messages').insert({
      match_id: matchId,
      sender_dog_id: myDogId,
      content,
    });
  }

  function showOptions() {
    if (!otherOwnerId) return;
    Alert.alert(
      dogName as string,
      undefined,
      [
        { text: 'Şikayet Et', onPress: showReportReasons },
        { text: 'Engelle', style: 'destructive', onPress: confirmBlock },
        { text: 'İptal', style: 'cancel' },
      ]
    );
  }

  function showReportReasons() {
    Alert.alert(
      'Şikayet Nedeni',
      'Bu kullanıcıyı neden şikayet ediyorsun?',
      [
        { text: 'Sahte Profil', onPress: () => sendReport('sahte_profil') },
        { text: 'Taciz / Uygunsuz Davranış', onPress: () => sendReport('taciz') },
        { text: 'Diğer', onPress: () => sendReport('diger') },
      ]
    );
  }

  async function sendReport(reason: 'sahte_profil' | 'taciz' | 'diger') {
    if (!userId || !otherOwnerId) return;
    const { error } = await supabase.from('reports').insert({
      reporter_id: userId,
      reported_id: otherOwnerId,
      match_id: matchId,
      reason,
    });
    if (error) {
      Alert.alert('Hata', 'Bildirim gönderilemedi, tekrar dene.');
      return;
    }
    Alert.alert('Teşekkürler', 'Bildirimin alındı, en kısa sürede incelenecek.');
  }

  function confirmBlock() {
    Alert.alert(
      'Kullanıcıyı Engelle',
      `${dogName} sahibiyle eşleşmeniz kaldırılacak ve birbirinizi bir daha göremeyeceksiniz. Emin misin?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Engelle', style: 'destructive', onPress: handleBlock },
      ]
    );
  }

  async function handleBlock() {
    if (!userId || !otherOwnerId) return;
    const { error } = await supabase.from('blocks').insert({
      blocker_id: userId,
      blocked_id: otherOwnerId,
    });
    if (error) {
      Alert.alert('Hata', 'Engelleme işlemi başarısız oldu, tekrar dene.');
      return;
    }
    router.back();
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>{dogName}</Text>
        <TouchableOpacity style={styles.menuButton} onPress={showOptions}>
          <MoreVertical size={22} color="#9A6B4B" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.sender_dog_id === myDogId ? styles.myBubble : styles.theirBubble]}>
            <Text style={item.sender_dog_id === myDogId ? styles.myText : styles.theirText}>{item.content}</Text>
          </View>
        )}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Mesaj yaz..."
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Gönder</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED', paddingTop: 64 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  header: { fontSize: 20, fontWeight: '800', color: '#431407', fontFamily: 'Fredoka_700Bold' },
  menuButton: { paddingHorizontal: 10, paddingVertical: 4 },
  messageList: { padding: 16, gap: 8 },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 16, marginBottom: 8 },
  myBubble: { backgroundColor: '#FB923C', alignSelf: 'flex-end' },
  theirBubble: { backgroundColor: 'white', alignSelf: 'flex-start' },
  myText: { color: 'white' },
  theirText: { color: '#431407' },
  inputRow: { flexDirection: 'row', padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: '#FED7AA' },
  input: { flex: 1, backgroundColor: 'white', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  sendButton: { backgroundColor: '#FB923C', borderRadius: 16, paddingHorizontal: 20, justifyContent: 'center' },
  sendButtonText: { color: 'white', fontWeight: '800' },
});