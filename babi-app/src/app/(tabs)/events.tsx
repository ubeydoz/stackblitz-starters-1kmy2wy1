import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Compass, Trees, Building2, ChevronRight, Calendar } from 'lucide-react-native';
import { COLORS, SHADOW } from '../../../lib/theme';

export default function Events() {
  const router = useRouter();

  async function findNearbyDogParks() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const url = `https://www.google.com/maps/search/köpek+gezdirme+parkı/@${loc.coords.latitude},${loc.coords.longitude},14z`;
        Linking.openURL(url);
      } else {
        Linking.openURL('https://www.google.com/maps/search/köpek+gezdirme+parkı');
      }
    } catch {
      Linking.openURL('https://www.google.com/maps/search/köpek+gezdirme+parkı');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Compass size={22} color={COLORS.ink} />
        <Text style={styles.title}>Keşfet</Text>
      </View>

      {/* Yakındaki Alanlar */}
      <Text style={styles.sectionTitle}>Yakınımdaki Alanlar</Text>
      <TouchableOpacity style={styles.mapButtonFull} onPress={findNearbyDogParks}>
        <Trees size={30} color={COLORS.clay} style={styles.mapButtonIcon} />
        <Text style={styles.mapButtonTitle}>Köpek Gezdirme Parkları</Text>
        <Text style={styles.mapButtonSubtitle}>GPS ile bul</Text>
      </TouchableOpacity>

      {/* Hizmet İşletmeleri */}
      <Text style={styles.sectionTitle}>Hizmetler</Text>
      <TouchableOpacity style={styles.businessCard} onPress={() => router.push('/business/discover')}>
        <Building2 size={26} color={COLORS.clay} style={{ marginRight: 12 }} />
        <View style={styles.businessCardTextWrap}>
          <Text style={styles.businessCardTitle}>İşletmeleri Keşfet</Text>
          <Text style={styles.businessCardSubtitle}>Otel, pet kuaför ve gezdirme hizmeti veren işletmeleri bul</Text>
        </View>
        <ChevronRight size={20} color={COLORS.border} />
      </TouchableOpacity>

      {/* Etkinlikler */}
      <Text style={styles.sectionTitle}>Etkinlikler</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🏃 Bonus Park Koşusu</Text>
        <View style={styles.cardDateRow}>
          <Calendar size={12} color={COLORS.clay} />
          <Text style={styles.cardDate}>Yakında duyurulacak</Text>
        </View>
        <Text style={styles.cardDesc}>
          İstanbul'un en güzel parkurlarında köpeğinizle birlikte koşun, yeni dostlar edinin.
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌳 Orman Yürüyüşü</Text>
        <View style={styles.cardDateRow}>
          <Calendar size={12} color={COLORS.clay} />
          <Text style={styles.cardDate}>Yakında duyurulacak</Text>
        </View>
        <Text style={styles.cardDesc}>
          Doğada köpeklerle sosyalleşme buluşması. Tüm ırklar davetli!
        </Text>
      </View>

      <Text style={styles.footer}>
        Etkinlik düzenlemek veya alan önermek için bize ulaşın: destek@babiapp.com
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream, padding: 20, paddingTop: 64 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.ink, fontFamily: 'Fredoka_700Bold' },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: COLORS.sand, letterSpacing: 1, marginBottom: 12, marginTop: 8 },
  mapButtonFull: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 18, marginBottom: 20,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, ...SHADOW,
  },
  mapButtonIcon: { marginBottom: 8 },
  mapButtonTitle: { fontSize: 13, fontWeight: '800', color: COLORS.ink, textAlign: 'center' },
  mapButtonSubtitle: { fontSize: 11, color: COLORS.clay, fontWeight: '700', marginTop: 2 },
  businessCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border, ...SHADOW,
  },
  businessCardTextWrap: { flex: 1 },
  businessCardTitle: { fontSize: 14, fontWeight: '800', color: COLORS.ink },
  businessCardSubtitle: { fontSize: 11, color: COLORS.sand, marginTop: 3, lineHeight: 16 },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 12, ...SHADOW },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.ink, marginBottom: 4 },
  cardDateRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  cardDate: { fontSize: 12, color: COLORS.clay, fontWeight: '700' },
  cardDesc: { fontSize: 12, color: COLORS.sand, lineHeight: 18 },
  footer: { fontSize: 11, color: COLORS.sand, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
});