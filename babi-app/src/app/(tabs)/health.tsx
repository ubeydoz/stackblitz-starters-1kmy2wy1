import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, Modal, ActivityIndicator, Linking, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { Calendar } from 'react-native-calendars';
import {
  Syringe, Stethoscope, Pill, ClipboardList, Plus, Trash2,
  Calendar as CalendarIcon, Bell, List, LucideIcon,
} from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';

type RecordType = 'vaccine' | 'checkup' | 'medication' | 'other';

type HealthRecord = {
  id: string;
  record_type: RecordType;
  title: string;
  date: string;
  notes: string | null;
  next_date: string | null;
};

// Aralıklar AAHA 2024 / WSAVA aşılama rehberleri ve güncel TR veteriner kaynaklarına dayanır.
const HEALTH_ITEMS: { key: string; label: string; record_type: RecordType; intervalMonths: number | null; Icon: LucideIcon }[] = [
  { key: 'rabies', label: 'Kuduz Aşısı', record_type: 'vaccine', intervalMonths: 12, Icon: Syringe },
  { key: 'dhpp', label: 'Karma Aşı (DHPP)', record_type: 'vaccine', intervalMonths: 12, Icon: Syringe },
  { key: 'leptospirosis', label: 'Leptospiroz', record_type: 'vaccine', intervalMonths: 12, Icon: Syringe },
  { key: 'bordetella', label: 'Kennel Cough (Bordetella)', record_type: 'vaccine', intervalMonths: 12, Icon: Syringe },
  { key: 'lyme', label: 'Lyme Aşısı', record_type: 'vaccine', intervalMonths: 12, Icon: Syringe },
  { key: 'internal_parasite', label: 'İç Parazit', record_type: 'medication', intervalMonths: 2, Icon: Pill },
  { key: 'external_parasite', label: 'Dış Parazit', record_type: 'medication', intervalMonths: 2, Icon: Pill },
  { key: 'checkup', label: 'Kontrol', record_type: 'checkup', intervalMonths: null, Icon: Stethoscope },
  { key: 'other', label: 'Diğer', record_type: 'other', intervalMonths: null, Icon: ClipboardList },
];

const CATEGORY_FILTERS: { value: 'all' | RecordType; label: string; Icon: LucideIcon | null }[] = [
  { value: 'all', label: 'Tümü', Icon: null },
  { value: 'vaccine', label: 'Aşı', Icon: Syringe },
  { value: 'checkup', label: 'Kontrol', Icon: Stethoscope },
  { value: 'medication', label: 'İlaç', Icon: Pill },
  { value: 'other', label: 'Diğer', Icon: ClipboardList },
];

type MarkedDates = {
  [date: string]: { marked: boolean; dotColor: string; selected?: boolean; selectedColor?: string; };
};

type FormStep = 'form' | 'pick_date' | 'pick_next_date';

function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  date.setMonth(date.getMonth() + months);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function Health() {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [dogId, setDogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [formStep, setFormStep] = useState<FormStep>('form');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [categoryFilter, setCategoryFilter] = useState<'all' | RecordType>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});

  const [newItemKey, setNewItemKey] = useState('rabies');
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newNextDate, setNewNextDate] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedItem = HEALTH_ITEMS.find(h => h.key === newItemKey) || HEALTH_ITEMS[0];
  const needsCustomTitle = selectedItem.key === 'checkup' || selectedItem.key === 'other';

  useEffect(() => { loadRecords(); }, []);

  async function loadRecords() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) { setLoading(false); return; }

    const { data: dogs } = await supabase.from('dogs').select('id').eq('owner_id', userId).limit(1);
    if (!dogs || dogs.length === 0) { setLoading(false); return; }

    const id = dogs[0].id;
    setDogId(id);

    const { data } = await supabase.from('health_records').select('*').eq('dog_id', id).order('date', { ascending: false });
    const fetched = data || [];
    setRecords(fetched);

    const marks: MarkedDates = {};
    fetched.forEach(r => {
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
        Linking.openURL(`https://www.google.com/maps/search/veteriner/@${loc.coords.latitude},${loc.coords.longitude},14z`);
      } else {
        Linking.openURL(`https://www.google.com/maps/search/veteriner`);
      }
    } catch {
      Linking.openURL(`https://www.google.com/maps/search/veteriner`);
    }
  }

  function selectHealthItem(item: typeof HEALTH_ITEMS[number]) {
    setNewItemKey(item.key);
    if (item.key !== 'checkup' && item.key !== 'other') {
      setNewTitle(item.label);
    } else {
      setNewTitle('');
    }
    if (item.intervalMonths && newDate) {
      setNewNextDate(addMonths(newDate, item.intervalMonths));
    } else {
      setNewNextDate('');
    }
  }

  function onPickDate(dateString: string) {
    setNewDate(dateString);
    if (selectedItem.intervalMonths) {
      setNewNextDate(addMonths(dateString, selectedItem.intervalMonths));
    }
    setFormStep('form');
  }

  async function handleSave() {
    setError('');
    const finalTitle = needsCustomTitle ? newTitle.trim() : selectedItem.label;
    if (!finalTitle) { setError('Başlık gerekli.'); return; }
    if (!newDate.trim()) { setError('Tarih seçiniz.'); return; }
    if (!dogId) return;

    setSaving(true);
    const { error: insertError } = await supabase.from('health_records').insert({
      dog_id: dogId, record_type: selectedItem.record_type, title: finalTitle,
      date: newDate, notes: newNotes || null, next_date: newNextDate || null,
    });
    setSaving(false);

    if (insertError) { setError('Kaydedilemedi: ' + insertError.message); return; }

    resetForm();
    setModalVisible(false);
    setFormStep('form');
    loadRecords();
  }

  function resetForm() {
    setNewItemKey('rabies');
    setNewTitle('');
    setNewDate('');
    setNewNextDate('');
    setNewNotes('');
  }

  async function handleDelete(id: string) {
    await supabase.from('health_records').delete().eq('id', id);
    loadRecords();
  }

  function openModal() {
    resetForm();
    setError('');
    setFormStep('form');
    setModalVisible(true);
  }

  function openModalForDate(date: string) {
    resetForm();
    setNewDate(date);
    setNewNextDate(addMonths(date, 12));
    setError('');
    setFormStep('form');
    setModalVisible(true);
  }

  function typeLabel(type: string) {
    return CATEGORY_FILTERS.find(t => t.value === type)?.label || type;
  }

  function typeIcon(type: string): LucideIcon {
    return CATEGORY_FILTERS.find(t => t.value === type)?.Icon || ClipboardList;
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
  }

  const selectedRecords = selectedDate
    ? records.filter(r => r.date === selectedDate || r.next_date === selectedDate)
    : [];

  const filteredRecords = categoryFilter === 'all' ? records : records.filter(r => r.record_type === categoryFilter);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#FB923C" /></View>;
  }

  return (
    <View style={styles.container}>
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>

            {formStep === 'form' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>Yeni Kayıt Ekle</Text>

                <Text style={styles.fieldLabel}>TÜR</Text>
                <View style={styles.chipRow}>
                  {HEALTH_ITEMS.map(item => (
                    <TouchableOpacity key={item.key}
                      style={[styles.chip, styles.chipIconRow, newItemKey === item.key && styles.chipActive]}
                      onPress={() => selectHealthItem(item)}>
                      <item.Icon size={14} color={newItemKey === item.key ? 'white' : '#9A6B4B'} />
                      <Text style={[styles.chipText, newItemKey === item.key && styles.chipTextActive]}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {needsCustomTitle ? (
                  <>
                    <Text style={styles.fieldLabel}>BAŞLIK</Text>
                    <TextInput style={styles.input} value={newTitle} onChangeText={setNewTitle} placeholder="Örn: Yıllık Genel Kontrol" />
                  </>
                ) : null}

                <Text style={styles.fieldLabel}>TARİH</Text>
                <TouchableOpacity style={[styles.datePickerButton, styles.datePickerButtonRow]} onPress={() => setFormStep('pick_date')}>
                  <CalendarIcon size={15} color={newDate ? '#431407' : '#9A6B4B'} />
                  <Text style={newDate ? styles.dateSelected : styles.datePlaceholder}>
                    {newDate ? formatDate(newDate) : 'Tarih seç'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.fieldLabel}>
                  SONRAKI TARİH{selectedItem.intervalMonths ? ' (otomatik hesaplandı)' : ' (opsiyonel)'}
                </Text>
                {selectedItem.intervalMonths ? (
                  <View style={[styles.datePickerButton, styles.datePickerButtonRow, styles.datePickerAuto]}>
                    <Bell size={15} color="#431407" />
                    <Text style={styles.dateSelected}>
                      {newNextDate ? formatDate(newNextDate) : `Tarih seçince ${selectedItem.intervalMonths} ay sonrasına ayarlanır`}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity style={[styles.datePickerButton, styles.datePickerButtonRow]} onPress={() => setFormStep('pick_next_date')}>
                    <Bell size={15} color={newNextDate ? '#431407' : '#9A6B4B'} />
                    <Text style={newNextDate ? styles.dateSelected : styles.datePlaceholder}>
                      {newNextDate ? formatDate(newNextDate) : 'Sonraki randevu tarihi seç'}
                    </Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.fieldLabel}>NOTLAR (opsiyonel)</Text>
                <TextInput style={[styles.input, { minHeight: 50 }]} value={newNotes}
                  onChangeText={setNewNotes} placeholder="Veteriner adı, doz bilgisi..." multiline />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => { setModalVisible(false); setFormStep('form'); }}>
                    <Text style={styles.cancelButtonText}>Vazgeç</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                    <Text style={styles.saveButtonText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}

            {(formStep === 'pick_date' || formStep === 'pick_next_date') && (
              <View>
                <Text style={styles.modalTitle}>
                  {formStep === 'pick_date' ? 'Tarih Seç' : 'Sonraki Randevu Tarihi'}
                </Text>
                <Calendar
                  onDayPress={day => {
                    if (formStep === 'pick_date') onPickDate(day.dateString);
                    else { setNewNextDate(day.dateString); setFormStep('form'); }
                  }}
                  markedDates={formStep === 'pick_date' && newDate ? {
                    [newDate]: { selected: true, selectedColor: '#FB923C', marked: false, dotColor: '' }
                  } : formStep === 'pick_next_date' && newNextDate ? {
                    [newNextDate]: { selected: true, selectedColor: '#22C55E', marked: false, dotColor: '' }
                  } : {}}
                  theme={{
                    backgroundColor: '#FFF7ED',
                    calendarBackground: '#FFF7ED',
                    selectedDayBackgroundColor: formStep === 'pick_date' ? '#FB923C' : '#22C55E',
                    todayTextColor: '#FB923C',
                    arrowColor: '#FB923C',
                    textDayFontWeight: '600',
                    textMonthFontWeight: '800',
                  }}
                />
                <TouchableOpacity style={[styles.cancelButton, { marginTop: 12 }]} onPress={() => setFormStep('form')}>
                  <Text style={styles.cancelButtonText}>← Geri</Text>
                </TouchableOpacity>
              </View>
            )}

          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Syringe size={20} color="#431407" />
          <Text style={styles.title}>Sağlık Takibi</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[styles.vetButton, styles.iconRow, styles.iconRowCenter]} onPress={findNearbyVet}>
            <Stethoscope size={13} color="#FB923C" />
            <Text style={styles.vetButtonText}>Vet Bul</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.addButton, styles.iconRow, styles.iconRowCenter]} onPress={openModal}>
            <Plus size={14} color="white" strokeWidth={3} />
            <Text style={styles.addButtonText}>Ekle</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.viewToggle}>
        <TouchableOpacity style={[styles.toggleBtn, styles.iconRow, styles.iconRowCenter, view === 'list' && styles.toggleBtnActive]} onPress={() => setView('list')}>
          <List size={14} color={view === 'list' ? 'white' : '#9A6B4B'} />
          <Text style={[styles.toggleText, view === 'list' && styles.toggleTextActive]}>Liste</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toggleBtn, styles.iconRow, styles.iconRowCenter, view === 'calendar' && styles.toggleBtnActive]} onPress={() => setView('calendar')}>
          <CalendarIcon size={14} color={view === 'calendar' ? 'white' : '#9A6B4B'} />
          <Text style={[styles.toggleText, view === 'calendar' && styles.toggleTextActive]}>Takvim</Text>
        </TouchableOpacity>
      </View>

      {view === 'list' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryRow}>
          {CATEGORY_FILTERS.map(cat => (
            <TouchableOpacity
              key={cat.value}
              style={[styles.categoryChip, styles.chipIconRow, categoryFilter === cat.value && styles.chipActive]}
              onPress={() => setCategoryFilter(cat.value)}
            >
              {cat.Icon ? <cat.Icon size={13} color={categoryFilter === cat.value ? 'white' : '#9A6B4B'} /> : null}
              <Text style={[styles.chipText, categoryFilter === cat.value && styles.chipTextActive]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      {view === 'calendar' ? (
        <ScrollView>
          <Calendar
            markedDates={{
              ...markedDates,
              ...(selectedDate ? { [selectedDate]: { ...markedDates[selectedDate], selected: true, selectedColor: '#FB923C' } } : {}),
            }}
            onDayPress={day => setSelectedDate(day.dateString)}
            theme={{
              backgroundColor: '#FFF7ED', calendarBackground: '#FFF7ED',
              selectedDayBackgroundColor: '#FB923C', todayTextColor: '#FB923C',
              arrowColor: '#FB923C', dotColor: '#FB923C',
              textDayFontWeight: '600', textMonthFontWeight: '800',
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
              {selectedRecords.map(item => {
                const TypeIcon = typeIcon(item.record_type);
                return (
                  <View key={item.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.typeTag, styles.iconRow]}>
                        <TypeIcon size={12} color="#FB923C" />
                        <Text style={styles.typeTagText}>{typeLabel(item.record_type)}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDelete(item.id)}>
                        <Trash2 size={16} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    {item.notes ? <Text style={styles.notesText}>{item.notes}</Text> : null}
                  </View>
                );
              })}
              <TouchableOpacity style={[styles.addForDateButton, styles.iconRow, styles.iconRowCenter]} onPress={() => openModalForDate(selectedDate)}>
                <Plus size={14} color="white" strokeWidth={3} />
                <Text style={styles.addForDateButtonText}>Bu Tarihe Kayıt Ekle</Text>
              </TouchableOpacity>
            </View>
          ) : selectedDate ? (
            <View style={{ marginTop: 12, alignItems: 'center' }}>
              <Text style={styles.noRecordText}>Bu tarihte kayıt yok.</Text>
              <TouchableOpacity style={[styles.addForDateButton, styles.iconRow, styles.iconRowCenter]} onPress={() => openModalForDate(selectedDate)}>
                <Plus size={14} color="white" strokeWidth={3} />
                <Text style={styles.addForDateButtonText}>Bu Tarihe Kayıt Ekle</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      ) : (
        filteredRecords.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              {categoryFilter === 'all' ? 'Henüz sağlık kaydı yok.' : `Bu kategoride kayıt yok.`}
            </Text>
            <Text style={styles.emptySubtext}>Aşı, kontrol ve ilaç bilgilerini buradan takip edebilirsin.</Text>
            <TouchableOpacity style={[styles.emptyButton, styles.iconRow, styles.iconRowCenter]} onPress={openModal}>
              <Plus size={15} color="white" strokeWidth={3} />
              <Text style={styles.emptyButtonText}>İlk Kaydı Ekle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredRecords}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item }) => {
              const TypeIcon = typeIcon(item.record_type);
              return (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.typeTag, styles.iconRow]}>
                      <TypeIcon size={12} color="#FB923C" />
                      <Text style={styles.typeTagText}>{typeLabel(item.record_type)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(item.id)}>
                      <Trash2 size={16} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <View style={[styles.iconRow, { marginBottom: 2 }]}>
                    <CalendarIcon size={12} color="#9A6B4B" />
                    <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                  </View>
                  {item.next_date ? (
                    <View style={[styles.iconRow, { marginBottom: 2 }]}>
                      <Bell size={12} color="#FB923C" />
                      <Text style={styles.nextDateText}>Sonraki: {formatDate(item.next_date)}</Text>
                    </View>
                  ) : null}
                  {item.notes ? <Text style={styles.notesText}>{item.notes}</Text> : null}
                </View>
              );
            }}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED', padding: 20, paddingTop: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#431407', fontFamily: 'Fredoka_700Bold' },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  iconRowCenter: { justifyContent: 'center' },
  vetButton: { backgroundColor: '#FFEDD5', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#FED7AA' },
  vetButtonText: { color: '#FB923C', fontWeight: '800', fontSize: 12 },
  addButton: { backgroundColor: '#FB923C', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  addButtonText: { color: 'white', fontWeight: '800', fontSize: 13 },
  viewToggle: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 14, padding: 4, marginBottom: 12, borderWidth: 1, borderColor: '#FED7AA' },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#FB923C' },
  toggleText: { fontSize: 13, fontWeight: '700', color: '#9A6B4B' },
  toggleTextActive: { color: 'white' },
  categoryScroll: { marginBottom: 12 },
  categoryRow: { gap: 8, paddingRight: 8 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: '#FED7AA', backgroundColor: 'white' },
  legendRow: { flexDirection: 'row', gap: 16, paddingHorizontal: 8, marginTop: 8, marginBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: '#9A6B4B' },
  selectedDateTitle: { fontSize: 13, fontWeight: '800', color: '#431407', marginBottom: 8 },
  noRecordText: { fontSize: 13, color: '#9A6B4B', textAlign: 'center', marginTop: 16 },
  addForDateButton: { backgroundColor: '#FB923C', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 20, marginTop: 12, alignSelf: 'center' },
  addForDateButtonText: { color: 'white', fontWeight: '800', fontSize: 13 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#431407', marginBottom: 8 },
  emptySubtext: { fontSize: 13, color: '#9A6B4B', textAlign: 'center', marginBottom: 20, maxWidth: 260 },
  emptyButton: { backgroundColor: '#FB923C', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24 },
  emptyButtonText: { color: 'white', fontWeight: '800' },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeTag: { backgroundColor: '#FFEDD5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeTagText: { color: '#FB923C', fontSize: 11, fontWeight: '800' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#431407', marginBottom: 6 },
  dateText: { fontSize: 12, color: '#9A6B4B' },
  nextDateText: { fontSize: 12, color: '#FB923C', fontWeight: '700' },
  notesText: { fontSize: 12, color: '#5C4033', marginTop: 6, lineHeight: 18 },
  datePickerButton: { backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#FED7AA', paddingHorizontal: 14, paddingVertical: 12 },
  datePickerButtonRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  datePickerAuto: { backgroundColor: '#FFEDD5', borderColor: '#FED7AA' },
  dateSelected: { fontSize: 13, color: '#431407', fontWeight: '700' },
  datePlaceholder: { fontSize: 13, color: '#9A6B4B' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF7ED', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#431407', marginBottom: 16 },
  fieldLabel: { fontSize: 10, fontWeight: '800', color: '#9A6B4B', letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#FED7AA', backgroundColor: 'white' },
  chipIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipActive: { backgroundColor: '#FB923C', borderColor: '#FB923C' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#9A6B4B' },
  chipTextActive: { color: 'white' },
  input: { backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#FED7AA', paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: '#431407' },
  errorText: { color: '#DC2626', fontSize: 12, marginTop: 10 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 10 },
  cancelButton: { flex: 1, borderWidth: 2, borderColor: '#FED7AA', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  cancelButtonText: { color: '#9A6B4B', fontWeight: '800' },
  saveButton: { flex: 1, backgroundColor: '#FB923C', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  saveButtonText: { color: 'white', fontWeight: '800' },
});
