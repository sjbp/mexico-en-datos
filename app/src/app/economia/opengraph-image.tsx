import { renderTopicOG } from '@/lib/og/render';
import { OG_SIZE } from '@/lib/og/tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const alt = 'Economía · México en Datos';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function OGImage() {
  return renderTopicOG('economia');
}
