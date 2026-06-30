import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, Modal, ActivityIndicator } from 'react-native';
import { supabase } from '../../../lib/supabase';

type HealthRecord = {
  id: string;
  record_type: 'vaccine' | 'checkup' | 'medication' | 'other';
  title: string;
  date: string;
  notes: string | null;
  next_date: string | null;
};

const RECORD_TYPES = [
  { value: 'vaccine', label: 'Aşı 💉' },
  { value: 'checkup', label: 'Kontrol 🏥' },
  { value: 'medication', label: 'İlaç 💊' },
  { value: 'other', label: 'Diğer 📋' },
];

export default function Health() {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [dogId, setDogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const [newType, setNewType] = useState<'vaccine' | 'checkup' | 'medication' | 'other'>('vaccine');
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newNextDate, setNewNextDate] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRecords();
  }, []);

  async function loadRecords() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) { setLoading(false); return; }

    const { data: dogs } = await supabase
      .from('dogs')
      .select('id')
      .eq('owner_id', userId)
      .limit(1);

    if (!dogs || dogs.length === 0) { setLoading(false); return; }

    const id = dogs[0].id;
    setDogId(id);

    const { data } = await supabase
      .from('health_records')
      .select('*')
      .eq('dog_id', id)
      .order('date', { ascending: false });

    setRecords(data || []);
    setLoading(false);
  }

  async function handleSave() {
    setError('');
    if (!newTitle.trim()) { setError('Başlık gerekli.'); return; }
    if (!newDate.trim()) { setError('Tarih gerekli (YYYY-AA-GG).'); return; }
    if (!dogId) return;

    setSaving(true);
    const { error: insertError } = await supabase.from('health_records').insert({
      dog_id: dogId,
      record_type: newType,
      title: newTitle,
      date: newDate,
      notes: newNotes || null,
      next_date: newNextDate || null,
    });

    setSaving(false);

    if (insertError) {
      setError('Kaydedilemedi: ' + insertError.message);
      return;
    }

    setNewTitle('');
    setNewDate('');
    setNewNextDate('');
    setNewNotes('');
    setNewType('vaccine');
    setModalVisible(false);
    loadRecords();
  }

  async function handleDelete(id: string) {
    await supabase.from('health_records').delete().eq('id', id);
    loadRecords();
  }

  function typeLabel(type: string) {
    return RECORD_TYPES.find(t => t.value === type)?.label || type;
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
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
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Yeni Kayıt Ekle</Text>

            <Text style={styles.fieldLabel}>TÜR</Text>
            <View style={styles.chipRow}>
              {RECORD_TYPES.map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.chip, newType === t.value && styles.chipActive]}
                  onPress={() => setNewType(t.value as any)}
                >
                  <Text style={[styles.chipText, newType === t.value && styles.chipTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>BAŞLIK</Text>
            <TextInput style={styles.input} value={newTitle} onChangeText={setNewTitle} placeholder="Örn: Kuduz Aşısı" />

            <Text style={styles.fieldLabel}>TARİH (YYYY-AA-GG)</Text>
            <TextInput style={styles.input} value={newDate} onChangeText={setNewDate} placeholder="2026-06-30" />

            <Text style={styles.fieldLabel}>SONRAKI TARİH (opsiyonel)</Text>
            <TextInput style={styles.input} value={newNextDate} onChangeText={setNewNextDate} placeholder="2027-06-30" />

            <Text style={styles.fieldLabel}>NOTLAR (opsiyonel)</Text>
            <TextInput style={[styles.input, { minHeight: 50 }]} value={newNotes} onChangeText={setNewNotes} placeholder="Veteriner adı, doz bilgisi..." multiline />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveButtonText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.title}>Sağlık Takibi 💉</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+ Ekle</Text>
        </TouchableOpacity>
      </View>

      {records.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Henüz sağlık kaydı yok.</Text>
          <Text style={styles.emptySubtext}>Aşı, kontrol ve ilaç bilgilerini buradan takip edebilirsin.</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.emptyButtonText}>İlk Kaydı Ekle</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.typeTag}>{typeLabel(item.record_type)}</Text>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Text style={styles.deleteText}>Sil</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.dateText}>📅 {formatDate(item.date)}</Text>
              {item.next_date ? (
                <Text style={styles.nextDateText}>🔔 Sonraki: {formatDate(item.next_date)}</Text>
              ) : null}
              {item.notes ? <Text style={styles.notesText}>{item.notes}</Text> : null}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '800', color: '#431407' },
  addButton: { backgroundColor: '#FB923C', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  addButtonText: { color: 'white', fontWeight: '800', fontSize: 13 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#431407', marginBottom: 8 },
  emptySubtext: { fontSize: 13, color: '#9A6B4B', textAlign: 'center', marginBottom: 20, maxWidth: 260 },
  emptyButton: { backgroundColor: '#FB923C', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24 },
  emptyButtonText: { color: 'white', fontWeight: '800' },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeTag: { backgroundColor: '#FFEDD5', color: '#FB923C', fontSize: 11, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  deleteText: { color: '#DC2626', fontSize: 12, fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#431407', marginBottom: 6 },
  dateText: { fontSize: 12, color: '#9A6B4B', marginBottom: 2 },
  nextDateText: { fontSize: 12, color: '#FB923C', fontWeight: '700', marginBottom: 2 },
  notesText: { fontSize: 12, color: '#5C4033', marginTop: 6, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF7ED', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#431407', marginBottom: 16 },
  fieldLabel: { fontSize: 10, fontWeight: '800', color: '#9A6B4B', letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#FED7AA', backgroundColor: 'white' },
  chipActive: { backgroundColor: '#FB923C', borderColor: '#FB923C' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#9A6B4B' },
  chipTextActive: { color: 'white' },
  input: { backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#FED7AA', paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: '#431407' },
  errorText: { color: '#DC2626', fontSize: 12, marginTop: 10 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelButton: { flex: 1, borderWidth: 2, borderColor: '#FED7AA', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  cancelButtonText: { color: '#9A6B4B', fontWeight: '800' },
  saveButton: { flex: 1, backgroundColor: '#FB923C', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  saveButtonText: { color: 'white', fontWeight: '800' },
});