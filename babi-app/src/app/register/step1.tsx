import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';

export default function Step1() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState(''); // YYYY-AA-GG formatında
  const [email, setEmail] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');

  function calculateAge(dateStr: string): number | null {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const [year, month, day] = parts.map(Number);
    if (!year || !month || !day) return null;
    const birth = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  function handleContinue() {
    setError('');

    if (!fullName.trim()) {
      setError('Ad soyad gerekli.');
      return;
    }

    const age = calculateAge(birthDate);
    if (age === null) {
      setError('Doğum tarihini YYYY-AA-GG formatında girin (örn: 2000-05-15).');
      return;
    }
    if (age < 18) {
      setError('18 yaşından büyük olmalısınız.');
      return;
    }

    if (!email.includes('@')) {
      setError('Geçerli bir e-posta girin.');
      return;
    }

    if (!termsAccepted) {
      setError('Devam etmek için Kullanım Koşulları\'nı kabul etmelisiniz.');
      return;
    }

    router.push({
      pathname: '/register/verify',
      params: { fullName, birthDate, email },
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Merhaba! 👋</Text>
      <Text style={styles.subtitle}>Başlamak için bilgilerinizi girin</Text>

      <Text style={styles.label}>AD SOYAD</Text>
      <TextInput
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
        placeholder="Ahmet Yılmaz"
      />

      <Text style={styles.label}>DOĞUM TARİHİ</Text>
      <TextInput
        style={styles.input}
        value={birthDate}
        onChangeText={setBirthDate}
        placeholder="2000-05-15"
        keyboardType={Platform.OS === 'web' ? 'default' : 'numbers-and-punctuation'}
      />

      <Text style={styles.label}>E-POSTA</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="ahmet@ornek.com"
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TouchableOpacity style={styles.checkboxRow} onPress={() => setTermsAccepted(!termsAccepted)}>
        <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]} />
        <Text style={styles.checkboxText}>
          Kullanım Koşulları ve Gizlilik Politikası'nı okudum, kabul ediyorum.
        </Text>
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Devam Et →</Text>
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
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 20, gap: 10 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#FB923C', marginTop: 2 },
  checkboxChecked: { backgroundColor: '#FB923C' },
  checkboxText: { flex: 1, fontSize: 12, color: '#9A6B4B', lineHeight: 18 },
  errorText: { color: '#DC2626', fontSize: 13, marginTop: 12 },
  button: {
    backgroundColor: '#FB923C', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 24,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '800' },
});