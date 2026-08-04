import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import PawMeetAnimation from '../components/PawMeetAnimation';
import { COLORS } from '../../lib/theme';

export default function Index() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  const contentOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace('/home');
      } else {
        setCheckingSession(false);
      }
    });
  }, []);

  function handlePawsComplete() {
    Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(titleY, { toValue: 0, friction: 6, useNativeDriver: true }),
      ]),
    ]).start();
  }

  if (checkingSession) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.white} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Animasyonlu patiler */}
      <View style={styles.pawsWrap}>
        <PawMeetAnimation size={90} onComplete={handlePawsComplete} />
      </View>

      {/* İçerik */}
      <Animated.View
        style={{
          opacity: contentOpacity,
          transform: [{ translateY: titleY }],
          alignItems: 'center',
        }}
      >
        <Text style={styles.title}>Babi</Text>
        <Text style={styles.subtitle}>Köpeğiniz için en iyi arkadaşı bulun</Text>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/register/account-type')}
          >
            <Text style={styles.primaryButtonText}>Kayıt Ol</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.secondaryButtonText}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.clay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  pawsWrap: { marginBottom: 32 },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.white,
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.9,
  },
  buttons: {
    width: '100%',
    maxWidth: 320,
    marginTop: 64,
  },
  primaryButton: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.clay,
    fontWeight: '800',
    fontSize: 16,
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 16,
  },
});