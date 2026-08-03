import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

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

type Props = {
  size?: number;
  color?: string;
  onComplete?: () => void;
};

export default function PawMeetAnimation({ size = 90, color = 'white', onComplete }: Props) {
  const paw1Y = useRef(new Animated.Value(100)).current;
  const paw1Opacity = useRef(new Animated.Value(0)).current;
  const paw1Scale = useRef(new Animated.Value(0.5)).current;

  const paw2Y = useRef(new Animated.Value(100)).current;
  const paw2Opacity = useRef(new Animated.Value(0)).current;
  const paw2Scale = useRef(new Animated.Value(0.5)).current;

  const meetScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
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
    ]).start(() => {
      onComplete?.();
    });
    // Bilerek boş bağımlılık: animasyon her mount'ta bir kez oynasın.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.pawsContainer, { transform: [{ scale: meetScale }] }]}>
      <Animated.View
        style={{
          opacity: paw1Opacity,
          transform: [{ translateY: paw1Y }, { scale: paw1Scale }, { rotate: '-25deg' }, { translateX: 12 }],
        }}
      >
        <PawPrint size={size} color={color} />
      </Animated.View>

      <Animated.View
        style={{
          opacity: paw2Opacity,
          transform: [{ translateY: paw2Y }, { scale: paw2Scale }, { rotate: '25deg' }, { translateX: -12 }],
          marginTop: 4,
        }}
      >
        <PawPrint size={size} color={color} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pawsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: -60,
  },
});
