import EditionPage from '../../components/EditionPage';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: {
  searchParams: Promise<{ preview?: string }>;
}) {
  return <EditionPage draft={(await searchParams).preview === 'draft'} />;
}
