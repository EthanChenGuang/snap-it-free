import { describe, expect, it, vi } from 'vitest';

const sharpMock = vi.hoisted(() => {
  const pipeline = {
    rotate: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('clean-jpeg')),
  };
  return vi.fn(() => pipeline);
});

vi.mock('sharp', () => ({
  default: sharpMock,
}));

import { stripExif } from './exif-strip';

describe('stripExif', () => {
  it('re-encodes input through sharp jpeg pipeline without retaining metadata helpers', async () => {
    const input = Buffer.from('fake-jpeg-with-gps');
    const output = await stripExif(input);

    expect(sharpMock).toHaveBeenCalledWith(input);
    const pipeline = sharpMock.mock.results[0]?.value;
    expect(pipeline.rotate).toHaveBeenCalled();
    expect(pipeline.jpeg).toHaveBeenCalled();
    expect(pipeline.toBuffer).toHaveBeenCalled();
    expect(output).toEqual(Buffer.from('clean-jpeg'));
  });
});
