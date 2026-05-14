import screenshot from 'screenshot-desktop';

export interface CapturedDisplayImage {
  displayId: string;
  base64Jpeg: string;
}

export class ScreenCaptureService {
  async captureAllDisplays(): Promise<CapturedDisplayImage[]> {
    const displays = await screenshot.listDisplays();
    const capturedDisplayImages: CapturedDisplayImage[] = [];

    for (const display of displays) {
      const imageBuffer = await screenshot({ format: 'jpg', screen: display.id });
      capturedDisplayImages.push({
        displayId: String(display.id),
        base64Jpeg: imageBuffer.toString('base64')
      });
    }

    if (capturedDisplayImages.length === 0) {
      const imageBuffer = await screenshot({ format: 'jpg' });
      capturedDisplayImages.push({
        displayId: 'primary',
        base64Jpeg: imageBuffer.toString('base64')
      });
    }

    return capturedDisplayImages;
  }
}
