import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';

const BREEDS = ['Golden Retriever', 'Labrador', 'Husky', 'Corgi', 'Poodle', 'Bulldog', 'Pomeranian', 'Diğer'];
const PURPOSES = ['Oyun arkadaşı', 'Yürüyüş arkadaşı', 'Çiftleşme', 'Sosyalleşme'];

export default function Step2() {
  const router = useRouter();
  const [dogName, setDogName] = useState('');
  const [breed, setBreed] = useState('Golden Retriever');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [purposes, setPurposes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function togglePurpose(p: string) {
    setPurposes(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  }

  async function handleContinue() {
    setError('');

    if (!dogName.trim()) {
      setError('Köpeğinizin adını girin.');
      return;
    }
    const ageNum = parseInt(age, 10);
    if (!age || isNaN(ageNum) || ageNum < 0 || ageNum > 30) {
      setError('Geçerli bir yaş girin.');
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
      <View style={styles.chipRow}>
        {BREEDS.map(b => (
          <TouchableOpacity
            key={b}
            style={[styles.chip, breed === b && styles.chipActive]}
            onPress={() => setBreed(b)}
          >
            <Text style={[styles.chipText, breed === b && styles.chipTextActive]}>{b}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.row}>
        <View style={{ width: 100 }}>
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
        </View>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#FFF7ED', flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '800', color: '#431407', marginTop: 16 },
  subtitle: { fontSize: 14, color: '#9A6B4B', marginTop: 4, marginBottom: 24 },
  label: { fontSize: 10, fontWeight: '800', color: '#9A6B4B', letterSpacing: 1, marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#FED7AA',
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: '#431407',
  },
  row: { flexDirection: 'row' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1,
    borderColor: '#FED7AA', backgroundColor: 'white',
  },
  chipActive: { backgroundColor: '#FB923C', borderColor: '#FB923C' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#9A6B4B' },
  chipTextActive: { color: 'white' },
  genderBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: '#FED7AA',
    backgroundColor: 'white', alignItems: 'center', marginRight: 8,
  },
  errorText: { color: '#DC2626', fontSize: 13, marginTop: 16 },
  button: {
    backgroundColor: '#FB923C', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 24,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '800' },
});