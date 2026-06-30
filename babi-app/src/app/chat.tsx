import { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      router.replace('/login');
      return;
    }

    const { data: myDogs } = await supabase.from('dogs').select('id').eq('owner_id', userId).limit(1);
    if (myDogs && myDogs.length > 0) {
      setMyDogId(myDogs[0].id);
    }

    await loadMessages();

    const channel = supabase
      .channel(`chat-${matchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        payload => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  }

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

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{dogName}</Text>

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
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Gönder</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED', paddingTop: 60 },
  header: { fontSize: 20, fontWeight: '800', color: '#431407', paddingHorizontal: 20, marginBottom: 12 },
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