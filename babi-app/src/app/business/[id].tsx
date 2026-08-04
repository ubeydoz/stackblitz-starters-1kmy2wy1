import { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, TextInput, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Building2, Scissors, Dog, Stethoscope, Trash2, Plus, ImageOff, Star, Phone, MapPin, LucideIcon } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import { COLORS, SHADOW } from '../../../lib/theme';

const TYPE_LABELS: Record<string, { label: string; Icon: LucideIcon }> = {
  otel: { label: 'Köpek Oteli', Icon: Building2 },
  timar_bakim: { label: 'Pet Kuaför', Icon: Scissors },
  gezdirme: { label: 'Köpek Gezdirme', Icon: Dog },
  veteriner: { label: 'Veteriner Kliniği', Icon: Stethoscope },
};

type BusinessPhoto = { id: string; url: string };
type Review = { id: string; rating: number; comment: string | null; reviewerName: string; createdAt: string };

export default function BusinessDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [businessType, setBusinessType] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [photos, setPhotos] = useState<BusinessPhoto[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id || null;
    setCurrentUserId(userId);

    const { data: business, error } = await supabase
      .from('business_profiles')
      .select('id, owner_id, business_type, business_name, description, phone, address, business_photos(id, url, position)')
      .eq('id', id)
      .single();

    if (error || !business) {
      Alert.alert('Hata', 'İşletme bulunamadı.');
      router.back();
      return;
    }

    setIsOwner(business.owner_id === userId);
    setBusinessType(business.business_type);
    setBusinessName(business.business_name);
    setDescription(business.description || '');
    setPhone(business.phone || '');
    setAddress(business.address || '');

    const sortedPhotos = ((business as any).business_photos || [])
      .slice()
      .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0));
    setPhotos(sortedPhotos);

    const { data: reviewRows } = await supabase
      .from('business_reviews')
      .select('id, rating, comment, created_at, reviewer_id, profiles(full_name)')
      .eq('business_id', id)
      .order('created_at', { ascending: false });

    const mappedReviews: Review[] = (reviewRows || []).map((r: any) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      reviewerName: r.profiles?.full_name || 'Kullanıcı',
      createdAt: r.created_at,
    }));
    setReviews(mappedReviews);

    if (userId) {
      const mine = (reviewRows || []).find((r: any) => r.reviewer_id === userId);
      if (mine) {
        setMyRating(mine.rating);
        setMyComment(mine.comment || '');
      }
    }

    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from('business_profiles')
      .update({
        business_name: businessName.trim(),
        description: description.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
      })
      .eq('id', id);
    setSaving(false);

    if (error) {
      Alert.alert('Hata', 'Kaydedilemedi: ' + error.message);
      return;
    }
    setEditing(false);
  }

  async function pickPhoto() {
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
      const filePath = `businesses/${id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('dog-photos')
        .upload(filePath, arraybuffer, { contentType: mimeType });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('dog-photos').getPublicUrl(filePath);
      const newUrl = publicUrlData.publicUrl;

      const { data: inserted, error: insertError } = await supabase
        .from('business_photos')
        .insert({ business_id: id, url: newUrl, position: photos.length })
        .select()
        .single();
      if (insertError) throw insertError;

      setPhotos(prev => [...prev, { id: inserted.id, url: newUrl }]);
    } catch (err) {
      Alert.alert('Hata', 'Fotoğraf yüklenemedi, tekrar dene.');
    } finally {
      setPhotoUploading(false);
    }
  }

  function confirmDeletePhoto(photoId: string) {
    Alert.alert('Fotoğrafı Sil', 'Bu fotoğrafı silmek istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deletePhoto(photoId) },
    ]);
  }

  async function deletePhoto(photoId: string) {
    const photo = photos.find(p => p.id === photoId);
    const { error } = await supabase.from('business_photos').delete().eq('id', photoId);
    if (error) {
      Alert.alert('Hata', 'Silinemedi, tekrar dene.');
      return;
    }
    if (photo) {
      const path = photo.url.split('/dog-photos/')[1];
      if (path) await supabase.storage.from('dog-photos').remove([path]);
    }
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  }

  async function submitReview() {
    if (myRating < 1) {
      Alert.alert('Puan Gerekli', 'En az 1 yıldız vermelisin.');
      return;
    }
    if (!currentUserId) return;

    setSubmittingReview(true);
    const { error } = await supabase.from('business_reviews').upsert(
      {
        business_id: id,
        reviewer_id: currentUserId,
        rating: myRating,
        comment: myComment.trim() || null,
      },
      { onConflict: 'business_id,reviewer_id' }
    );
    setSubmittingReview(false);

    if (error) {
      Alert.alert('Hata', 'Değerlendirme gönderilemedi: ' + error.message);
      return;
    }
    Alert.alert('Teşekkürler', 'Değerlendirmen kaydedildi.');
    load();
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.clay} />
      </View>
    );
  }

  const avgRating = reviews.length > 0 ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>‹ Geri</Text>
      </TouchableOpacity>

      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
        {photos.map(p => (
          <View key={p.id} style={styles.photoWrap}>
            <Image source={{ uri: p.url }} style={styles.photo} />
            {isOwner ? (
              <TouchableOpacity style={styles.photoDeleteButton} onPress={() => confirmDeletePhoto(p.id)}>
                <Trash2 size={15} color={COLORS.white} />
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
        {isOwner && photos.length < 8 ? (
          <TouchableOpacity style={[styles.photoWrap, styles.addPhotoWrap]} onPress={pickPhoto} disabled={photoUploading}>
            {photoUploading ? (
              <ActivityIndicator color={COLORS.clay} />
            ) : (
              <View style={styles.addPhotoRow}>
                <Plus size={18} color={COLORS.clay} strokeWidth={3} />
                <Text style={styles.addPhotoText}>Fotoğraf Ekle</Text>
              </View>
            )}
          </TouchableOpacity>
        ) : null}
        {photos.length === 0 && !isOwner ? (
          <View style={[styles.photoWrap, styles.addPhotoWrap]}>
            <ImageOff size={32} color={COLORS.clay} />
          </View>
        ) : null}
      </ScrollView>

      {!editing ? (
        <View style={styles.infoBlock}>
          <View style={styles.typeLabelRow}>
            {TYPE_LABELS[businessType] ? (
              <>
                {(() => { const TypeIcon = TYPE_LABELS[businessType].Icon; return <TypeIcon size={13} color={COLORS.clay} />; })()}
                <Text style={styles.typeLabel}>{TYPE_LABELS[businessType].label}</Text>
              </>
            ) : (
              <Text style={styles.typeLabel}>{businessType}</Text>
            )}
          </View>
          <Text style={styles.name}>{businessName}</Text>
          {reviews.length > 0 ? (
            <View style={styles.ratingSummaryRow}>
              <Star size={13} color={COLORS.moss} fill={COLORS.moss} />
              <Text style={styles.ratingSummaryMoss}>{avgRating.toFixed(1)} ({reviews.length} değerlendirme)</Text>
            </View>
          ) : (
            <Text style={styles.ratingSummary}>Henüz değerlendirme yok</Text>
          )}
          {description ? <Text style={styles.description}>{description}</Text> : null}
          {phone ? (
            <View style={styles.detailLineRow}>
              <Phone size={13} color={COLORS.body} />
              <Text style={styles.detailLine}>{phone}</Text>
            </View>
          ) : null}
          {address ? (
            <View style={styles.detailLineRow}>
              <MapPin size={13} color={COLORS.body} />
              <Text style={styles.detailLine}>{address}</Text>
            </View>
          ) : null}

          {isOwner ? (
            <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
              <Text style={styles.editButtonText}>Bilgileri Düzenle</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <View style={styles.editForm}>
          <Text style={styles.label}>İŞLETME ADI</Text>
          <TextInput style={styles.input} value={businessName} onChangeText={setBusinessName} />

          <Text style={styles.label}>AÇIKLAMA</Text>
          <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} multiline />

          <Text style={styles.label}>TELEFON</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

          <Text style={styles.label}>ADRES</Text>
          <TextInput style={styles.input} value={address} onChangeText={setAddress} />

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

      {!isOwner && currentUserId ? (
        <View style={styles.reviewForm}>
          <Text style={styles.sectionTitle}>Değerlendirme Yap</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map(n => (
              <TouchableOpacity key={n} onPress={() => setMyRating(n)}>
                <Star size={28} color={n <= myRating ? COLORS.moss : COLORS.border} fill={n <= myRating ? COLORS.moss : 'transparent'} />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={myComment}
            onChangeText={setMyComment}
            placeholder="Deneyimini paylaş (opsiyonel)..."
            multiline
          />
          <TouchableOpacity style={styles.submitReviewButton} onPress={submitReview} disabled={submittingReview}>
            <Text style={styles.submitReviewText}>{submittingReview ? 'Gönderiliyor...' : 'Gönder'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.reviewsList}>
        <Text style={styles.sectionTitle}>Yorumlar ({reviews.length})</Text>
        {reviews.length === 0 ? (
          <Text style={styles.noReviewsText}>Henüz yorum yapılmamış.</Text>
        ) : (
          reviews.map(r => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewerName}>{r.reviewerName}</Text>
                <View style={styles.reviewStarsRow}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} size={12} color={COLORS.moss} fill={n <= r.rating ? COLORS.moss : 'transparent'} />
                  ))}
                </View>
              </View>
              {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.cream, flexGrow: 1, paddingTop: 64, paddingBottom: 40 },
  centerContainer: { flex: 1, backgroundColor: COLORS.cream, alignItems: 'center', justifyContent: 'center' },
  backButton: { paddingHorizontal: 20, marginBottom: 8 },
  backButtonText: { color: COLORS.clay, fontWeight: '700', fontSize: 14 },
  photoScroll: { height: 220 },
  photoWrap: { width: 320, height: 220, marginHorizontal: 10, borderRadius: 20, overflow: 'hidden', position: 'relative' },
  photo: { width: '100%', height: '100%' },
  addPhotoWrap: {
    backgroundColor: COLORS.peach, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  addPhotoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addPhotoText: { color: COLORS.clay, fontWeight: '800' },
  photoDeleteButton: {
    position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  infoBlock: { paddingHorizontal: 20, marginTop: 16 },
  typeLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  typeLabel: { fontSize: 12, fontWeight: '800', color: COLORS.clay },
  name: { fontSize: 22, fontWeight: '900', color: COLORS.ink, marginTop: 4, fontFamily: 'Fredoka_700Bold' },
  ratingSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  ratingSummary: { fontSize: 13, color: COLORS.sand, marginTop: 6, fontWeight: '700' },
  ratingSummaryMoss: { fontSize: 13, color: COLORS.moss, fontWeight: '700' },
  description: { fontSize: 14, color: COLORS.body, marginTop: 12, lineHeight: 20 },
  detailLineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  detailLine: { fontSize: 13, color: COLORS.body },
  editButton: { marginTop: 16, backgroundColor: COLORS.clay, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  editButtonText: { color: COLORS.white, fontWeight: '800', fontSize: 13 },
  editForm: { paddingHorizontal: 20, marginTop: 16 },
  label: { fontSize: 10, fontWeight: '800', color: COLORS.sand, letterSpacing: 1, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: COLORS.white, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: COLORS.ink,
  },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelButton: { flex: 1, borderWidth: 2, borderColor: COLORS.border, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  cancelButtonText: { color: COLORS.sand, fontWeight: '800', fontSize: 13 },
  saveButton: { flex: 1, backgroundColor: COLORS.clay, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  saveButtonText: { color: COLORS.white, fontWeight: '800', fontSize: 13 },
  reviewForm: { paddingHorizontal: 20, marginTop: 24, backgroundColor: COLORS.white, marginHorizontal: 20, borderRadius: 16, padding: 16, ...SHADOW },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.ink, marginBottom: 10 },
  starRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  submitReviewButton: { backgroundColor: COLORS.clay, borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  submitReviewText: { color: COLORS.white, fontWeight: '800', fontSize: 13 },
  reviewsList: { paddingHorizontal: 20, marginTop: 24 },
  noReviewsText: { fontSize: 13, color: COLORS.sand },
  reviewCard: { backgroundColor: COLORS.white, borderRadius: 14, padding: 14, marginBottom: 10, ...SHADOW },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewerName: { fontSize: 13, fontWeight: '800', color: COLORS.ink },
  reviewStarsRow: { flexDirection: 'row', gap: 2 },
  reviewComment: { fontSize: 13, color: COLORS.body, marginTop: 8, lineHeight: 19 },
});