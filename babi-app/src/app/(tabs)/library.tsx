import { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, SectionList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { BookOpen, Bot, ChevronDown, ChevronUp } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import { COLORS, SHADOW } from '../../../lib/theme';

const CATEGORY_ORDER = ['Beslenme', 'Sağlık & Aşı', 'Eğitim & Davranış', 'Ev Bakımı', 'Sosyalleşme'];

type Article = {
  id: string;
  breed: string | null;
  title: string;
  body: string;
  keywords: string[] | null;
  category: string | null;
};

const FUNCTION_URL = 'https://chvmmfruytmddxxgkiet.supabase.co/functions/v1/smart-task';

export default function Library() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set([CATEGORY_ORDER[0]]));

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

  function toggleCategory(category: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
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

  const isSearching = search.trim().length > 0;

  const categoryNames = [...CATEGORY_ORDER, 'Diğer'];
  const sections = categoryNames
    .map(cat => {
      const items = cat === 'Diğer'
        ? articles.filter(a => !a.category || !CATEGORY_ORDER.includes(a.category))
        : articles.filter(a => a.category === cat);
      return { title: cat, count: items.length, data: expandedCategories.has(cat) ? items : [] };
    })
    .filter(s => s.count > 0);

  const aiSection = (
    <View style={styles.aiSection}>
      <View style={styles.aiSectionTitleRow}>
        <Bot size={18} color={COLORS.ink} />
        <Text style={styles.aiSectionTitle}>AI'ya Sor</Text>
      </View>
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
  );

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <BookOpen size={22} color={COLORS.ink} />
        <Text style={styles.title}>Kütüphane</Text>
      </View>

      <TextInput
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
        placeholder="Ara (örn: aşı, bakım, ırk adı...)"
      />

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.clay} style={{ marginTop: 32 }} />
      ) : isSearching ? (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={<Text style={styles.emptyText}>Sonuç bulunamadı.</Text>}
          ListFooterComponent={filtered.length > 0 ? aiSection : null}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.breed ? <Text style={styles.breedTag}>{item.breed}</Text> : null}
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody}>{item.body}</Text>
            </View>
          )}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={<Text style={styles.emptyText}>Henüz makale eklenmedi.</Text>}
          ListFooterComponent={sections.length > 0 ? aiSection : null}
          renderSectionHeader={({ section }) => (
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleCategory(section.title)}>
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionHeaderTitle}>{section.title}</Text>
                <View style={styles.sectionHeaderCountBadge}>
                  <Text style={styles.sectionHeaderCountText}>{section.count}</Text>
                </View>
              </View>
              {expandedCategories.has(section.title) ? (
                <ChevronUp size={18} color={COLORS.teal} />
              ) : (
                <ChevronDown size={18} color={COLORS.teal} />
              )}
            </TouchableOpacity>
          )}
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
  container: { flex: 1, backgroundColor: COLORS.cream, padding: 20, paddingTop: 64 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.ink, fontFamily: 'Fredoka_700Bold' },
  searchInput: {
    backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: COLORS.ink, marginBottom: 16,
  },
  emptyText: { textAlign: 'center', color: COLORS.sand, marginTop: 16, marginBottom: 16 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, marginTop: 6, marginBottom: 4,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionHeaderTitle: { fontSize: 13, fontWeight: '800', color: COLORS.teal, letterSpacing: 0.5 },
  sectionHeaderCountBadge: { backgroundColor: '#E0F2F4', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  sectionHeaderCountText: { fontSize: 11, fontWeight: '800', color: COLORS.teal },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 12, ...SHADOW },
  breedTag: {
    alignSelf: 'flex-start', backgroundColor: COLORS.peach, color: COLORS.clay, fontSize: 10, fontWeight: '800',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink, marginBottom: 6 },
  cardBody: { fontSize: 13, color: COLORS.sand, lineHeight: 20 },
  aiSection: { marginTop: 12, backgroundColor: COLORS.peach, borderRadius: 20, padding: 18 },
  aiSectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  aiSectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink },
  aiSectionSubtitle: { fontSize: 12, color: COLORS.sand, marginBottom: 14 },
  aiInput: {
    backgroundColor: COLORS.white, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 13, color: COLORS.ink, minHeight: 60, textAlignVertical: 'top',
  },
  aiButton: { backgroundColor: COLORS.clay, borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  aiButtonText: { color: COLORS.white, fontWeight: '800', fontSize: 13 },
  aiError: { color: COLORS.danger, fontSize: 12, marginTop: 10 },
  aiAnswerCard: { backgroundColor: COLORS.white, borderRadius: 14, padding: 14, marginTop: 14, ...SHADOW },
  aiAnswerText: { fontSize: 13, color: COLORS.ink, lineHeight: 20 },
});
