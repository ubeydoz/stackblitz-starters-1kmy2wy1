import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../lib/supabase';

const MIN_PHOTOS = 2;
const MAX_PHOTOS = 8;

export default function Photos() {
  const router = useRouter();
  const [photos, setPhotos] = useState<string[]>([]); // local URI'ler
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  async function pickImage() {
    if (photos.length >= MAX_PHOTOS) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.[0]) {
      setPhotos(prev => [...prev, result.assets[0].uri]);
    }
  }

  function removePhoto(index: number) {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  }

  async function handleFinish() {
    setError('');

    if (photos.length < MIN_PHOTOS) {
      setError(`En az ${MIN_PHOTOS} fotoğraf eklemelisiniz.`);
      return;
    }

    setUploading(true);

    const { data: userData } = await supabase.auth.getUser();
    const ownerId = userData.user?.id;

    if (!ownerId) {
      setError('Oturum bulunamadı.');
      setUploading(false);
      return;
    }

    // En son eklenen köpeği bul (bu kullanıcının köpeği)
    const { data: dogs, error: dogError } = await supabase
      .from('dogs')
      .select('id')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (dogError || !dogs || dogs.length === 0) {
      setError('Köpek bulunamadı, lütfen önceki adımı tekrar deneyin.');
      setUploading(false);
      return;
    }

    const dogId = dogs[0].id;

    for (let i = 0; i < photos.length; i++) {
      const uri = photos[i];
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${dogId}/${Date.now()}_${i}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('dog-photos')
        .upload(fileName, blob, { contentType: blob.type || 'image/jpeg' });

      if (uploadError) {
        setError('Fotoğraf yüklenemedi: ' + uploadError.message);
        setUploading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from('dog-photos').getPublicUrl(fileName);

      await supabase.from('dog_photos').insert({
        dog_id: dogId,
        url: publicUrlData.publicUrl,
        position: i,
      });
    }

    setUploading(false);
    router.push('/home');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Fotoğraflar 📸</Text>
      <Text style={styles.subtitle}>En az {MIN_PHOTOS}, en fazla {MAX_PHOTOS} fotoğraf ekleyin</Text>

      <View style={styles.grid}>
        {photos.map((uri, i) => (
          <TouchableOpacity key={i} style={styles.photoSlot} onPress={() => removePhoto(i)}>
            <Image source={{ uri }} style={styles.photo} />
            {i === 0 && (
              <View style={styles.mainBadge}>
                <Text style={styles.mainBadgeText}>ANA</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
        {photos.length < MAX_PHOTOS && (
          <TouchableOpacity style={styles.addSlot} onPress={pickImage}>
            <Text style={styles.addSlotText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleFinish} disabled={uploading}>
        <Text style={styles.buttonText}>{uploading ? 'Yükleniyor...' : 'Tamamla 🎉'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#FFF7ED', flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '800', color: '#431407', marginTop: 16 },
  subtitle: { fontSize: 14, color: '#9A6B4B', marginTop: 4, marginBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoSlot: { width: 75, height: 75, borderRadius: 16, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  mainBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(251,146,60,0.9)', paddingVertical: 2 },
  mainBadgeText: { color: 'white', fontSize: 9, fontWeight: '800', textAlign: 'center' },
  addSlot: {
    width: 75, height: 75, borderRadius: 16, borderWidth: 2, borderColor: '#FED7AA',
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFEDD5',
  },
  addSlotText: { fontSize: 24, color: '#FB923C' },
  errorText: { color: '#DC2626', fontSize: 13, marginTop: 16 },
  button: {
    backgroundColor: '#FB923C', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 24,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '800' },
});