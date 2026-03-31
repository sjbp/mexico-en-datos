import Hero from './sections/Hero';
import HeadlineGrid from './sections/HeadlineGrid';
import InflationSection from './sections/InflationSection';
import MortalitySection from './sections/MortalitySection';
import TopicsGrid from './sections/TopicsGrid';
import Footer from '@/components/ui/Footer';
import { getHeadlineIndicators, getIndicatorValues, getTopicsWithCounts } from '@/lib/data';

export default async function Home() {
  const [headlines, inflationValues, topicsWithCounts] = await Promise.all([
    getHeadlineIndicators(),
    getIndicatorValues('628194', '00'),
    getTopicsWithCounts(),
  ]);

  return (
    <>
      <Hero />
      <HeadlineGrid headlines={headlines} />
      <InflationSection inflationValues={inflationValues} />
      <MortalitySection />
      <TopicsGrid topics={topicsWithCounts} />
      <Footer />
    </>
  );
}
