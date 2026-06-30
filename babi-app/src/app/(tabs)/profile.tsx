import { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';

export default function Profile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [dogName, setDogName] = useState('');
  const [dogBreed, setDogBreed] = useState('');
  const [dogAge, setDogAge] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      router.replace('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    setFullName(profile?.full_name || '');

    const { data: dogs } = await supabase
      .from('dogs')
      .select('id, name, breed, age, dog_photos(url)')
      .eq('owner_id', userId)
      .limit(1);

    if (dogs && dogs.length > 0) {
      const dog = dogs[0];
      setDogName(dog.name);
      setDogBreed(dog.breed);
      setDogAge(dog.age);
      setPhotoUrl((dog as any).dog_photos?.[0]?.url || null);
    }

    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FB923C" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backLink}>‹ Geri</Text>
      </TouchableOpacity>

      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.heroPhoto} />
      ) : (
        <View style={[styles.heroPhoto, styles.noPhoto]}>
          <Text>📷</Text>
        </View>
      )}

      <Text style={styles.dogName}>{dogName}{dogAge ? `, ${dogAge}` : ''}</Text>
      <Text style={styles.dogBreed}>{dogBreed}</Text>

      <View style={styles.ownerCard}>
        <Text style={styles.ownerLabel}>SAHİBİ</Text>
        <Text style={styles.ownerName}>{fullName}</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 60, backgroundColor: '#FFF7ED', flexGrow: 1, alignItems: 'center' },
  centerContainer: { flex: 1, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' },
  backLink: { color: '#FB923C', fontWeight: '700', fontSize: 14, alignSelf: 'flex-start', marginBottom: 16 },
  heroPhoto: { width: 160, height: 160, borderRadius: 80, marginBottom: 16 },
  noPhoto: { backgroundColor: '#FFEDD5', alignItems: 'center', justifyContent: 'center' },
  dogName: { fontSize: 24, fontWeight: '900', color: '#431407' },
  dogBreed: { fontSize: 14, color: '#9A6B4B', marginTop: 4, marginBottom: 24 },
  ownerCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, width: '100%', maxWidth: 320 },
  ownerLabel: { fontSize: 10, fontWeight: '800', color: '#9A6B4B', letterSpacing: 1 },
  ownerName: { fontSize: 16, fontWeight: '700', color: '#431407', marginTop: 4 },
  logoutButton: { marginTop: 32, paddingVertical: 12, paddingHorizontal: 32 },
  logoutText: { color: '#DC2626', fontWeight: '800', fontSize: 14 },
});