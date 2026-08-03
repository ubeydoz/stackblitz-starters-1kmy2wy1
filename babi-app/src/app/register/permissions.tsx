import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '../../../lib/supabase';

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
};

export default function Permissions() {
  const router = useRouter();
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  async function registerForPushNotifications() {
    if (Platform.OS === 'web') {
      return null; // Web'de push notification desteklemiyoruz, sadece Android/iOS
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  }

  async function handleContinue() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (locationEnabled) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        if (userId) {
          await supabase
            .from('profiles')
            .update({
              location: `POINT(${loc.coords.longitude} ${loc.coords.latitude})`,
            })
            .eq('id', userId);
        }
      }
    }

    if (notifEnabled) {
      const pushToken = await registerForPushNotifications();
      if (pushToken && userId) {
        await supabase
          .from('profiles')
          .update({ push_token: pushToken, notification_enabled: true })
          .eq('id', userId);
      }
    }

    setLoading(false);
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

      <TouchableOpacity style={styles.button} onPress={handleContinue} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Kaydediliyor...' : 'Devam Et →'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED', padding: 24, paddingTop: 64 },
  title: { fontSize: 24, fontWeight: '800', color: '#431407', fontFamily: 'Fredoka_700Bold' },
  subtitle: { fontSize: 14, color: '#9A6B4B', marginTop: 4, marginBottom: 24 },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 16, ...CARD_SHADOW },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#431407' },
  cardDesc: { fontSize: 12, color: '#9A6B4B', marginTop: 8, lineHeight: 18 },
  button: {
    backgroundColor: '#FB923C', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 16,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '800' },
});