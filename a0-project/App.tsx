import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from './lib/paper';
import { colors } from './lib/theme';
import HomeScreen from './screens/HomeScreen';

export default function App() {
  return (
    <PaperProvider>
      <SafeAreaProvider style={styles.container}>
        <HomeScreen />
      </SafeAreaProvider>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});