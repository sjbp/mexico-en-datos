import Hero from './sections/Hero';
import HeadlineGrid from './sections/HeadlineGrid';
import TopicsGrid from './sections/TopicsGrid';
import SourcesGrid from './sections/SourcesGrid';
import { getHeadlineIndicators } from '@/lib/data';

export default async function Home() {
  const headlines = await getHeadlineIndicators();

  return (
    <>
      <Hero />
      <HeadlineGrid headlines={headlines} />
      <TopicsGrid />
      <SourcesGrid />
    </>
  );
}
