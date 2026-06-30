import { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';

type Article = {
  id: string;
  breed: string | null;
  title: string;
  body: string;
  keywords: string[] | null;
};

export default function Library() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArticles();
  }, []);

  async function loadArticles() {
    setLoading(true);
    const { data } = await supabase.from('library_articles').select('*').order('created_at', { ascending: false });
    setArticles(data || []);
    setLoading(false);
  }

  const filtered = articles.filter(a => {
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    const inTitle = a.title.toLowerCase().includes(term);
    const inBody = a.body.toLowerCase().includes(term);
    const inBreed = a.breed?.toLowerCase().includes(term) || false;
    const inKeywords = (a.keywords || []).some(k => k.toLowerCase().includes(term));
    return inTitle || inBody || inBreed || inKeywords;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>‹ Geri</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Kütüphane</Text>
      </View>

      <TextInput
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
        placeholder="Ara (örn: aşı, bakım, ırk adı...)"
      />

      {loading ? (
        <ActivityIndicator size="large" color="#FB923C" style={{ marginTop: 32 }} />
      ) : filtered.length === 0 ? (
        <Text style={styles.emptyText}>Sonuç bulunamadı.</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.breed ? <Text style={styles.breedTag}>{item.breed}</Text> : null}
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody}>{item.body}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED', padding: 20, paddingTop: 60 },
  header: { marginBottom: 16 },
  backLink: { color: '#FB923C', fontWeight: '700', fontSize: 14, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#431407' },
  searchInput: {
    backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#FED7AA',
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#431407', marginBottom: 16,
  },
  emptyText: { textAlign: 'center', color: '#9A6B4B', marginTop: 32 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12 },
  breedTag: {
    alignSelf: 'flex-start', backgroundColor: '#FFEDD5', color: '#FB923C', fontSize: 10, fontWeight: '800',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#431407', marginBottom: 6 },
  cardBody: { fontSize: 13, color: '#9A6B4B', lineHeight: 20 },
});