import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

export default function Permissions() {
  const router = useRouter();
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);

  async function handleContinue() {
    if (locationEnabled) {
      await Location.requestForegroundPermissionsAsync();
    }
    router.push('/register/photos');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>İzinler 🔐</Text>
      <Text style={styles.subtitle}>Size daha iyi hizmet sunmak için</Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Konum Erişimi</Text>
          <Switch value={locationEnabled} onValueChange={setLocationEnabled} />
        </View>
        <Text style={styles.cardDesc}>
          Yakındaki köpekleri keşfetmek için konumunuza erişmemiz gerekiyor.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Bildirimler</Text>
          <Switch value={notifEnabled} onValueChange={setNotifEnabled} />
        </View>
        <Text style={styles.cardDesc}>
          Yeni eşleşmeler ve mesajlardan anında haberdar olmak için izin verin.
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Devam Et →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED', padding: 24, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: '800', color: '#431407' },
  subtitle: { fontSize: 14, color: '#9A6B4B', marginTop: 4, marginBottom: 24 },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#431407' },
  cardDesc: { fontSize: 12, color: '#9A6B4B', marginTop: 8, lineHeight: 18 },
  button: {
    backgroundColor: '#FB923C', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 16,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '800' },
});