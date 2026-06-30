import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.logoBox}>
        <Text style={styles.logoEmoji}>🐾</Text>
      </View>
      <Text style={styles.title}>Babi.App</Text>
      <Text style={styles.subtitle}>Köpeğiniz için en iyi arkadaşı bulun</Text>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/register/step1')}>
          <Text style={styles.primaryButtonText}>Kayıt Ol</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/login')}>
          <Text style={styles.secondaryButtonText}>Giriş Yap</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FB923C', alignItems: 'center', justifyContent: 'center', padding: 24 },
  logoBox: {
    width: 96, height: 96, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  logoEmoji: { fontSize: 40 },
  title: { fontSize: 36, fontWeight: '900', color: 'white' },
  subtitle: { fontSize: 14, color: 'white', marginTop: 8, textAlign: 'center' },
  buttons: { width: '100%', maxWidth: 320, marginTop: 64 },
  primaryButton: { backgroundColor: 'white', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  primaryButtonText: { color: '#FB923C', fontWeight: '800', fontSize: 16 },
  secondaryButton: { borderWidth: 2, borderColor: 'white', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  secondaryButtonText: { color: 'white', fontWeight: '800', fontSize: 16 },
});