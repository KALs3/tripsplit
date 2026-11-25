import { cssInterop } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';

// Enable NativeWind `className` prop on SafeAreaView across iOS, Android, and Web.
cssInterop(SafeAreaView, {
  className: 'style',
});
