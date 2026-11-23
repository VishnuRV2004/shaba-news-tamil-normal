import EditionPage from '../../../../components/EditionPage';
import { issue } from '../../../../lib/storage';

export const dynamic = 'force-dynamic';

type StoryParams = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: StoryParams }) {
  const { id } = await params;
  const published = await issue('newsroom');
  const article = published.articles.find(story => story.id === id);
  return article ? { title: article.title + ' | Shaba News Tamil', description: article.summary } : {};
}

export default async function Story({ params, searchParams }: {
  params: StoryParams;
  searchParams: Promise<{ preview?: string; full?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  return <EditionPage story={id} draft={query.preview === 'draft'} full={query.full === '1'} />;
}
