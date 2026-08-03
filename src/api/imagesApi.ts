import { apiClient } from "./apiClient";

export async function subirImagenApi(file: {
  uri: string;
  name: string;
  type: string;
}) {
  const formData = new FormData();

  formData.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);

  const response = await apiClient.post("/api/uploads/image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}