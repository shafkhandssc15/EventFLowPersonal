import QRCode from 'qrcode';
import jsQR from 'jsqr';

/**
 * Generate high-definition QR Code as PNG Data URL
 */
export async function generateQrDataUrl(
  text: string,
  options?: {
    width?: number;
    margin?: number;
    color?: { dark?: string; light?: string };
  }
): Promise<string> {
  return QRCode.toDataURL(text, {
    width: options?.width || 320,
    margin: options?.margin ?? 2,
    color: {
      dark: options?.color?.dark || '#000000',
      light: options?.color?.light || '#FFFFFF',
    },
    errorCorrectionLevel: 'H',
  });
}

/**
 * Render QR code directly to an HTMLCanvasElement
 */
export async function renderQrToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  options?: { width?: number; margin?: number }
): Promise<void> {
  await QRCode.toCanvas(canvas, text, {
    width: options?.width || 280,
    margin: options?.margin ?? 2,
    errorCorrectionLevel: 'H',
  });
}

/**
 * Scan an image file or blob and decode QR code
 */
export async function decodeQrFromImage(file: File | Blob): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        resolve(code ? code.data : null);
      };
      img.onerror = () => reject(new Error('Failed to load image for QR decoding'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Scan video frame from an HTMLVideoElement and decode QR code
 */
export function scanVideoFrame(video: HTMLVideoElement): { data: string; location: any } | null {
  if (video.readyState !== video.HAVE_ENOUGH_DATA) return null;

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'dontInvert',
  });

  if (code && code.data) {
    return { data: code.data, location: code.location };
  }
  return null;
}
