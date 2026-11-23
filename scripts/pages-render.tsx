import { renderToString } from 'react-dom/server';
import Newsroom from '../components/Newsroom';
import { publishedIssue } from '../lib/model';
import { seed } from '../lib/seed';

export const issue = publishedIssue(seed, 'newsroom');

export function renderPage(articleId?: string) {
  return renderToString(<Newsroom {...issue} articleId={articleId} />);
}
