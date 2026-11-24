import { Redirect } from 'expo-router';
import React from 'react';
import { useAppStore } from '../store/useAppStore';

export default function Index() {
  const user = useAppStore((s) => s.user);

  if (user) {
    return <Redirect href="/(tabs)/trips" />;
  }

  return <Redirect href="/(auth)/login" />;
}
