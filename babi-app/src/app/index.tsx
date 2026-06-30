import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function Index() {
  const [status, setStatus] = useState('Bağlanıyor...');

  useEffect(() => {
    async function testConnection() {
      const { data, error } = await supabase.from('library_articles').select('*');
      if (error) {
        setStatus('Hata: ' + error.message);
      } else {
        setStatus('Bağlantı başarılı! Kayıt sayısı: ' + data.length);
      }
    }
    testConnection();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 18, textAlign: 'center', padding: 20 },
});