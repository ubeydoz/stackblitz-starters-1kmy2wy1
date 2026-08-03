import { Tabs } from 'expo-router';
import { PawPrint, MessageCircle, Compass, BookOpen, Syringe, User, LucideIcon } from 'lucide-react-native';

function TabIcon({ Icon, focused }: { Icon: LucideIcon; focused: boolean }) {
  return <Icon size={22} color={focused ? '#FB923C' : '#9A6B4B'} strokeWidth={focused ? 2.4 : 2} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FB923C',
        tabBarInactiveTintColor: '#9A6B4B',
        tabBarStyle: { backgroundColor: '#FFF7ED', borderTopColor: '#FED7AA' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: 'Eşleştir', tabBarIcon: ({ focused }) => <TabIcon Icon={PawPrint} focused={focused} /> }}
      />
      <Tabs.Screen
        name="matches"
        options={{ title: 'Mesajlar', tabBarIcon: ({ focused }) => <TabIcon Icon={MessageCircle} focused={focused} /> }}
      />
      <Tabs.Screen
        name="events"
        options={{ title: 'Keşfet', tabBarIcon: ({ focused }) => <TabIcon Icon={Compass} focused={focused} /> }}
      />
      <Tabs.Screen
        name="library"
        options={{ title: 'Kütüphane', tabBarIcon: ({ focused }) => <TabIcon Icon={BookOpen} focused={focused} /> }}
      />
      <Tabs.Screen
        name="health"
        options={{ title: 'Sağlık', tabBarIcon: ({ focused }) => <TabIcon Icon={Syringe} focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profil', tabBarIcon: ({ focused }) => <TabIcon Icon={User} focused={focused} /> }}
      />
    </Tabs>
  );
}
