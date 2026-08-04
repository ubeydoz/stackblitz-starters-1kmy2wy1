import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Dog, Building2 } from 'lucide-react-native';
import { COLORS, SHADOW } from '../../../lib/theme';

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
        <Dog size={40} color={COLORS.clay} style={styles.cardIcon} />
        <Text style={styles.cardTitle}>Köpek Sahibiyim</Text>
        <Text style={styles.cardDesc}>
          Köpeğim için eşleşme, sosyalleşme ve bakım bilgisi arıyorum.
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => selectType('business')}>
        <Building2 size={40} color={COLORS.clay} style={styles.cardIcon} />
        <Text style={styles.cardTitle}>İşletme Sahibiyim</Text>
        <Text style={styles.cardDesc}>
          Köpek oteli, tımar/bakım ya da gezdirme hizmeti sunuyorum.
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: COLORS.cream, flexGrow: 1, paddingTop: 64, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.ink, textAlign: 'center', fontFamily: 'Fredoka_700Bold' },
  subtitle: { fontSize: 14, color: COLORS.sand, marginTop: 8, marginBottom: 32, textAlign: 'center', maxWidth: 280 },
  card: {
    backgroundColor: COLORS.white, borderRadius: 20, padding: 24, width: '100%', maxWidth: 340,
    marginBottom: 16, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', ...SHADOW,
  },
  cardIcon: { marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: COLORS.ink },
  cardDesc: { fontSize: 13, color: COLORS.sand, marginTop: 8, textAlign: 'center', lineHeight: 19 },
});