import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, Modal, ActivityIndicator, Linking, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { Calendar } from 'react-native-calendars';
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

type MarkedDates = {
  [date: string]: {
    marked: boolean;
    dotColor: string;
    selected?: boolean;
    selectedColor?: string;
  };
};

export default function Health() {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [dogId, setDogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});

  const [newType, setNewType] = useState<'vaccine' | 'checkup' | 'medication' | 'other'>('vaccine');
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newNextDate, setNewNextDate] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<'date' | 'next_date'>('date');

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

    const fetchedRecords = data || [];
    setRecords(fetchedRecords);

    const marks: MarkedDates = {};
    fetchedRecords.forEach(r => {
      if (r.date) marks[r.date] = { marked: true, dotColor: '#FB923C' };
      if (r.next_date) marks[r.next_date] = { marked: true, dotColor: '#22C55E' };
    });
    setMarkedDates(marks);
    setLoading(false);
  }

  async function findNearbyVet() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const url = `https://www.google.com/maps/search/veteriner/@${loc.coords.latitude},${loc.coords.longitude},14z`;
        Linking.openURL(url);
      } else {
        Linking.openURL(`https://www.google.com/maps/search/veteriner`);
      }
    } catch {
      Linking.openURL(`https://www.google.com/maps/search/veteriner`);
    }
  }

  function openDatePicker(target: 'date' | 'next_date') {
    setDatePickerTarget(target);
    setDatePickerVisible(true);
  }

  function onDateSelected(day: { dateString: string }) {
    if (datePickerTarget === 'date') {
      setNewDate(day.dateString);
    } else {
      setNewNextDate(day.dateString);
    }
    setDatePickerVisible(false);
  }

  async function handleSave() {
    setError('');
    if (!newTitle.trim()) { setError('Başlık gerekli.'); return; }
    if (!newDate.trim()) { setError('Tarih seçiniz.'); return; }
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

  const selectedRecords = selectedDate
    ? records.filter(r => r.date === selectedDate || r.next_date === selectedDate)
    : [];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FB923C" />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Tarih seçici mini modal */}
      <Modal visible={datePickerVisible} animationType="fade" transparent>
      <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerModal}>
            <Text style={styles.datePickerTitle}>
              {datePickerTarget === 'date' ? 'Tarih Seç' : 'Sonraki Randevu Tarihi'}
            </Text>
            <Calendar
              onDayPress={onDateSelected}
              markedDates={datePickerTarget === 'date' && newDate ? {
                [newDate]: { selected: true, selectedColor: '#FB923C' }
              } : datePickerTarget === 'next_date' && newNextDate ? {
                [newNextDate]: { selected: true, selectedColor: '#22C55E' }
              } : {}}
              theme={{
                backgroundColor: 'white',
                calendarBackground: 'white',
                selectedDayBackgroundColor: '#FB923C',
                todayTextColor: '#FB923C',
                arrowColor: '#FB923C',
                textDayFontWeight: '600',
                textMonthFontWeight: '800',
              }}
            />
            <TouchableOpacity style={styles.cancelButton} onPress={() => setDatePickerVisible(false)}>
              <Text style={styles.cancelButtonText}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Yeni kayıt modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
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

              <Text style={styles.fieldLabel}>TARİH</Text>
              <TouchableOpacity style={styles.datePickerButton} onPress={() => openDatePicker('date')}>
                <Text style={newDate ? styles.datePickerButtonTextSelected : styles.datePickerButtonTextPlaceholder}>
                  {newDate ? `📅 ${formatDate(newDate)}` : '📅 Tarih seç'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>SONRAKI TARİH (opsiyonel)</Text>
              <TouchableOpacity style={styles.datePickerButton} onPress={() => openDatePicker('next_date')}>
                <Text style={newNextDate ? styles.datePickerButtonTextSelected : styles.datePickerButtonTextPlaceholder}>
                  {newNextDate ? `🔔 ${formatDate(newNextDate)}` : '🔔 Sonraki randevu tarihi seç'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>NOTLAR (opsiyonel)</Text>
              <TextInput
                style={[styles.input, { minHeight: 50 }]}
                value={newNotes}
                onChangeText={setNewNotes}
                placeholder="Veteriner adı, doz bilgisi..."
                multiline
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                  <Text style={styles.saveButtonText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.title}>Sağlık Takibi 💉</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.vetButton} onPress={findNearbyVet}>
            <Text style={styles.vetButtonText}>🏥 Vet Bul</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.addButtonText}>+ Ekle</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'list' && styles.toggleBtnActive]}
          onPress={() => setView('list')}
        >
          <Text style={[styles.toggleText, view === 'list' && styles.toggleTextActive]}>📋 Liste</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'calendar' && styles.toggleBtnActive]}
          onPress={() => setView('calendar')}
        >
          <Text style={[styles.toggleText, view === 'calendar' && styles.toggleTextActive]}>📅 Takvim</Text>
        </TouchableOpacity>
      </View>

      {view === 'calendar' ? (
        <ScrollView>
          <Calendar
            markedDates={{
              ...markedDates,
              ...(selectedDate ? {
                [selectedDate]: {
                  ...markedDates[selectedDate],
                  selected: true,
                  selectedColor: '#FB923C',
                }
              } : {}),
            }}
            onDayPress={day => setSelectedDate(day.dateString)}
            theme={{
              backgroundColor: '#FFF7ED',
              calendarBackground: '#FFF7ED',
              selectedDayBackgroundColor: '#FB923C',
              todayTextColor: '#FB923C',
              arrowColor: '#FB923C',
              dotColor: '#FB923C',
              textDayFontWeight: '600',
              textMonthFontWeight: '800',
            }}
          />

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FB923C' }]} />
              <Text style={styles.legendText}>Kayıt tarihi</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
              <Text style={styles.legendText}>Sonraki randevu</Text>
            </View>
          </View>

          {selectedDate && selectedRecords.length > 0 ? (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.selectedDateTitle}>{formatDate(selectedDate)} tarihli kayıtlar:</Text>
              {selectedRecords.map(item => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.typeTag}>{typeLabel(item.record_type)}</Text>
                    <TouchableOpacity onPress={() => handleDelete(item.id)}>
                      <Text style={styles.deleteText}>Sil</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {item.notes ? <Text style={styles.notesText}>{item.notes}</Text> : null}
                </View>
              ))}
            </View>
          ) : selectedDate ? (
            <Text style={styles.noRecordText}>Bu tarihte kayıt yok.</Text>
          ) : null}
        </ScrollView>
      ) : (
        <>
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
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED', padding: 20, paddingTop: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#431407' },
  vetButton: { backgroundColor: '#FFEDD5', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#FED7AA' },
  vetButtonText: { color: '#FB923C', fontWeight: '800', fontSize: 12 },
  addButton: { backgroundColor: '#FB923C', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  addButtonText: { color: 'white', fontWeight: '800', fontSize: 13 },
  viewToggle: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 14, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: '#FED7AA' },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#FB923C' },
  toggleText: { fontSize: 13, fontWeight: '700', color: '#9A6B4B' },
  toggleTextActive: { color: 'white' },
  legendRow: { flexDirection: 'row', gap: 16, paddingHorizontal: 8, marginTop: 8, marginBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: '#9A6B4B' },
  selectedDateTitle: { fontSize: 13, fontWeight: '800', color: '#431407', marginBottom: 8 },
  noRecordText: { fontSize: 13, color: '#9A6B4B', textAlign: 'center', marginTop: 16 },
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
  datePickerButton: { backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#FED7AA', paddingHorizontal: 14, paddingVertical: 12 },
  datePickerButtonTextSelected: { fontSize: 13, color: '#431407', fontWeight: '700' },
  datePickerButtonTextPlaceholder: { fontSize: 13, color: '#9A6B4B' },
  datePickerModal: { backgroundColor: 'white', borderRadius: 24, margin: 20, padding: 16, elevation: 10 },
  datePickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', zIndex: 999 },
  datePickerTitle: { fontSize: 16, fontWeight: '800', color: '#431407', marginBottom: 12, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center' },
  modalContent: { backgroundColor: '#FFF7ED', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%', marginTop: 'auto' },
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