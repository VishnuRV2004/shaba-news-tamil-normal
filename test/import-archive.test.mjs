import test from 'node:test';
import assert from 'node:assert/strict';
import { articleText } from '../scripts/import-archive.mjs';

test('Blogger article HTML becomes safe, readable paragraphs', () => {
  const html = '<div><a href="/photo"><img src="/photo"></a></div><div>சேலம்&nbsp;நகரம்</div><div>முதல் வரி<br>இரண்டாம் &amp; மூன்றாம்</div><script>alert(1)</script>';
  assert.equal(articleText(html), 'சேலம் நகரம்\n\nமுதல் வரி\n\nஇரண்டாம் & மூன்றாம்');
});
