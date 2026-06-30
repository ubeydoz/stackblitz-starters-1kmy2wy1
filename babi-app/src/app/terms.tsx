import { ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function Terms() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backLink}>‹ Geri</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Kullanım Koşulları ve{'\n'}Gizlilik Politikası</Text>
      <Text style={styles.updated}>Son güncelleme: 30 Haziran 2026</Text>

      <Text style={styles.h2}>1. Üyelik Koşulları</Text>
      <Text style={styles.body}>
        Uygulamaya kayıt olabilmek için 18 yaşını doldurmuş olmanız gerekmektedir. Kayıt sırasında verdiğiniz bilgilerin doğru ve güncel olduğunu beyan edersiniz.
      </Text>

      <Text style={styles.h2}>2. Toplanan Veriler</Text>
      <Text style={styles.body}>
        Kimlik bilgileri (ad, soyad, doğum tarihi), iletişim bilgileri (e-posta, telefon), konum bilgileri, köpek fotoğrafları ve kullanım verileri, hizmetin sunulması amacıyla işlenir.
      </Text>

      <Text style={styles.h2}>3. Verilerin Paylaşımı</Text>
      <Text style={styles.body}>
        Kişisel verileriniz yalnızca hizmet sağlayıcılarımızla (bulut depolama, doğrulama altyapısı), yasal zorunluluk halinde yetkili kurumlarla veya açık rızanız ile anlaşmalı veterinerlerle paylaşılır. Verileriniz hiçbir koşulda pazarlama amacıyla satılmaz.
      </Text>

      <Text style={styles.h2}>4. Kullanıcı Haklarınız (KVKK)</Text>
      <Text style={styles.body}>
        KVKK kapsamında verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini veya silinmesini isteme gibi haklara sahipsiniz. Bu haklarınızı kullanmak için uygulama içi destek kanallarından bize ulaşabilirsiniz.
      </Text>

      <Text style={styles.h2}>5. Topluluk Kuralları</Text>
      <Text style={styles.body}>
        Sahte profil oluşturmamak, saygılı iletişim kurmak ve hayvan refahına aykırı içerik paylaşmamak gibi kurallara uymanız gerekmektedir. İhlal halinde hesabınız askıya alınabilir.
      </Text>

      <Text style={styles.h2}>6. Sorumluluk Sınırlaması</Text>
      <Text style={styles.body}>
        Babi.App, kullanıcılar arası buluşmaların güvenliğini garanti etmez. Kütüphane bölümündeki bilgiler genel bilgilendirme amaçlıdır, veteriner tavsiyesinin yerini tutmaz.
      </Text>

      <Text style={styles.h2}>7. İletişim</Text>
      <Text style={styles.body}>
        Sorularınız için: destek@babiapp.com
      </Text>

      <Text style={styles.footer}>
        Bu metin, projenin geliştirme aşaması için hazırlanmış bir taslaktır.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 60, backgroundColor: '#FFF7ED' },
  backLink: { color: '#FB923C', fontWeight: '700', fontSize: 14, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '900', color: '#431407', marginBottom: 8 },
  updated: { fontSize: 12, color: '#9A6B4B', marginBottom: 24 },
  h2: { fontSize: 15, fontWeight: '800', color: '#431407', marginTop: 20, marginBottom: 6 },
  body: { fontSize: 13, color: '#5C4033', lineHeight: 20 },
  footer: { fontSize: 11, color: '#9A6B4B', fontStyle: 'italic', marginTop: 32, marginBottom: 40 },
});