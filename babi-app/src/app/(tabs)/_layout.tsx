import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>{emoji}</Text>;
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
        options={{ title: 'Eşleştir', tabBarIcon: ({ focused }) => <TabIcon emoji="🐾" focused={focused} /> }}
      />
      <Tabs.Screen
        name="matches"
        options={{ title: 'Mesajlar', tabBarIcon: ({ focused }) => <TabIcon emoji="💬" focused={focused} /> }}
      />
      <Tabs.Screen
        name="library"
        options={{ title: 'Kütüphane', tabBarIcon: ({ focused }) => <TabIcon emoji="📚" focused={focused} /> }}
      />
      <Tabs.Screen
        name="health"
        options={{ title: 'Sağlık', tabBarIcon: ({ focused }) => <TabIcon emoji="💉" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profil', tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }}
      />
    </Tabs>
  );
}