import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function AccountType() {
  const router = useRouter();

  function selectType(type: 'owner' | 'business') {
    router.push({ pathname: '/register/step1', params: { accountType: type } });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Nasıl katılmak istersin? 🐾</Text>
      <Text style={styles.subtitle}>Bu seçim, kayıt akışını sana göre şekillendirecek</Text>

      <TouchableOpacity style={styles.card} onPress={() => selectType('owner')}>
        <Text style={styles.cardEmoji}>🐕</Text>
        <Text style={styles.cardTitle}>Köpek Sahibiyim</Text>
        <Text style={styles.cardDesc}>
          Köpeğim için eşleşme, sosyalleşme ve bakım bilgisi arıyorum.
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => selectType('business')}>
        <Text style={styles.cardEmoji}>🏢</Text>
        <Text style={styles.cardTitle}>İşletme Sahibiyim</Text>
        <Text style={styles.cardDesc}>
          Köpek oteli, tımar/bakım ya da gezdirme hizmeti sunuyorum.
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#FFF7ED', flexGrow: 1, paddingTop: 80, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#431407', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#9A6B4B', marginTop: 8, marginBottom: 32, textAlign: 'center', maxWidth: 280 },
  card: {
    backgroundColor: 'white', borderRadius: 20, padding: 24, width: '100%', maxWidth: 340,
    marginBottom: 16, borderWidth: 2, borderColor: '#FED7AA', alignItems: 'center',
  },
  cardEmoji: { fontSize: 40, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#431407' },
  cardDesc: { fontSize: 13, color: '#9A6B4B', marginTop: 8, textAlign: 'center', lineHeight: 19 },
});