import { View, Text, StyleSheet } from 'react-native';

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>🎉 Kayıt tamamlandı! Anasayfa yakında burada olacak.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', padding: 24 },
  text: { fontSize: 16, color: '#431407', textAlign: 'center' },
});