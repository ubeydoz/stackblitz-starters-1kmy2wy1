import { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';

export default function Profile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [dogName, setDogName] = useState('');
  const [dogBreed, setDogBreed] = useState('');
  const [dogAge, setDogAge] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

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
      .select('full_name, bio, instagram, facebook, twitter, tiktok, snapchat')
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
    }

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

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 60, backgroundColor: '#FFF7ED', flexGrow: 1, alignItems: 'center' },
  centerContainer: { flex: 1, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' },
  heroPhoto: { width: 140, height: 140, borderRadius: 70, marginBottom: 16 },
  noPhoto: { backgroundColor: '#FFEDD5', alignItems: 'center', justifyContent: 'center' },
  dogName: { fontSize: 22, fontWeight: '900', color: '#431407' },
  dogBreed: { fontSize: 14, color: '#9A6B4B', marginTop: 4, marginBottom: 20 },
  ownerCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, width: '100%', maxWidth: 320 },
  ownerLabel: { fontSize: 10, fontWeight: '800', color: '#9A6B4B', letterSpacing: 1 },
  ownerName: { fontSize: 16, fontWeight: '700', color: '#431407', marginTop: 4 },
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
  logoutButton: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 32 },
  logoutText: { color: '#DC2626', fontWeight: '800', fontSize: 14 },
});