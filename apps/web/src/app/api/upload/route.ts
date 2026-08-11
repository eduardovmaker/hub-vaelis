import { NextResponse } from "next/server";
import { uploadFileToR2, getPresignedR2UploadUrl } from "@/lib/r2";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("fileName") || "file.mp4";
    const mimeType = searchParams.get("mimeType") || "video/mp4";
    const folder = searchParams.get("folder") || "midia";

    const presigned = await getPresignedR2UploadUrl({
      fileName,
      mimeType,
      folder,
    });

    return NextResponse.json({
      success: true,
      uploadUrl: presigned.uploadUrl,
      publicUrl: presigned.publicUrl,
      key: presigned.key,
      isMock: presigned.isMock || false,
    });
  } catch (error: any) {
    console.error("Erro ao gerar URL presignada no R2:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao gerar URL presignada." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "midia";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Nenhum arquivo enviado. Selecione uma imagem ou vídeo." },
        { status: 400 }
      );
    }

    const fileName = file.name;
    const mimeType = file.type;
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Validação de tamanho máximo (150 MB para vídeos MP4 em HD)
    const MAX_SIZE_BYTES = 150 * 1024 * 1024;
    if (fileBuffer.length > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: "Arquivo muito grande. O limite máximo permitido é 150 MB." },
        { status: 400 }
      );
    }

    // Processa upload para o Cloudflare R2
    const result = await uploadFileToR2({
      fileBuffer,
      fileName,
      mimeType,
      folder,
    });

    return NextResponse.json({
      success: true,
      url: result.url,
      key: result.key,
      isMock: result.isMock || false,
      message: result.isMock
        ? "Upload simulado com sucesso (configure as chaves R2 no .env para gravação real no Cloudflare)."
        : "Arquivo enviado com sucesso para o Cloudflare R2!",
    });
  } catch (error: any) {
    console.error("Erro no upload para o R2:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno no servidor de upload." },
      { status: 500 }
    );
  }
}
