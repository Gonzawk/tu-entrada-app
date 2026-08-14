import { apiClient } from "./apiClient";

export type UploadImageFile = {
  uri: string;
  name: string;
  type: string;
};

type ImgBBUploadResponse = {
  data?: {
    id?: string;
    title?: string;
    url?: string;
    display_url?: string;
    delete_url?: string;
  };
  success?: boolean;
  status?: number;
};

export async function subirImagenApi(
  file: UploadImageFile
): Promise<string> {
  const formData = new FormData();

  formData.append(
    "file",
    {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any
  );

  const response = await apiClient.post<ImgBBUploadResponse>(
    "/api/uploads/image",
    formData
  );

  const imagenUrl =
    response.data?.data?.url ??
    response.data?.data?.display_url;

  if (!imagenUrl) {
    throw new Error(
      "No se pudo obtener la URL de la imagen subida."
    );
  }

  return imagenUrl;
}