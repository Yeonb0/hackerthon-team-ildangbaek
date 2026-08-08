import { View, Text, StyleSheet } from 'react-native';

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
  text: { fontSize: 18, fontWeight: '600' },
});