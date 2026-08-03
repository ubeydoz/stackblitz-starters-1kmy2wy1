import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { LocaleConfig } from 'react-native-calendars';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';

LocaleConfig.locales['tr'] = {
  monthNames: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  monthNamesShort: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
  dayNames: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
  dayNamesShort: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
  today: 'Bugün',
};
LocaleConfig.defaultLocale = 'tr';

SplashScreen.preventAutoHideAsync();

// Manrope'u tüm ekranlarda sistem fontunun yerine varsayılan yapar.
// StyleSheet.create() ile oluşturulan her metin stiline (fontSize/color/fontWeight
// içeren) fontFamily ekler — mevcut fontWeight değerine göre uygun Manrope ağırlığı seçilir.
const WEIGHT_TO_MANROPE: Record<string, string> = {
  '100': 'Manrope_400Regular',
  '200': 'Manrope_400Regular',
  '300': 'Manrope_400Regular',
  normal: 'Manrope_400Regular',
  '400': 'Manrope_400Regular',
  '500': 'Manrope_500Medium',
  '600': 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  '700': 'Manrope_700Bold',
  '800': 'Manrope_800ExtraBold',
  '900': 'Manrope_800ExtraBold',
};

const originalCreate = StyleSheet.create.bind(StyleSheet);
(StyleSheet as any).create = function patchedCreate(styles: Record<string, any>) {
  Object.values(styles).forEach(style => {
    if (
      style &&
      typeof style === 'object' &&
      !style.fontFamily &&
      ('fontSize' in style || 'color' in style || 'fontWeight' in style)
    ) {
      const weight = style.fontWeight ? String(style.fontWeight) : '400';
      style.fontFamily = WEIGHT_TO_MANROPE[weight] || 'Manrope_400Regular';
    }
  });
  return originalCreate(styles);
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
