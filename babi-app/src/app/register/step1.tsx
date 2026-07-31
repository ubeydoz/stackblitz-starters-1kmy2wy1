import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar } from 'react-native-calendars';

function formatBirthDateInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8); // YYYYAAGG, en fazla 8 rakam
  if (digits.length > 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
  }
  if (digits.length > 4) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  return digits;
}

function getMaxBirthDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().split('T')[0];
}

function getDefaultCalendarView(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 25);
  return d.toISOString().split('T')[0];
}

export default function Step1() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState(''); // YYYY-AA-GG formatında
  const [email, setEmail] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [calendarVisible, setCalendarVisible] = useState(false);

  const maxBirthDate = getMaxBirthDate();

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

  function handleBirthDateChange(text: string) {
    setBirthDate(formatBirthDateInput(text));
  }

  function handleCalendarSelect(dateString: string) {
    setBirthDate(dateString); // react-native-calendars zaten YYYY-AA-GG formatında veriyor
    setCalendarVisible(false);
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
      <View style={styles.dateRow}>
        <TextInput
          style={[styles.input, styles.dateInput]}
          value={birthDate}
          onChangeText={handleBirthDateChange}
          placeholder="2000-05-15"
          keyboardType={Platform.OS === 'web' ? 'default' : 'numbers-and-punctuation'}
          maxLength={10}
        />
        <TouchableOpacity style={styles.calendarButton} onPress={() => setCalendarVisible(true)}>
          <Text style={styles.calendarButtonIcon}>📅</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>E-POSTA</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="ahmet@ornek.com"
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <View style={styles.checkboxRow}>
        <TouchableOpacity onPress={() => setTermsAccepted(!termsAccepted)}>
          <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]} />
        </TouchableOpacity>
        <Text style={styles.checkboxText}>
          <Text onPress={() => setTermsAccepted(!termsAccepted)}>
            Kullanım Koşulları ve Gizlilik Politikası'
          </Text>
          <Text style={styles.linkText} onPress={() => router.push('/terms')}>nı okudum</Text>
          <Text onPress={() => setTermsAccepted(!termsAccepted)}>, kabul ediyorum.</Text>
        </Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Devam Et →</Text>
      </TouchableOpacity>

      <Modal
        visible={calendarVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Doğum Tarihi Seç</Text>
              <TouchableOpacity onPress={() => setCalendarVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Calendar
              current={birthDate || getDefaultCalendarView()}
              maxDate={maxBirthDate}
              onDayPress={day => handleCalendarSelect(day.dateString)}
              markedDates={birthDate ? { [birthDate]: { selected: true, selectedColor: '#FB923C' } } : {}}
              theme={{
                todayTextColor: '#FB923C',
                selectedDayBackgroundColor: '#FB923C',
                arrowColor: '#FB923C',
              }}
            />
            <Text style={styles.modalHint}>En fazla 18 yaş öncesine kadar seçim yapabilirsin.</Text>
          </View>
        </View>
      </Modal>
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
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateInput: { flex: 1 },
  calendarButton: {
    width: 50, height: 50, borderRadius: 16, backgroundColor: 'white',
    borderWidth: 1, borderColor: '#FED7AA', alignItems: 'center', justifyContent: 'center',
  },
  calendarButtonIcon: { fontSize: 20 },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 20, gap: 10 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#FB923C', marginTop: 2 },
  checkboxChecked: { backgroundColor: '#FB923C' },
  checkboxText: { flex: 1, fontSize: 12, color: '#9A6B4B', lineHeight: 18 },
  linkText: { color: '#FB923C', fontWeight: '700', textDecorationLine: 'underline' },
  errorText: { color: '#DC2626', fontSize: 13, marginTop: 12 },
  button: {
    backgroundColor: '#FB923C', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 24,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF7ED', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#431407' },
  modalClose: { fontSize: 20, color: '#9A6B4B', padding: 4 },
  modalHint: { fontSize: 11, color: '#9A6B4B', marginTop: 12, textAlign: 'center' },
});