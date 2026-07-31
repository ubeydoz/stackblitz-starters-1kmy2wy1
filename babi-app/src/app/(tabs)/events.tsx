import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

export default function Events() {
  const router = useRouter();

  async function findNearbyDogParks() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const url = `https://www.google.com/maps/search/köpek+parkı/@${loc.coords.latitude},${loc.coords.longitude},14z`;
        Linking.openURL(url);
      } else {
        Linking.openURL('https://www.google.com/maps/search/köpek+parkı');
      }
    } catch {
      Linking.openURL('https://www.google.com/maps/search/köpek+parkı');
    }
  }

  async function findNearbyDogAreas() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const url = `https://www.google.com/maps/search/köpek+gezdirme+alanı/@${loc.coords.latitude},${loc.coords.longitude},14z`;
        Linking.openURL(url);
      } else {
        Linking.openURL('https://www.google.com/maps/search/köpek+gezdirme+alanı');
      }
    } catch {
      Linking.openURL('https://www.google.com/maps/search/köpek+gezdirme+alanı');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Keşfet 🗺️</Text>

      {/* Yakındaki Alanlar */}
      <Text style={styles.sectionTitle}>Yakınımdaki Alanlar</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.mapButton} onPress={findNearbyDogParks}>
          <Text style={styles.mapButtonEmoji}>🏕️</Text>
          <Text style={styles.mapButtonTitle}>Köpek Parkları</Text>
          <Text style={styles.mapButtonSubtitle}>GPS ile bul</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.mapButton} onPress={findNearbyDogAreas}>
          <Text style={styles.mapButtonEmoji}>🌳</Text>
          <Text style={styles.mapButtonTitle}>Gezdirme Alanları</Text>
          <Text style={styles.mapButtonSubtitle}>GPS ile bul</Text>
        </TouchableOpacity>
      </View>

      {/* Hizmet İşletmeleri */}
      <Text style={styles.sectionTitle}>Hizmetler</Text>
      <TouchableOpacity style={styles.businessCard} onPress={() => router.push('/business/discover')}>
        <Text style={styles.businessCardEmoji}>🏢</Text>
        <View style={styles.businessCardTextWrap}>
          <Text style={styles.businessCardTitle}>İşletmeleri Keşfet</Text>
          <Text style={styles.businessCardSubtitle}>Otel, tımar/bakım ve gezdirme hizmeti veren işletmeleri bul</Text>
        </View>
        <Text style={styles.businessCardChevron}>›</Text>
      </TouchableOpacity>

      {/* Etkinlikler */}
      <Text style={styles.sectionTitle}>Etkinlikler</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🏃 Bonus Park Koşusu</Text>
        <Text style={styles.cardDate}>📅 Yakında duyurulacak</Text>
        <Text style={styles.cardDesc}>
          İstanbul'un en güzel parkurlarında köpeğinizle birlikte koşun, yeni dostlar edinin.
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌳 Orman Yürüyüşü</Text>
        <Text style={styles.cardDate}>📅 Yakında duyurulacak</Text>
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
  container: { flex: 1, backgroundColor: '#FFF7ED', padding: 20, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: '800', color: '#431407', marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#9A6B4B', letterSpacing: 1, marginBottom: 12, marginTop: 8 },
  buttonRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  mapButton: {
    flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#FED7AA',
  },
  mapButtonEmoji: { fontSize: 32, marginBottom: 8 },
  mapButtonTitle: { fontSize: 13, fontWeight: '800', color: '#431407', textAlign: 'center' },
  mapButtonSubtitle: { fontSize: 11, color: '#FB923C', fontWeight: '700', marginTop: 2 },
  businessCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#FED7AA',
  },
  businessCardEmoji: { fontSize: 28, marginRight: 12 },
  businessCardTextWrap: { flex: 1 },
  businessCardTitle: { fontSize: 14, fontWeight: '800', color: '#431407' },
  businessCardSubtitle: { fontSize: 11, color: '#9A6B4B', marginTop: 3, lineHeight: 16 },
  businessCardChevron: { fontSize: 22, color: '#FED7AA' },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#431407', marginBottom: 4 },
  cardDate: { fontSize: 12, color: '#FB923C', fontWeight: '700', marginBottom: 6 },
  cardDesc: { fontSize: 12, color: '#9A6B4B', lineHeight: 18 },
  footer: { fontSize: 11, color: '#9A6B4B', textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
});