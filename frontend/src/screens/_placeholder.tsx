import { View, Text, StyleSheet } from 'react-native';
import { weightFamily } from '@/theme/typography';

export function createPlaceholderScreen(label: string) {
  return function PlaceholderScreen() {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>{label}</Text>
      </View>
    );
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 18, ...weightFamily('semibold') },
});