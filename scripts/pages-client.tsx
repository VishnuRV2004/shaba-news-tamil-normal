import { hydrateRoot } from 'react-dom/client';
import Newsroom from '../components/Newsroom';
import { publishedIssue } from '../lib/model';
import { seed } from '../lib/seed';

const root = document.getElementById('app');
if (root) {
  const articleId = root.dataset.articleId || undefined;
  hydrateRoot(root, <Newsroom {...publishedIssue(seed, 'newsroom')} articleId={articleId} />);
}
