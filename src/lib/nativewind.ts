import { cssInterop } from 'nativewind';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Enable NativeWind `className` prop on SafeArea primitives across iOS, Android, and Web.
cssInterop(SafeAreaProvider, {
  className: 'style',
});

cssInterop(SafeAreaView, {
  className: 'style',
});
