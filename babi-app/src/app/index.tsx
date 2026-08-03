import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

function PawPrint({ color = 'white', size = 80 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* Ana pati — kalp esintili yastık */}
      <Path
        d="M50 90 C50 84 38 78 27 65 C21 55 25 45 36 45 C44 45 50 51 50 58 C50 51 56 45 64 45 C75 45 79 55 73 65 C60 80 50 84 50 90 Z"
        fill={color}
      />
      {/* İki büyük ön parmak (bitişik) */}
      <Circle cx="40" cy="32" r="11" fill={color} />
      <Circle cx="60" cy="32" r="11" fill={color} />
      {/* İki küçük yan parmak (daha aşağıda) */}
      <Circle cx="24" cy="42" r="8" fill={color} />
      <Circle cx="76" cy="42" r="8" fill={color} />
    </Svg>
  );
}

export default function Index() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  const paw1Y = useRef(new Animated.Value(100)).current;
  const paw1Opacity = useRef(new Animated.Value(0)).current;
  const paw1Scale = useRef(new Animated.Value(0.5)).current;

  const paw2Y = useRef(new Animated.Value(100)).current;
  const paw2Opacity = useRef(new Animated.Value(0)).current;
  const paw2Scale = useRef(new Animated.Value(0.5)).current;

  const meetScale = useRef(new Animated.Value(1)).current;
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

  useEffect(() => {
    if (checkingSession) return;

    Animated.sequence([
      // Pati 1 aşağıdan yukarı gelir
      Animated.parallel([
        Animated.timing(paw1Y, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(paw1Opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(paw1Scale, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]),
      // Kısa bekle
      Animated.delay(100),
      // Pati 2 aşağıdan yukarı gelir
      Animated.parallel([
        Animated.timing(paw2Y, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(paw2Opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(paw2Scale, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]),
      // Patiler buluşunca "tok" efekti
      Animated.delay(150),
      Animated.sequence([
        Animated.spring(meetScale, { toValue: 1.2, friction: 3, useNativeDriver: true }),
        Animated.spring(meetScale, { toValue: 1, friction: 3, useNativeDriver: true }),
      ]),
      // İçerik fade in
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(titleY, { toValue: 0, friction: 6, useNativeDriver: true }),
      ]),
    ]).start();
  }, [checkingSession]);

  if (checkingSession) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Animasyonlu patiler */}
      <Animated.View
        style={[
          styles.pawsContainer,
          { transform: [{ scale: meetScale }] },
        ]}
      >
        <Animated.View
          style={{
            opacity: paw1Opacity,
            transform: [{ translateY: paw1Y }, { scale: paw1Scale }, { rotate: '-25deg' }, { translateX: 12 }],
          }}
        >
          <PawPrint size={90} />
        </Animated.View>

        <Animated.View
          style={{
            opacity: paw2Opacity,
            transform: [{ translateY: paw2Y }, { scale: paw2Scale }, { rotate: '25deg' }, { translateX: -12 }],
            marginTop: 4,
          }}
        >
          <PawPrint size={90} />
        </Animated.View>
      </Animated.View>

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
    backgroundColor: '#FB923C',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  pawsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 32,
    gap: -60,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: 'white',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: 'white',
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
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FB923C',
    fontWeight: '800',
    fontSize: 16,
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 16,
  },
});