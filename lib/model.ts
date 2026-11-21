export type EditionKey = 'newsroom';
export interface Article {
  id: string; title: string; summary: string; body: string; category: string;
  district: string; author: string; date: string; image: string; sourceUrl: string;
}
export interface Section {
  id: string; type: 'lead' | 'grid' | 'list' | 'feature'; title: string; visible: boolean; articleIds: string[];
}
export interface Edition {
  name: string; accent: string; density: 'comfortable' | 'compact'; sections: Section[];
}
export interface StudioState {articles: Article[]; editions: Record<EditionKey, Edition>}
export interface Issue {edition: Edition; articles: Article[]}
export function publishedIssue(state: StudioState, key: EditionKey): Issue {
  const edition = {...state.editions[key], sections: state.editions[key].sections.filter(section => section.visible)};
  const mapped = new Set(edition.sections.flatMap(section => section.articleIds));
  return {edition, articles:state.articles.filter(story => mapped.has(story.id))};
}
