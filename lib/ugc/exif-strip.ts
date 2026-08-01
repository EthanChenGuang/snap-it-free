import sharp from 'sharp';

export async function stripExif(input: Buffer): Promise<Buffer> {
  return sharp(input).rotate().jpeg().toBuffer();
}
