/** Load Inter TTF weights for Satori. Reads bundled TTFs from disk via fs. */

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
type FontStyle = 'normal' | 'italic';

interface SatoriFont {
  name: string;
  data: Buffer;
  weight?: FontWeight;
  style?: FontStyle;
}

const FONTS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fonts');

export async function loadInter(): Promise<SatoriFont[]> {
  const [regular, medium, semibold, bold] = await Promise.all([
    readFile(join(FONTS_DIR, 'Inter-Regular.ttf')),
    readFile(join(FONTS_DIR, 'Inter-Medium.ttf')),
    readFile(join(FONTS_DIR, 'Inter-SemiBold.ttf')),
    readFile(join(FONTS_DIR, 'Inter-Bold.ttf')),
  ]);
  return [
    { name: 'Inter', data: regular, weight: 400, style: 'normal' },
    { name: 'Inter', data: medium, weight: 500, style: 'normal' },
    { name: 'Inter', data: semibold, weight: 600, style: 'normal' },
    { name: 'Inter', data: bold, weight: 700, style: 'normal' },
  ];
}
