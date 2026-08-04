import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import { COLORS } from '../../../lib/theme';

const BREEDS = [
  'Afgan Tazısı', 'Airedale Terrier', 'Akbaş (Karabaş)', 'Akita', 'Alaskan Malamute',
  'Alman Çoban Köpeği (Alman Kurdu)', 'Amerikan Bulldog', 'Amerikan Staffordshire Terrier',
  'Anadolu Çoban Köpeği (Kangal)', 'Basenji', 'Basset Hound', 'Beagle', 'Bearded Collie',
  'Belçika Çoban Köpeği (Malinois)', 'Bernese Dağ Köpeği', 'Bichon Frise', 'Border Collie',
  'Border Terrier', 'Boston Terrier', 'Boxer', 'Brittany Spaniel', 'Bull Terrier',
  'Buldog (İngiliz)', 'Cairn Terrier', 'Cane Corso', 'Cavalier King Charles Spaniel',
  'Chihuahua', 'Chow Chow', 'Cocker Spaniel (Amerikan)', 'Cocker Spaniel (İngiliz)',
  'Collie', 'Dalmaçyalı', 'Dachshund (Wiener)', 'Doberman', 'Dogo Argentino',
  'Dogue de Bordeaux', 'English Setter', 'Fox Terrier', 'Fransız Bulldog',
  'Golden Retriever', 'Great Dane (Alman Mastifi)', 'Greyhound', 'Havanese',
  'Irish Setter', 'Irish Wolfhound', 'İskoç Teriyeri', 'İtalyan Greyhound',
  'Jack Russell Terrier', 'Japon Spitz', 'Kangal', 'Kars Çoban Köpeği', 'Keeshond',
  'King Charles Spaniel', 'Komondor', 'Kuvasz', 'Labrador Retriever', 'Lhasa Apso',
  'Maltese', 'Mastiff', 'Miniature Pinscher', 'Miniature Schnauzer', 'Newfoundland',
  'Norfolk Terrier', 'Papillon', 'Pekingese', 'Pembroke Welsh Corgi',
  'Pitbull (American Pit Bull Terrier)', 'Pomeranian', 'Poodle (Kaniş)', 'Pug',
  'Rhodesian Ridgeback', 'Rottweiler', 'Saint Bernard', 'Samoyed', 'Schnauzer',
  'Scottish Terrier', 'Shar Pei', 'Shetland Sheepdog', 'Shiba Inu', 'Shih Tzu',
  'Sibirya Kurdu (Husky)', 'Springer Spaniel', 'Staffordshire Bull Terrier',
  'Tibet Mastifi', 'Tibet Spanieli', 'Vizsla', 'Weimaraner',
  'West Highland White Terrier', 'Whippet', 'Yorkshire Terrier', 'Zağar (Türk Tazısı)',
  'Melez / Karışık Irk', 'Diğer',
];

const PURPOSES = ['Oyun arkadaşı', 'Yürüyüş arkadaşı', 'Çiftleşme', 'Sosyalleşme'];

export default function Step2() {
  const router = useRouter();
  const [dogName, setDogName] = useState('');
  const [breed, setBreed] = useState('');
  const [breedModalVisible, setBreedModalVisible] = useState(false);
  const [breedSearch, setBreedSearch] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [purposes, setPurposes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredBreeds = useMemo(() => {
    if (!breedSearch.trim()) return BREEDS;
    const q = breedSearch.trim().toLocaleLowerCase('tr-TR');
    return BREEDS.filter(b => b.toLocaleLowerCase('tr-TR').includes(q));
  }, [breedSearch]);

  function togglePurpose(p: string) {
    setPurposes(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  }

  function selectBreed(b: string) {
    setBreed(b);
    setBreedModalVisible(false);
    setBreedSearch('');
  }

  async function handleContinue() {
    setError('');

    if (!dogName.trim()) {
      setError('Köpeğinizin adını girin.');
      return;
    }
    if (!breed) {
      setError('Köpeğinizin ırkını seçin.');
      return;
    }
    const ageNum = parseInt(age, 10);
    if (!age || isNaN(ageNum) || ageNum < 0 || ageNum > 30) {
      setError('Geçerli bir yaş girin.');
      return;
    }
    const weightNum = parseFloat(weight.replace(',', '.'));
    if (!weight || isNaN(weightNum) || weightNum <= 0 || weightNum > 150) {
      setError('Geçerli bir kilo girin (kg).');
      return;
    }

    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const ownerId = userData.user?.id;

    if (!ownerId) {
      setError('Oturum bulunamadı, lütfen tekrar giriş yapın.');
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('dogs').insert({
      owner_id: ownerId,
      name: dogName,
      breed,
      age: ageNum,
      weight: weightNum,
      gender,
      purpose: purposes,
    });

    setLoading(false);

    if (insertError) {
      setError('Kaydedilemedi: ' + insertError.message);
      return;
    }

    router.push('/register/permissions');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Köpeğiniz 🐾</Text>
      <Text style={styles.subtitle}>Dostunuz hakkında bilgi verin</Text>

      <Text style={styles.label}>KÖPEĞİN ADI</Text>
      <TextInput style={styles.input} value={dogName} onChangeText={setDogName} placeholder="Örn: Bella" />

      <Text style={styles.label}>IRK</Text>
      <TouchableOpacity style={styles.breedSelector} onPress={() => setBreedModalVisible(true)}>
        <Text style={breed ? styles.breedSelectorText : styles.breedSelectorPlaceholder}>
          {breed || 'Irk seç...'}
        </Text>
        <Text style={styles.breedSelectorChevron}>▾</Text>
      </TouchableOpacity>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>YAŞ</Text>
          <TextInput
            style={styles.input}
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            placeholder="2"
          />
        </View>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.label}>KİLO (KG)</Text>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder="12.5"
          />
        </View>
      </View>

      <Text style={styles.label}>CİNSİYET</Text>
      <View style={styles.row}>
        {(['female', 'male'] as const).map(g => (
          <TouchableOpacity
            key={g}
            style={[styles.genderBtn, gender === g && styles.chipActive]}
            onPress={() => setGender(g)}
          >
            <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>
              {g === 'female' ? 'Dişi ♀' : 'Erkek ♂'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>AMAÇ (birden fazla seçilebilir)</Text>
      <View style={styles.chipRow}>
        {PURPOSES.map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.chip, purposes.includes(p) && styles.chipActive]}
            onPress={() => togglePurpose(p)}
          >
            <Text style={[styles.chipText, purposes.includes(p) && styles.chipTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleContinue} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Kaydediliyor...' : 'Devam Et →'}</Text>
      </TouchableOpacity>

      <Modal
        visible={breedModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setBreedModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Irk Seç</Text>
              <TouchableOpacity onPress={() => setBreedModalVisible(false)}>
                <X size={20} color={COLORS.sand} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              value={breedSearch}
              onChangeText={setBreedSearch}
              placeholder="Irk ara..."
              autoFocus
            />

            <ScrollView style={styles.breedList}>
              {filteredBreeds.map(b => (
                <TouchableOpacity key={b} style={styles.breedRow} onPress={() => selectBreed(b)}>
                  <Text style={[styles.breedRowText, breed === b && styles.breedRowTextActive]}>{b}</Text>
                </TouchableOpacity>
              ))}
              {filteredBreeds.length === 0 ? (
                <Text style={styles.noResultText}>Sonuç bulunamadı.</Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: COLORS.cream, flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.ink, marginTop: 16, fontFamily: 'Fredoka_700Bold' },
  subtitle: { fontSize: 14, color: COLORS.sand, marginTop: 4, marginBottom: 24 },
  label: { fontSize: 10, fontWeight: '800', color: COLORS.sand, letterSpacing: 1, marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: COLORS.ink,
  },
  breedSelector: {
    backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  breedSelectorText: { fontSize: 14, color: COLORS.ink, fontWeight: '600' },
  breedSelectorPlaceholder: { fontSize: 14, color: COLORS.placeholder },
  breedSelectorChevron: { fontSize: 14, color: COLORS.sand },
  row: { flexDirection: 'row' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, backgroundColor: COLORS.white,
  },
  chipActive: { backgroundColor: COLORS.clay, borderColor: COLORS.clay },
  chipText: { fontSize: 12, fontWeight: '700', color: COLORS.sand },
  chipTextActive: { color: COLORS.white },
  genderBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.white, alignItems: 'center', marginRight: 8,
  },
  errorText: { color: COLORS.danger, fontSize: 13, marginTop: 16 },
  button: {
    backgroundColor: COLORS.clay, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 24,
  },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink },
  searchInput: {
    backgroundColor: COLORS.white, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: COLORS.ink, marginBottom: 12,
  },
  breedList: { maxHeight: 400 },
  breedRow: { paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  breedRowText: { fontSize: 14, color: COLORS.ink },
  breedRowTextActive: { color: COLORS.clay, fontWeight: '800' },
  noResultText: { textAlign: 'center', color: COLORS.sand, fontSize: 13, paddingVertical: 20 },
});