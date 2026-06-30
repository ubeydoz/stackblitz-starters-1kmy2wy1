import { View, Text, StyleSheet } from 'react-native';

export default function Health() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sağlık Takibi 💉</Text>
      <Text style={styles.text}>Aşı ve sağlık geçmişi takibi yakında burada olacak.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '800', color: '#431407', marginBottom: 12 },
  text: { fontSize: 14, color: '#9A6B4B', textAlign: 'center' },
});