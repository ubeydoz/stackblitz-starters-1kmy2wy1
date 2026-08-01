import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../lib/supabase';

const BUSINESS_TYPES = [
  { key: 'otel', label: '🏨 Köpek Oteli' },
  { key: 'timar_bakim', label: '✂️ Pet Kuaför' }, 
  { key: 'gezdirme', label: '🐕 Köpek Gezdirme' },
] as const;

type BusinessPhoto = { id: string; url: string };

export default function CreateBusiness() {
  const router = useRouter();

  const [businessType, setBusinessType] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<BusinessPhoto[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);

  async function useCurrentLocation() {
    setLocationLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Konum kullanmak için izin vermen gerekiyor.');
      setLocationLoading(false);
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    setLocationCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    setLocationLoading(false);
  }

  async function handleCreate() {
    setError('');

    if (!businessType) {
      setError('İşletme türünü seçin.');
      return;
    }
    if (!businessName.trim()) {
      setError('İşletme adını girin.');
      return;
    }
    if (!locationCoords) {
      setError('Konumunuzu ekleyin (müşterilerin sizi bulabilmesi için gerekli).');
      return;
    }

    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setError('Oturum bulunamadı, tekrar giriş yapın.');
      setSaving(false);
      return;
    }

    const { data: inserted, error: insertError } = await supabase
      .from('business_profiles')
      .insert({
        owner_id: userId,
        business_type: businessType,
        business_name: businessName.trim(),
        description: description.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        location: `POINT(${locationCoords.lng} ${locationCoords.lat})`,
      })
      .select()
      .single();

    setSaving(false);

    if (insertError || !inserted) {
      setError('Kaydedilemedi: ' + (insertError?.message || 'Bilinmeyen hata'));
      return;
    }

    setBusinessId(inserted.id);
  }

  async function pickBusinessPhoto() {
    if (!businessId) return;
    if (photos.length >= 8) {
      Alert.alert('Sınır Doldu', 'En fazla 8 fotoğraf ekleyebilirsin.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Fotoğraf seçebilmek için galeri erişim izni vermen gerekiyor.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.[0]) return;

    setPhotoUploading(true);
    try {
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const arraybuffer = await response.arrayBuffer();
      const mimeType = asset.mimeType || 'image/jpeg';
      const fileExt = mimeType.split('/')[1]?.toLowerCase() || 'jpg';
      const filePath = `businesses/${businessId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('dog-photos')
        .upload(filePath, arraybuffer, { contentType: mimeType });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('dog-photos').getPublicUrl(filePath);
      const newUrl = publicUrlData.publicUrl;

      const { data: photoInserted, error: photoInsertError } = await supabase
        .from('business_photos')
        .insert({ business_id: businessId, url: newUrl, position: photos.length })
        .select()
        .single();
      if (photoInsertError) throw photoInsertError;

      setPhotos(prev => [...prev, { id: photoInserted.id, url: newUrl }]);
    } catch (err) {
      Alert.alert('Hata', 'Fotoğraf yüklenemedi, tekrar dene.');
    } finally {
      setPhotoUploading(false);
    }
  }

  function finish() {
    router.replace('/(tabs)/profile');
  }

  if (businessId) {
    // İşletme oluşturuldu, şimdi fotoğraf ekleme aşaması
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Neredeyse Tamam! 🎉</Text>
        <Text style={styles.subtitle}>
          {businessName} başarıyla oluşturuldu. İstersen birkaç fotoğraf ekleyerek profilini güçlendir.
        </Text>

        <View style={styles.photoGrid}>
          {photos.map(p => (
            <Image key={p.id} source={{ uri: p.url }} style={styles.photoThumb} />
          ))}
          {photos.length < 8 ? (
            <TouchableOpacity style={styles.addPhotoBox} onPress={pickBusinessPhoto} disabled={photoUploading}>
              {photoUploading ? (
                <ActivityIndicator color="#FB923C" />
              ) : (
                <Text style={styles.addPhotoText}>+ Ekle</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity style={styles.button} onPress={finish}>
          <Text style={styles.buttonText}>Tamamla ve Profile Dön</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>İşletme Profili 🏢</Text>
      <Text style={styles.subtitle}>Hizmetini köpek sahipleriyle buluştur</Text>

      <Text style={styles.label}>İŞLETME TÜRÜ</Text>
      <View style={styles.chipRow}>
        {BUSINESS_TYPES.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.chip, businessType === t.key && styles.chipActive]}
            onPress={() => setBusinessType(t.key)}
          >
            <Text style={[styles.chipText, businessType === t.key && styles.chipTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>İŞLETME ADI</Text>
      <TextInput style={styles.input} value={businessName} onChangeText={setBusinessName} placeholder="Örn: Patili Dostlar Bakım Evi" />

      <Text style={styles.label}>AÇIKLAMA</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Hizmetlerini kısaca anlat..."
        multiline
      />

      <Text style={styles.label}>TELEFON</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="05XX XXX XX XX" keyboardType="phone-pad" />

      <Text style={styles.label}>ADRES</Text>
      <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Mahalle, cadde, ilçe..." />

      <Text style={styles.label}>KONUM</Text>
      <TouchableOpacity style={styles.locationButton} onPress={useCurrentLocation} disabled={locationLoading}>
        {locationLoading ? (
          <ActivityIndicator color="#FB923C" />
        ) : (
          <Text style={styles.locationButtonText}>
            {locationCoords ? '📍 Konum Eklendi ✓ (Değiştir)' : '📍 Mevcut Konumu Kullan'}
          </Text>
        )}
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Kaydediliyor...' : 'İşletmeyi Oluştur →'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#FFF7ED', flexGrow: 1, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: '800', color: '#431407' },
  subtitle: { fontSize: 14, color: '#9A6B4B', marginTop: 4, marginBottom: 24, lineHeight: 20 },
  label: { fontSize: 10, fontWeight: '800', color: '#9A6B4B', letterSpacing: 1, marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#FED7AA',
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: '#431407',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
    borderColor: '#FED7AA', backgroundColor: 'white',
  },
  chipActive: { backgroundColor: '#FB923C', borderColor: '#FB923C' },
  chipText: { fontSize: 13, fontWeight: '700', color: '#9A6B4B' },
  chipTextActive: { color: 'white' },
  locationButton: {
    backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#FED7AA',
    paddingVertical: 14, alignItems: 'center',
  },
  locationButtonText: { fontSize: 13, fontWeight: '700', color: '#FB923C' },
  errorText: { color: '#DC2626', fontSize: 13, marginTop: 16 },
  button: {
    backgroundColor: '#FB923C', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 24,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '800' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  photoThumb: { width: 90, height: 90, borderRadius: 14 },
  addPhotoBox: {
    width: 90, height: 90, borderRadius: 14, backgroundColor: '#FFEDD5',
    borderWidth: 2, borderColor: '#FED7AA', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  addPhotoText: { color: '#FB923C', fontWeight: '800', fontSize: 12 },
});