import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    setError('');
    if (!email.includes('@')) {
      setError('Geçerli bir e-posta girin.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (error) {
      setError('Kod gönderilemedi: ' + error.message);
      return;
    }
    setStep('code');
  }

  async function verifyCode() {
    setError('');
    if (code.length !== 6) {
      setError('6 haneli kodu girin.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });
    setLoading(false);
    if (error) {
      setError('Kod hatalı: ' + error.message);
      return;
    }
    router.push('/home');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Giriş Yap</Text>

      {step === 'email' ? (
        <>
          <Text style={styles.label}>E-POSTA</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="ahmet@ornek.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity style={styles.button} onPress={sendCode} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Gönderiliyor...' : 'Kod Gönder'}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.label}>6 HANELİ KOD</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity style={styles.button} onPress={verifyCode} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Kontrol ediliyor...' : 'Giriş Yap'}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED', padding: 24, paddingTop: 80 },
  title: { fontSize: 24, fontWeight: '800', color: '#431407', marginBottom: 24 },
  label: { fontSize: 10, fontWeight: '800', color: '#9A6B4B', letterSpacing: 1, marginBottom: 6 },
  input: {
    backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#FED7AA',
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: '#431407',
  },
  errorText: { color: '#DC2626', fontSize: 13, marginTop: 12 },
  button: {
    backgroundColor: '#FB923C', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 20,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '800' },
});