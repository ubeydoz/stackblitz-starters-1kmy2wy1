import { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../../../lib/supabase';

type Article = {
  id: string;
  breed: string | null;
  title: string;
  body: string;
  keywords: string[] | null;
};

const FUNCTION_URL = 'https://chvmmfruytmddxxgkiet.supabase.co/functions/v1/smart-task';

export default function Library() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    loadArticles();
  }, []);

  async function loadArticles() {
    setLoading(true);
    const { data } = await supabase.from('library_articles').select('*').order('created_at', { ascending: false });
    setArticles(data || []);
    setLoading(false);
  }

  async function askAI() {
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    setAiError('');
    setAiAnswer('');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: aiQuestion }),
      });

      const json = await response.json();

      if (json.error) {
        setAiError(json.error);
      } else {
        setAiAnswer(json.answer);
      }
    } catch (e) {
      setAiError('Bir hata oluştu, tekrar deneyin.');
    } finally {
      setAiLoading(false);
    }
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
      <Text style={styles.title}>Kütüphane</Text>

      <TextInput
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
        placeholder="Ara (örn: aşı, bakım, ırk adı...)"
      />

      {loading ? (
        <ActivityIndicator size="large" color="#FB923C" style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={<Text style={styles.emptyText}>Sonuç bulunamadı.</Text>}
          ListFooterComponent={
            <View style={styles.aiSection}>
              <Text style={styles.aiSectionTitle}>🤖 AI'ya Sor</Text>
              <Text style={styles.aiSectionSubtitle}>
                Aradığını bulamadın mı? Köpeğinin durumunu yapay zekaya sor.
              </Text>

              <TextInput
                style={styles.aiInput}
                value={aiQuestion}
                onChangeText={setAiQuestion}
                placeholder="Örn: Köpeğim sürekli kulağını kaşıyor, ne yapmalıyım?"
                multiline
              />

              <TouchableOpacity style={styles.aiButton} onPress={askAI} disabled={aiLoading}>
                <Text style={styles.aiButtonText}>{aiLoading ? 'Düşünüyor...' : 'Sor'}</Text>
              </TouchableOpacity>

              {aiError ? <Text style={styles.aiError}>{aiError}</Text> : null}

              {aiAnswer ? (
                <View style={styles.aiAnswerCard}>
                  <Text style={styles.aiAnswerText}>{aiAnswer}</Text>
                </View>
              ) : null}
            </View>
          }
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
  title: { fontSize: 24, fontWeight: '800', color: '#431407', marginBottom: 16 },
  searchInput: {
    backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#FED7AA',
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#431407', marginBottom: 16,
  },
  emptyText: { textAlign: 'center', color: '#9A6B4B', marginTop: 16, marginBottom: 16 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12 },
  breedTag: {
    alignSelf: 'flex-start', backgroundColor: '#FFEDD5', color: '#FB923C', fontSize: 10, fontWeight: '800',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#431407', marginBottom: 6 },
  cardBody: { fontSize: 13, color: '#9A6B4B', lineHeight: 20 },
  aiSection: { marginTop: 24, backgroundColor: '#FFEDD5', borderRadius: 20, padding: 18 },
  aiSectionTitle: { fontSize: 16, fontWeight: '800', color: '#431407', marginBottom: 4 },
  aiSectionSubtitle: { fontSize: 12, color: '#9A6B4B', marginBottom: 14 },
  aiInput: {
    backgroundColor: 'white', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 13, color: '#431407', minHeight: 60, textAlignVertical: 'top',
  },
  aiButton: { backgroundColor: '#FB923C', borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  aiButtonText: { color: 'white', fontWeight: '800', fontSize: 13 },
  aiError: { color: '#DC2626', fontSize: 12, marginTop: 10 },
  aiAnswerCard: { backgroundColor: 'white', borderRadius: 14, padding: 14, marginTop: 14 },
  aiAnswerText: { fontSize: 13, color: '#431407', lineHeight: 20 },
});