import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { COLORS } from '../../../lib/theme';

export default function Verify() {
  const router = useRouter();
  const { fullName, birthDate, email, accountType } = useLocalSearchParams<{
    fullName: string;
    birthDate: string;
    email: string;
    accountType?: string;
  }>();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    sendCode();
  }, []);

  async function sendCode() {
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email as string,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      setError('Kod gönderilemedi: ' + error.message);
    } else {
      setSent(true);
    }
  }

  async function handleVerify() {
    setError('');
    if (code.length !== 6) {
      setError('6 haneli kodu girin.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: email as string,
      token: code,
      type: 'email',
    });
    setLoading(false);

    if (error) {
      setError('Kod hatalı veya süresi dolmuş: ' + error.message);
      return;
    }

    // Doğrulama başarılı, profili oluşturalım (ya da zaten varsa güncelleyelim)
    const userId = data.user?.id;
    if (userId) {
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: userId,
          full_name: fullName,
          birth_date: birthDate,
          email_verified: true,
          terms_accepted_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (profileError) {
        setError('Profil oluşturulamadı: ' + profileError.message);
        return;
      }
    }

    if (accountType === 'business') {
      router.push('/business/create');
    } else {
      router.push('/register/step2');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>E-postayı Doğrula</Text>
      <Text style={styles.subtitle}>
        {email} adresine gönderilen 6 haneli kodu girin
      </Text>

      <TextInput
        style={styles.codeInput}
        value={code}
        onChangeText={setCode}
        placeholder="123456"
        keyboardType="number-pad"
        maxLength={6}
      />

      {sent && !error ? (
        <Text style={styles.infoText}>Kod gönderildi, gelen kutunu kontrol et.</Text>
      ) : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Kontrol ediliyor...' : 'Doğrula'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={sendCode} disabled={loading}>
        <Text style={styles.resend}>Kodu almadın mı? Tekrar Gönder</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream, padding: 24, alignItems: 'center', paddingTop: 64 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.ink },
  subtitle: { fontSize: 14, color: COLORS.sand, marginTop: 8, textAlign: 'center', maxWidth: 280 },
  codeInput: {
    backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 2, borderColor: COLORS.border,
    paddingHorizontal: 20, paddingVertical: 16, fontSize: 24, color: COLORS.ink,
    marginTop: 32, width: 200, textAlign: 'center', letterSpacing: 8,
  },
  infoText: { color: COLORS.success, fontSize: 13, marginTop: 16 },
  errorText: { color: COLORS.danger, fontSize: 13, marginTop: 16, textAlign: 'center' },
  button: {
    backgroundColor: COLORS.clay, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 48,
    alignItems: 'center', marginTop: 32,
  },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  resend: { color: COLORS.clay, fontWeight: '700', marginTop: 16, fontSize: 13 },
});