import Desk from '../../components/Desk';
import {requireEditorPage} from '../../lib/editor';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Editorial desk | Shaba News Tamil', robots: {index: false, follow: false}};

export default async function Admin() {
  await requireEditorPage('/admin');
  return <main lang="en"><Desk/></main>;
}
