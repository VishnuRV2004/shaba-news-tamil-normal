import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireEditorPage } from '../lib/editor';
import { publishedIssue } from '../lib/model';
import { issue, studio } from '../lib/storage';
import Newsroom from './Newsroom';

export default async function EditionPage({ story, draft }: { story?: string; draft: boolean }) {
  if (draft) {
    const path = story ? `/newsroom/story/${encodeURIComponent(story)}` : '/newsroom';
    await requireEditorPage(path + '?preview=draft');
  }
  const data = draft
    ? publishedIssue((await studio()).state, 'newsroom')
    : await issue('newsroom');
  if (story && !data.articles.some(article => article.id === story)) notFound();

  return <>
    {draft && <aside lang="en" className="draft-strip">Draft preview · Only editors can see these changes <Link href="/admin" prefetch={false}>Return to desk</Link></aside>}
    <Newsroom {...data} articleId={story} />
  </>;
}
