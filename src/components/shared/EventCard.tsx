import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { EventoActivo } from "../../types/events";
import { formatDate } from "../../utils/formatDate";

interface Props {
  evento: EventoActivo;
  onPress: () => void;
}

export function EventCard({
  evento,
  onPress,
}: Props) {
  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
    >
      {evento.bannerUrl ? (
        <Image
          source={{ uri: evento.bannerUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.image,
            styles.imagePlaceholder,
          ]}
        >
          <Text style={styles.imagePlaceholderText}>
            Sin imagen
          </Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.title}>
          {evento.nombre}
        </Text>

        <Text style={styles.place}>
          {evento.lugar}
        </Text>

        <Text style={styles.date}>
          {formatDate(evento.fechaInicio)}
        </Text>

        {evento.descripcion ? (
          <Text
            style={styles.description}
            numberOfLines={2}
          >
            {evento.descripcion}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor:
      "rgba(255,255,255,0.07)",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.10)",
    marginBottom: 18,
  },

  image: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#1A1A1A",
  },

  content: {
    padding: 16,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
  },

  place: {
    color: "#E50914",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 6,
  },

  date: {
    color: "#BDBDBD",
    marginTop: 4,
  },

  description: {
    color: "#AFAFAF",
    marginTop: 10,
    lineHeight: 20,
  },

  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },

  imagePlaceholderText: {
    color: "#888888",
    fontWeight: "600",
  },
});