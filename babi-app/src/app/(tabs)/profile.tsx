import { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { supabase } from '../../../lib/supabase';

type DogPhoto = { id: string; url: string; position?: number };

export default function Profile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [dogId, setDogId] = useState<string | null>(null);
  const [dogName, setDogName] = useState('');
  const [dogBreed, setDogBreed] = useState('');
  const [dogAge, setDogAge] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [dogPhotos, setDogPhotos] = useState<DogPhoto[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [reordering, setReordering] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [bio, setBio] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [snapchat, setSnapchat] = useState('');

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
      .select('full_name, bio, instagram, facebook, twitter, tiktok, snapchat, avatar_url')
      .eq('id', userId)
      .single();

    if (profile) {
      setFullName(profile.full_name || '');
      setBio(profile.bio || '');
      setInstagram(profile.instagram || '');
      setFacebook(profile.facebook || '');
      setTwitter(profile.twitter || '');
      setTiktok(profile.tiktok || '');
      setSnapchat(profile.snapchat || '');
      setAvatarUrl(profile.avatar_url || null);
    }

    const { data: dogs } = await supabase
      .from('dogs')
      .select('id, name, breed, age, dog_photos(id, url, position)')
      .eq('owner_id', userId)
      .limit(1);

    if (dogs && dogs.length > 0) {
      const dog = dogs[0];
      setDogId(dog.id);
      setDogName(dog.name);
      setDogBreed(dog.breed);
      setDogAge(dog.age);
      const photos = ((dog as any).dog_photos || []) as DogPhoto[];
      photos.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      setDogPhotos(photos);
      setPhotoUrl(photos[0]?.url || null);
    }

    setLoading(false);
  }

  // ---------- SAHİP (AVATAR) FOTOĞRAFI ----------

  async function pickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Fotoğraf seçebilmek için galeri erişim izni vermen gerekiyor.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.[0]) return;

    setAvatarUploading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setAvatarUploading(false);
      return;
    }

    try {
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const arraybuffer = await response.arrayBuffer();
      const mimeType = asset.mimeType || 'image/jpeg';
      const fileExt = mimeType.split('/')[1]?.toLowerCase() || 'jpg';
      const filePath = `avatars/${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('dog-photos')
        .upload(filePath, arraybuffer, { contentType: mimeType });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('dog-photos').getPublicUrl(filePath);
      const newUrl = publicUrlData.publicUrl;

      await supabase.from('profiles').update({ avatar_url: newUrl }).eq('id', userId);
      setAvatarUrl(newUrl);
    } catch (err) {
      Alert.alert('Hata', 'Fotoğraf yüklenemedi, tekrar dene.');
    } finally {
      setAvatarUploading(false);
    }
  }

  function confirmRemoveAvatar() {
    Alert.alert(
      'Fotoğrafı Kaldır',
      'Profil fotoğrafını kaldırmak istediğine emin misin?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Kaldır', style: 'destructive', onPress: removeAvatar },
      ]
    );
  }

  async function removeAvatar() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);
    setAvatarUrl(null);
  }

  // ---------- KÖPEK FOTOĞRAFLARI ----------

  async function pickDogPhoto() {
    if (!dogId) return;
    if (dogPhotos.length >= 8) {
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
      aspect: [1, 1],
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
      const filePath = `dogs/${dogId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('dog-photos')
        .upload(filePath, arraybuffer, { contentType: mimeType });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('dog-photos').getPublicUrl(filePath);
      const newUrl = publicUrlData.publicUrl;

      const { data: inserted, error: insertError } = await supabase
        .from('dog_photos')
        .insert({ dog_id: dogId, url: newUrl, position: dogPhotos.length })
        .select()
        .single();
      if (insertError) throw insertError;

      const updated = [...dogPhotos, { id: inserted.id, url: newUrl, position: dogPhotos.length }];
      setDogPhotos(updated);
      if (!photoUrl) setPhotoUrl(newUrl);
    } catch (err) {
      Alert.alert('Hata', 'Fotoğraf yüklenemedi, tekrar dene.');
    } finally {
      setPhotoUploading(false);
    }
  }

  function confirmDeletePhoto(photoId: string) {
    if (dogPhotos.length <= 2) {
      Alert.alert('İşlem Yapılamıyor', 'En az 2 fotoğraf bulundurman gerekiyor. Önce yeni bir tane ekleyip sonra silebilirsin.');
      return;
    }
    Alert.alert(
      'Fotoğrafı Sil',
      'Bu fotoğrafı silmek istediğine emin misin?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => deletePhoto(photoId) },
      ]
    );
  }

  async function deletePhoto(photoId: string) {
    const { error } = await supabase.from('dog_photos').delete().eq('id', photoId);
    if (error) {
      Alert.alert('Hata', 'Fotoğraf silinemedi, tekrar dene.');
      return;
    }
    const updated = dogPhotos.filter(p => p.id !== photoId);
    setDogPhotos(updated);
    if (photoUrl && !updated.find(p => p.url === photoUrl)) {
      setPhotoUrl(updated[0]?.url || null);
    }
  }

  async function handleDragEnd({ data }: { data: DogPhoto[] }) {
    setDogPhotos(data);
    setPhotoUrl(data[0]?.url || null);
    setReordering(true);
    try {
      await Promise.all(
        data.map((photo, index) =>
          supabase.from('dog_photos').update({ position: index }).eq('id', photo.id)
        )
      );
    } catch (err) {
      Alert.alert('Hata', 'Sıralama kaydedilemedi, tekrar dene.');
    } finally {
      setReordering(false);
    }
  }

  function renderReorderItem({ item, drag, isActive, getIndex }: RenderItemParams<DogPhoto>) {
    const index = getIndex() ?? 0;
    return (
      <TouchableOpacity
        style={[styles.reorderRow, isActive && styles.reorderRowActive]}
        onLongPress={drag}
        delayLongPress={150}
        disabled={reordering}
      >
        <Image source={{ uri: item.url }} style={styles.reorderThumb} />
        <View style={styles.reorderTextWrap}>
          <Text style={styles.reorderIndex}>{index + 1}. Fotoğraf</Text>
          {index === 0 ? <Text style={styles.reorderMainBadge}>Ana Foto</Text> : null}
        </View>
        <Text style={styles.reorderHandle}>☰</Text>
      </TouchableOpacity>
    );
  }

  // ---------- PROFİL (BİO / SOSYAL MEDYA) ----------

  async function handleSave() {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    await supabase
      .from('profiles')
      .update({ bio, instagram, facebook, twitter, tiktok, snapchat })
      .eq('id', userId);

    setSaving(false);
    setEditing(false);
  }

  function goToCreateBusiness() {
    router.push('/business/create');
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
      <View style={styles.heroWrap}>
        <TouchableOpacity onPress={() => setGalleryVisible(true)} activeOpacity={0.9}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.heroPhoto} />
          ) : (
            <View style={[styles.heroPhoto, styles.noPhoto]}>
              <Text>📷</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.heroAddButton} onPress={pickDogPhoto} disabled={photoUploading}>
          {photoUploading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.heroAddButtonText}>+</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.dogName}>{dogName}{dogAge ? `, ${dogAge}` : ''}</Text>
      <Text style={styles.dogBreed}>{dogBreed}</Text>

      <View style={styles.ownerCard}>
        <View style={styles.ownerRow}>
          <TouchableOpacity onPress={pickAvatar} disabled={avatarUploading}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.ownerAvatar} />
            ) : (
              <View style={[styles.ownerAvatar, styles.noOwnerAvatar]}>
                {avatarUploading ? (
                  <ActivityIndicator size="small" color="#FB923C" />
                ) : (
                  <Text style={styles.ownerAvatarPlus}>+</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.ownerTextWrap}>
            <Text style={styles.ownerLabel}>SAHİBİ</Text>
            <Text style={styles.ownerName}>{fullName}</Text>
          </View>
        </View>

        <View style={styles.avatarActions}>
          <TouchableOpacity onPress={pickAvatar} disabled={avatarUploading}>
            <Text style={styles.avatarActionText}>
              {avatarUploading ? 'Yükleniyor...' : avatarUrl ? 'Fotoğrafı Değiştir' : 'Fotoğraf Ekle'}
            </Text>
          </TouchableOpacity>
          {avatarUrl ? (
            <TouchableOpacity onPress={confirmRemoveAvatar} disabled={avatarUploading}>
              <Text style={styles.avatarRemoveText}>Kaldır</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {!editing ? (
        <>
          {bio ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>BİYOGRAFİ</Text>
              <Text style={styles.bioText}>{bio}</Text>
            </View>
          ) : null}

          {(instagram || facebook || twitter || tiktok || snapchat) ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>SOSYAL MEDYA</Text>
              <View style={styles.socialRow}>
                {instagram ? <Text style={styles.socialTag}>📷 {instagram}</Text> : null}
                {facebook ? <Text style={styles.socialTag}>👤 {facebook}</Text> : null}
                {twitter ? <Text style={styles.socialTag}>🐦 {twitter}</Text> : null}
                {tiktok ? <Text style={styles.socialTag}>🎵 {tiktok}</Text> : null}
                {snapchat ? <Text style={styles.socialTag}>👻 {snapchat}</Text> : null}
              </View>
            </View>
          ) : null}

          <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
            <Text style={styles.editButtonText}>Profili Düzenle</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.editForm}>
          <Text style={styles.fieldLabel}>BİYOGRAFİ</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="Kendinden ve köpeğinden bahset..."
            multiline
          />

          <Text style={styles.fieldLabel}>INSTAGRAM</Text>
          <TextInput style={styles.input} value={instagram} onChangeText={setInstagram} placeholder="@kullaniciadi" autoCapitalize="none" />

          <Text style={styles.fieldLabel}>FACEBOOK</Text>
          <TextInput style={styles.input} value={facebook} onChangeText={setFacebook} placeholder="kullaniciadi" autoCapitalize="none" />

          <Text style={styles.fieldLabel}>TWITTER / X</Text>
          <TextInput style={styles.input} value={twitter} onChangeText={setTwitter} placeholder="@kullaniciadi" autoCapitalize="none" />

          <Text style={styles.fieldLabel}>TIKTOK</Text>
          <TextInput style={styles.input} value={tiktok} onChangeText={setTiktok} placeholder="@kullaniciadi" autoCapitalize="none" />

          <Text style={styles.fieldLabel}>SNAPCHAT</Text>
          <TextInput style={styles.input} value={snapchat} onChangeText={setSnapchat} placeholder="kullaniciadi" autoCapitalize="none" />

          <View style={styles.editActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setEditing(false)}>
              <Text style={styles.cancelButtonText}>Vazgeç</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveButtonText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.businessLinkButton} onPress={goToCreateBusiness}>
        <Text style={styles.businessLinkText}>🏢 İşletme Profili Ekle</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>

      <Modal
        visible={galleryVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setGalleryVisible(false);
          setReorderMode(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{dogName} Fotoğrafları</Text>
              <View style={styles.modalHeaderActions}>
                <TouchableOpacity onPress={() => setReorderMode(prev => !prev)}>
                  <Text style={styles.modalReorderToggle}>{reorderMode ? 'Bitti' : 'Sırala'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setGalleryVisible(false); setReorderMode(false); }}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {reorderMode ? (
              <>
                <Text style={styles.reorderHint}>
                  Bir fotoğrafa basılı tutup sürükleyerek sırasını değiştir. İlk sıradaki, ana fotoğrafın olur.
                </Text>
                <DraggableFlatList
                  data={dogPhotos}
                  keyExtractor={item => item.id}
                  renderItem={renderReorderItem}
                  onDragEnd={handleDragEnd}
                  style={styles.reorderList}
                />
                {reordering ? (
                  <ActivityIndicator size="small" color="#FB923C" style={{ marginTop: 8 }} />
                ) : null}
              </>
            ) : (
              <>
                <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                  {dogPhotos.map(photo => (
                    <View key={photo.id} style={styles.galleryPage}>
                      <Image source={{ uri: photo.url }} style={styles.galleryFullImage} />
                      <TouchableOpacity
                        style={styles.galleryDeleteButton}
                        onPress={() => confirmDeletePhoto(photo.id)}
                      >
                        <Text style={styles.galleryDeleteIcon}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {dogPhotos.length < 8 ? (
                    <TouchableOpacity
                      style={[styles.galleryPage, styles.galleryAddPage]}
                      onPress={pickDogPhoto}
                      disabled={photoUploading}
                    >
                      {photoUploading ? (
                        <ActivityIndicator color="#FB923C" />
                      ) : (
                        <Text style={styles.galleryAddText}>+ Fotoğraf{'\n'}Ekle</Text>
                      )}
                    </TouchableOpacity>
                  ) : null}
                </ScrollView>

                <Text style={styles.galleryHint}>
                  {dogPhotos.length} / 8 fotoğraf{dogPhotos.length <= 2 ? ' · en az 2 fotoğraf gerekli' : ''}
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 60, backgroundColor: '#FFF7ED', flexGrow: 1, alignItems: 'center' },
  centerContainer: { flex: 1, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' },
  heroWrap: { position: 'relative', marginBottom: 16 },
  heroPhoto: { width: 140, height: 140, borderRadius: 70 },
  noPhoto: { backgroundColor: '#FFEDD5', alignItems: 'center', justifyContent: 'center' },
  heroAddButton: {
    position: 'absolute', bottom: 2, right: 2, width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FB923C', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFF7ED',
  },
  heroAddButtonText: { color: 'white', fontSize: 20, fontWeight: '900', marginTop: -2 },
  dogName: { fontSize: 22, fontWeight: '900', color: '#431407' },
  dogBreed: { fontSize: 14, color: '#9A6B4B', marginTop: 4, marginBottom: 20 },
  ownerCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, width: '100%', maxWidth: 320 },
  ownerRow: { flexDirection: 'row', alignItems: 'center' },
  ownerAvatar: { width: 48, height: 48, borderRadius: 24 },
  noOwnerAvatar: { backgroundColor: '#FFEDD5', alignItems: 'center', justifyContent: 'center' },
  ownerAvatarPlus: { fontSize: 20, color: '#FB923C', fontWeight: '800' },
  ownerTextWrap: { marginLeft: 12, flex: 1 },
  ownerLabel: { fontSize: 10, fontWeight: '800', color: '#9A6B4B', letterSpacing: 1 },
  ownerName: { fontSize: 16, fontWeight: '700', color: '#431407', marginTop: 4 },
  avatarActions: { flexDirection: 'row', gap: 16, marginTop: 12 },
  avatarActionText: { color: '#FB923C', fontWeight: '800', fontSize: 12 },
  avatarRemoveText: { color: '#DC2626', fontWeight: '800', fontSize: 12 },
  section: { width: '100%', maxWidth: 320, marginTop: 16 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: '#9A6B4B', letterSpacing: 1, marginBottom: 8 },
  bioText: { fontSize: 13, color: '#5C4033', lineHeight: 20, backgroundColor: 'white', borderRadius: 12, padding: 12 },
  socialRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  socialTag: { backgroundColor: 'white', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, color: '#431407' },
  editButton: { marginTop: 24, backgroundColor: '#FB923C', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 28 },
  editButtonText: { color: 'white', fontWeight: '800', fontSize: 13 },
  editForm: { width: '100%', maxWidth: 320, marginTop: 16 },
  fieldLabel: { fontSize: 10, fontWeight: '800', color: '#9A6B4B', letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#FED7AA', paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: '#431407' },
  bioInput: { minHeight: 70, textAlignVertical: 'top' },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelButton: { flex: 1, borderWidth: 2, borderColor: '#FED7AA', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  cancelButtonText: { color: '#9A6B4B', fontWeight: '800', fontSize: 13 },
  saveButton: { flex: 1, backgroundColor: '#FB923C', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  saveButtonText: { color: 'white', fontWeight: '800', fontSize: 13 },
  businessLinkButton: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 20 },
  businessLinkText: { color: '#9A6B4B', fontWeight: '700', fontSize: 13 },
  logoutButton: { marginTop: 4, paddingVertical: 12, paddingHorizontal: 32 },
  logoutText: { color: '#DC2626', fontWeight: '800', fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF7ED', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#431407' },
  modalHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  modalReorderToggle: { color: '#FB923C', fontWeight: '800', fontSize: 13 },
  modalClose: { fontSize: 20, color: '#9A6B4B', padding: 4 },
  galleryPage: { width: 280, height: 280, borderRadius: 20, overflow: 'hidden', marginRight: 12, position: 'relative' },
  galleryFullImage: { width: '100%', height: '100%' },
  galleryDeleteButton: {
    position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  galleryDeleteIcon: { fontSize: 16 },
  galleryAddPage: {
    backgroundColor: '#FFEDD5', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FED7AA', borderStyle: 'dashed',
  },
  galleryAddText: { color: '#FB923C', fontWeight: '800', fontSize: 14, textAlign: 'center' },
  galleryHint: { fontSize: 11, color: '#9A6B4B', marginTop: 12, textAlign: 'center' },

  reorderHint: { fontSize: 12, color: '#9A6B4B', marginBottom: 12, lineHeight: 18 },
  reorderList: { maxHeight: 360 },
  reorderRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    borderRadius: 14, padding: 10, marginBottom: 8,
  },
  reorderRowActive: { backgroundColor: '#FFEDD5', opacity: 0.9 },
  reorderThumb: { width: 50, height: 50, borderRadius: 10 },
  reorderTextWrap: { marginLeft: 12, flex: 1 },
  reorderIndex: { fontSize: 13, fontWeight: '700', color: '#431407' },
  reorderMainBadge: { fontSize: 10, fontWeight: '800', color: '#FB923C', marginTop: 2 },
  reorderHandle: { fontSize: 20, color: '#9A6B4B', paddingHorizontal: 8 },
});