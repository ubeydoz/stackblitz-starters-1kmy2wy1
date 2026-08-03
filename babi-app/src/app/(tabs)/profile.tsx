import { useCallback, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { ImageOff, Plus, X, Star, GripVertical, Trash2, Building2, Pencil } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';

const TEAL = '#0891A6';
const TEAL_DARK = '#066670';
const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
};

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
  const [settingMain, setSettingMain] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [bestPhotoId, setBestPhotoId] = useState<string | null>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [bio, setBio] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [snapchat, setSnapchat] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

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

      await loadBestPhoto(dog.id);
    }

    setLoading(false);
  }

  async function loadBestPhoto(dogIdParam: string) {
    const { data: likeRows } = await supabase
      .from('swipes')
      .select('shown_photo_id')
      .eq('target_dog_id', dogIdParam)
      .eq('action', 'like')
      .not('shown_photo_id', 'is', null);

    if (!likeRows || likeRows.length === 0) {
      setBestPhotoId(null);
      return;
    }

    const counts: Record<string, number> = {};
    likeRows.forEach(row => {
      const id = row.shown_photo_id as string;
      counts[id] = (counts[id] || 0) + 1;
    });

    let topId: string | null = null;
    let topCount = 0;
    Object.entries(counts).forEach(([id, count]) => {
      if (count > topCount) {
        topCount = count;
        topId = id;
      }
    });

    setBestPhotoId(topId);
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
    if (avatarUrl) {
      const path = avatarUrl.split('/dog-photos/')[1];
      if (path) await supabase.storage.from('dog-photos').remove([path]);
    }
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
    const photo = dogPhotos.find(p => p.id === photoId);
    const { error } = await supabase.from('dog_photos').delete().eq('id', photoId);
    if (error) {
      Alert.alert('Hata', 'Fotoğraf silinemedi, tekrar dene.');
      return;
    }
    if (photo) {
      const path = photo.url.split('/dog-photos/')[1];
      if (path) await supabase.storage.from('dog-photos').remove([path]);
    }
    const updated = dogPhotos.filter(p => p.id !== photoId);
    setDogPhotos(updated);
    if (photoUrl && !updated.find(p => p.url === photoUrl)) {
      setPhotoUrl(updated[0]?.url || null);
    }
    if (bestPhotoId === photoId) {
      setBestPhotoId(null);
    }
  }

  async function setMainPhoto(photoId: string) {
    const target = dogPhotos.find(p => p.id === photoId);
    if (!target || dogPhotos[0]?.id === photoId) return;

    const reordered = [target, ...dogPhotos.filter(p => p.id !== photoId)];
    setDogPhotos(reordered);
    setPhotoUrl(reordered[0]?.url || null);
    setSettingMain(true);
    try {
      await Promise.all(
        reordered.map((photo, index) =>
          supabase.from('dog_photos').update({ position: index }).eq('id', photo.id)
        )
      );
    } catch (err) {
      Alert.alert('Hata', 'Ana fotoğraf ayarlanamadı, tekrar dene.');
    } finally {
      setSettingMain(false);
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
          <View style={styles.reorderBadgeRow}>
            {index === 0 ? <Text style={styles.reorderMainBadge}>Ana Foto</Text> : null}
            {item.id === bestPhotoId ? (
              <View style={styles.reorderBestBadgeRow}>
                <Star size={11} color={TEAL_DARK} fill={TEAL_DARK} />
                <Text style={styles.reorderBestBadge}>En Beğenilen</Text>
              </View>
            ) : null}
          </View>
        </View>
        <GripVertical size={20} color="#9A6B4B" />
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

  function goToManageBusiness() {
    router.push('/business/manage');
  }

  async function handleLogout() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (userId) {
      await supabase.from('profiles').update({ push_token: null, notification_enabled: false }).eq('id', userId);
    }
    await supabase.auth.signOut();
    router.replace('/');
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Hesabını Sil',
      'Bu işlem geri alınamaz. Köpeğin, fotoğrafların, mesajların, eşleşmelerin ve varsa işletme profillerin kalıcı olarak silinecek.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Devam Et', style: 'destructive', onPress: confirmDeleteAccountFinal },
      ]
    );
  }

  function confirmDeleteAccountFinal() {
    Alert.alert(
      'Son Kez Soruyoruz',
      'Hesabını ve tüm verilerini kalıcı olarak silmek istediğine emin misin? Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Evet, Hesabımı Sil', style: 'destructive', onPress: deleteAccount },
      ]
    );
  }

  async function deleteAccount() {
    setDeletingAccount(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        setDeletingAccount(false);
        return;
      }

      const pathsToRemove: string[] = [];
      if (avatarUrl) {
        const path = avatarUrl.split('/dog-photos/')[1];
        if (path) pathsToRemove.push(path);
      }
      dogPhotos.forEach(photo => {
        const path = photo.url.split('/dog-photos/')[1];
        if (path) pathsToRemove.push(path);
      });

      const { data: businesses } = await supabase
        .from('business_profiles')
        .select('id, business_photos(url)')
        .eq('owner_id', userId);
      (businesses || []).forEach((b: any) => {
        (b.business_photos || []).forEach((bp: any) => {
          const path = bp.url.split('/dog-photos/')[1];
          if (path) pathsToRemove.push(path);
        });
      });

      if (pathsToRemove.length > 0) {
        await supabase.storage.from('dog-photos').remove(pathsToRemove);
      }

      const { error: rpcError } = await supabase.rpc('delete_own_account');
      if (rpcError) {
        Alert.alert('Hata', 'Hesap silinemedi: ' + rpcError.message);
        setDeletingAccount(false);
        return;
      }

      await supabase.auth.signOut();
      router.replace('/');
    } catch (err) {
      Alert.alert('Hata', 'Hesap silinirken bir sorun oluştu, tekrar dene.');
      setDeletingAccount(false);
    }
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
              <ImageOff size={28} color="#FB923C" />
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.heroAddButton} onPress={pickDogPhoto} disabled={photoUploading}>
          {photoUploading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Plus size={22} color="white" strokeWidth={3} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.dogNameRow}>
        <View>
          <Text style={styles.dogName}>{dogName}{dogAge ? `, ${dogAge}` : ''}</Text>
          <Text style={styles.dogBreed}>{dogBreed}</Text>
        </View>
        <TouchableOpacity style={styles.editDogButton} onPress={() => router.push('/dog/edit')}>
          <Pencil size={14} color="#FB923C" />
        </TouchableOpacity>
      </View>

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
                  <Plus size={18} color="#FB923C" strokeWidth={3} />
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

      <TouchableOpacity style={styles.businessLinkButtonRow} onPress={goToManageBusiness}>
        <Building2 size={14} color="#9A6B4B" />
        <Text style={styles.businessLinkText}>İşletmelerimi Yönet</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteAccountButton} onPress={confirmDeleteAccount} disabled={deletingAccount}>
        <Text style={styles.deleteAccountText}>{deletingAccount ? 'Siliniyor...' : 'Hesabımı Sil'}</Text>
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
                  <X size={20} color="#9A6B4B" />
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
                  {dogPhotos.map((photo, index) => (
                    <View key={photo.id} style={styles.galleryPage}>
                      <Image source={{ uri: photo.url }} style={styles.galleryFullImage} />
                      {index === 0 ? (
                        <View style={styles.mainPhotoBadge}>
                          <Text style={styles.mainPhotoBadgeText}>Ana Foto</Text>
                        </View>
                      ) : null}
                      {photo.id === bestPhotoId ? (
                        <View style={styles.bestPhotoBadge}>
                          <Star size={12} color="white" fill="white" />
                          <Text style={styles.bestPhotoBadgeText}>En Beğenilen</Text>
                        </View>
                      ) : null}
                      <TouchableOpacity
                        style={styles.galleryDeleteButton}
                        onPress={() => confirmDeletePhoto(photo.id)}
                      >
                        <Trash2 size={16} color="white" />
                      </TouchableOpacity>
                      {index !== 0 ? (
                        <TouchableOpacity
                          style={styles.galleryMainButton}
                          onPress={() => setMainPhoto(photo.id)}
                          disabled={settingMain}
                        >
                          {settingMain ? (
                            <ActivityIndicator size="small" color="white" />
                          ) : (
                            <Text style={styles.galleryMainButtonText}>Ana Foto Yap</Text>
                          )}
                        </TouchableOpacity>
                      ) : null}
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
                        <>
                          <Plus size={22} color="#FB923C" strokeWidth={3} />
                          <Text style={styles.galleryAddText}>Fotoğraf{'\n'}Ekle</Text>
                        </>
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
  container: { padding: 20, paddingTop: 96, backgroundColor: '#FFF7ED', flexGrow: 1, alignItems: 'center' },
  centerContainer: { flex: 1, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' },
  heroWrap: { position: 'relative', marginBottom: 16 },
  heroPhoto: { width: 140, height: 140, borderRadius: 70 },
  noPhoto: { backgroundColor: '#FFEDD5', alignItems: 'center', justifyContent: 'center' },
  heroAddButton: {
    position: 'absolute', bottom: 2, right: 2, width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FB923C', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFF7ED',
  },
  dogNameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  dogName: { fontSize: 22, fontWeight: '900', color: '#431407', fontFamily: 'Fredoka_700Bold' },
  dogBreed: { fontSize: 14, color: '#9A6B4B', marginTop: 4 },
  editDogButton: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: 'white',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FED7AA',
  },
  ownerCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, width: '100%', maxWidth: 320, ...CARD_SHADOW },
  ownerRow: { flexDirection: 'row', alignItems: 'center' },
  ownerAvatar: { width: 48, height: 48, borderRadius: 24 },
  noOwnerAvatar: { backgroundColor: '#FFEDD5', alignItems: 'center', justifyContent: 'center' },
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
  businessLinkButtonRow: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
  businessLinkText: { color: '#9A6B4B', fontWeight: '700', fontSize: 13 },
  logoutButton: { marginTop: 4, paddingVertical: 12, paddingHorizontal: 32 },
  logoutText: { color: '#DC2626', fontWeight: '800', fontSize: 14 },
  deleteAccountButton: { marginTop: 0, paddingVertical: 10, paddingHorizontal: 24 },
  deleteAccountText: { color: '#9A6B4B', fontWeight: '700', fontSize: 12, textDecorationLine: 'underline' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF7ED', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#431407' },
  modalHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  modalReorderToggle: { color: '#FB923C', fontWeight: '800', fontSize: 13 },
  galleryPage: { width: 280, height: 280, borderRadius: 20, overflow: 'hidden', marginRight: 12, position: 'relative' },
  galleryFullImage: { width: '100%', height: '100%' },
  galleryDeleteButton: {
    position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  galleryAddPage: {
    backgroundColor: '#FFEDD5', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FED7AA', borderStyle: 'dashed', gap: 6,
  },
  galleryAddText: { color: '#FB923C', fontWeight: '800', fontSize: 14, textAlign: 'center' },
  galleryHint: { fontSize: 11, color: '#9A6B4B', marginTop: 12, textAlign: 'center' },
  bestPhotoBadge: {
    position: 'absolute', top: 10, left: 10, backgroundColor: TEAL_DARK,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  bestPhotoBadgeText: { color: 'white', fontWeight: '800', fontSize: 11 },
  mainPhotoBadge: {
    position: 'absolute', top: 10, right: 54, backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
  },
  mainPhotoBadgeText: { color: 'white', fontWeight: '800', fontSize: 11 },
  galleryMainButton: {
    position: 'absolute', bottom: 10, left: 10, right: 10,
    backgroundColor: 'rgba(251,146,60,0.92)', borderRadius: 12,
    paddingVertical: 9, alignItems: 'center', justifyContent: 'center', minHeight: 34,
  },
  galleryMainButtonText: { color: 'white', fontWeight: '800', fontSize: 12 },

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
  reorderBadgeRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  reorderMainBadge: { fontSize: 10, fontWeight: '800', color: '#FB923C' },
  reorderBestBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  reorderBestBadge: { fontSize: 10, fontWeight: '800', color: TEAL_DARK },
});