import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
}

export function ImageUrlEditor({ label, value, onChange, onSave }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        placeholder="https://..."
        placeholderTextColor="#888"
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        style={styles.input}
      />

      {value ? (
        <Image source={{ uri: value }} style={styles.preview} resizeMode="cover" />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Sin imagen</Text>
        </View>
      )}

      <Pressable style={styles.button} onPress={onSave}>
        <Text style={styles.buttonText}>Guardar imagen</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginTop: 12,
  },
  label: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
  },
  preview: {
    width: "100%",
    height: 160,
    borderRadius: 18,
    backgroundColor: "#1A1A1A",
  },
  empty: {
    height: 120,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#999",
    fontWeight: "700",
  },
  button: {
    backgroundColor: "#E50914",
    padding: 13,
    borderRadius: 15,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});