import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Trash2, Plus, PartyPopper } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';

const MIN_PHOTOS = 2;
const MAX_PHOTOS = 8;

type LocalPhoto = { uri: string; mimeType: string };

export default function Photos() {
  const router = useRouter();
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  async function pickImage() {
    if (photos.length >= MAX_PHOTOS) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setPhotos(prev => [...prev, { uri: asset.uri, mimeType: asset.mimeType || 'image/jpeg' }]);
    }
  }

  function removePhoto(index: number) {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  }

  function makeMain(index: number) {
    if (index === 0) return;
    setPhotos(prev => {
      const updated = [...prev];
      const [chosen] = updated.splice(index, 1);
      updated.unshift(chosen);
      return updated;
    });
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

    try {
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const response = await fetch(photo.uri);
        const arraybuffer = await response.arrayBuffer();
        const fileExt = photo.mimeType.split('/')[1]?.toLowerCase() || 'jpg';
        const fileName = `${dogId}/${Date.now()}_${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('dog-photos')
          .upload(fileName, arraybuffer, { contentType: photo.mimeType });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('dog-photos').getPublicUrl(fileName);

        await supabase.from('dog_photos').insert({
          dog_id: dogId,
          url: publicUrlData.publicUrl,
          position: i,
        });
      }

      setUploading(false);
      router.push('/home');
    } catch (err: any) {
      setError('Fotoğraf yüklenemedi: ' + (err?.message || 'Bilinmeyen hata'));
      setUploading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Fotoğraflar 📸</Text>
      <Text style={styles.subtitle}>En az {MIN_PHOTOS}, en fazla {MAX_PHOTOS} fotoğraf ekleyin</Text>
      <Text style={styles.hint}>Bir fotoğrafa dokunarak "Ana" yapabilir, çöp kutusu ikonuyla silebilirsin.</Text>

      <View style={styles.grid}>
        {photos.map((photo, i) => (
          <View key={photo.uri + i} style={styles.photoSlot}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => makeMain(i)} activeOpacity={0.85}>
              <Image source={{ uri: photo.uri }} style={styles.photo} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={() => removePhoto(i)}>
              <Trash2 size={12} color="white" />
            </TouchableOpacity>
            {i === 0 && (
              <View style={styles.mainBadge}>
                <Text style={styles.mainBadgeText}>ANA</Text>
              </View>
            )}
          </View>
        ))}
        {photos.length < MAX_PHOTOS && (
          <TouchableOpacity style={styles.addSlot} onPress={pickImage}>
            <Plus size={26} color="#FB923C" strokeWidth={3} />
          </TouchableOpacity>
        )}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity style={[styles.button, styles.buttonRow]} onPress={handleFinish} disabled={uploading}>
        {uploading ? (
          <Text style={styles.buttonText}>Yükleniyor...</Text>
        ) : (
          <>
            <Text style={styles.buttonText}>Tamamla</Text>
            <PartyPopper size={18} color="white" />
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 60, backgroundColor: '#FFF7ED', flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '800', color: '#431407', marginTop: 16, fontFamily: 'Fredoka_700Bold' },
  subtitle: { fontSize: 14, color: '#9A6B4B', marginTop: 4 },
  hint: { fontSize: 12, color: '#B9977C', marginTop: 6, marginBottom: 24, lineHeight: 17 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoSlot: { width: 75, height: 75, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  photo: { width: '100%', height: '100%' },
  deleteButton: {
    position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  mainBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(251,146,60,0.9)', paddingVertical: 2 },
  mainBadgeText: { color: 'white', fontSize: 9, fontWeight: '800', textAlign: 'center' },
  addSlot: {
    width: 75, height: 75, borderRadius: 16, borderWidth: 2, borderColor: '#FED7AA',
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFEDD5',
  },
  errorText: { color: '#DC2626', fontSize: 13, marginTop: 16 },
  button: {
    backgroundColor: '#FB923C', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 24,
  },
  buttonRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '800' },
});