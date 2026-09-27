import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

import { colors } from '@/lib/theme';

function TabIcon(props: {
  name: ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return (
    <FontAwesome
      size={22}
      style={{ marginBottom: -2 }}
      name={props.name}
      color={props.color}
    />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <TabIcon name="home" color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="keyboard"
        options={{
          title: 'Keyboard',
          tabBarIcon: ({ color }) => (
            <TabIcon name="keyboard-o" color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="rewrite"
        options={{
          title: 'Rewrite',
          tabBarIcon: ({ color }) => (
            <TabIcon name="magic" color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <TabIcon name="cog" color={String(color)} />
          ),
        }}
      />
    </Tabs>
  );
}
