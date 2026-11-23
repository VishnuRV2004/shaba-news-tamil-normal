"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { ArrowDownRight, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Bookmark, BookmarkCheck, CalendarDays, Check, ChevronLeft, ChevronRight, CircleDot, Globe2, House, MapPin, Menu, Newspaper, Printer, Search, Share2, Type, Volume2, VolumeX, X } from "lucide-react";
import type { Article, Edition } from "@/lib/model";
import "./newsroom.css";

type Props = { edition: Edition; articles: Article[]; articleId?: string; full?: boolean };
type LinkToStory = (article: Article, full?: boolean) => string;

const publicHome = "/newsroom";
const dateFormat = new Intl.DateTimeFormat("ta-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
const weekdayFormat = new Intl.DateTimeFormat("ta-IN", { weekday: "long", timeZone: "Asia/Kolkata" });

function formatDate(value: string, weekday = false) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return weekday ? weekdayFormat.format(date) + ", " + dateFormat.format(date) : dateFormat.format(date);
}

function subscribeLocation(refresh: () => void) {
  window.addEventListener("hashchange", refresh);
  window.addEventListener("popstate", refresh);
  return () => {
    window.removeEventListener("hashchange", refresh);
    window.removeEventListener("popstate", refresh);
  };
}

function Wordmark() {
  return <span className="nr-wordmark">
    <span className="nr-brand-ta"><b>ஷபா</b> நியூஸ்</span>
    <span className="nr-brand-en" lang="en">SHABA NEWS TAMIL</span>
  </span>;
}

function Meta({ article }: { article: Article }) {
  return <span className="nr-meta">
    {article.district && <span><MapPin size={13} aria-hidden="true" />{article.district}</span>}
    {article.district && article.date && <i aria-hidden="true" />}
    {article.date && <time dateTime={article.date}>{formatDate(article.date)}</time>}
  </span>;
}

function Cover({ article, href }: { article: Article; href: string }) {
  return <a href={href} className="nr-cover">
    {article.image && <img src={article.image} alt="" fetchPriority="high" className="nr-cover-photo" />}
    <span className="nr-cover-category"><Newspaper size={15} aria-hidden="true" />{article.category || "தலைப்புச் செய்தி"}</span>
    <span className="nr-cover-body"><Meta article={article} /><span className="nr-cover-title">{article.title}</span>
      <span className="nr-read">செய்தியை வாசிக்க <ArrowRight size={16} aria-hidden="true" /></span>
    </span>
  </a>;
}

function Digest({ items, link }: { items: Article[]; link: LinkToStory }) {
  return <div className="nr-digest"><div className="nr-digest-heading"><span className="nr-bars" aria-hidden="true" />செய்திப் பார்வை</div>
    {items.map((article, i) => <a className="nr-digest-story" href={link(article)} key={article.id}>
      <div className="nr-digest-text"><span className="nr-kicker"><span className="nr-index">{String(i + 1).padStart(2, "0")}</span>{article.category}</span>
        <h3>{article.title}</h3><Meta article={article} /></div>
      {article.image && <span className="nr-digest-image"><img src={article.image} alt="" loading="lazy" /></span>}
    </a>)}
  </div>;
}

function StoryCard({ article, link }: { article: Article; link: LinkToStory }) {
  return <a className="nr-card" href={link(article)}>
    {article.image && <span className="nr-card-image"><img src={article.image} alt="" loading="lazy" /></span>}
    <div className="nr-card-copy"><span className="nr-kicker">{article.category}</span><h3>{article.title}</h3>
      {article.summary && <p>{article.summary}</p>}<Meta article={article} /></div>
  </a>;
}

function StoryPage({ article, others, link, home, full, saved, onSave }: { article: Article; others: Article[]; link: LinkToStory; home: string; full: boolean; saved: boolean; onSave: () => void }) {
  const [expanded, setExpanded] = useState(full);
  const [largeText, setLargeText] = useState(false);
  const [canListen, setCanListen] = useState(false);
  const [listening, setListening] = useState(false);
  const [copied, setCopied] = useState(false);
  const speech = useRef<SpeechSynthesisUtterance | null>(null);
  const paragraphs = article.body.split(/\n+/).filter(Boolean);
  const preview = paragraphs.find(paragraph => paragraph.length > 80) || paragraphs[0] || article.summary;
  useEffect(() => {
    setCanListen('speechSynthesis' in window);
    return () => { window.speechSynthesis?.cancel(); };
  }, []);
  function listen() {
    if (listening) { window.speechSynthesis.cancel(); setListening(false); return; }
    const utterance = new SpeechSynthesisUtterance(article.title + '. ' + article.body);
    utterance.lang = 'ta-IN';
    utterance.rate = 0.9;
    utterance.onend = utterance.onerror = () => { setListening(false); speech.current = null; };
    speech.current = utterance;
    setExpanded(true);
    window.speechSynthesis.speak(utterance);
    setListening(true);
  }
  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: article.title, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); setCopied(true); }
    } catch { /* The reader can cancel the native share sheet. */ }
  }
  function printStory() {
    setExpanded(true);
    requestAnimationFrame(() => window.print());
  }
  return <article className="nr-article">
    <a className="nr-back" href={home}><ArrowLeft size={16} /> முகப்பு</a>
    <div className="nr-article-heading"><span className="nr-kicker">{article.category}</span><h1>{article.title}</h1>
      {article.summary && <p>{article.summary}</p>}
      <div className="nr-byline"><div>{article.author && <strong>{article.author}</strong>}<Meta article={article} /></div><span>{Math.max(1, Math.ceil(article.body.length / 900))} நிமிட வாசிப்பு</span></div>
      <div className="nr-reader-tools" aria-label="வாசிப்பு கருவிகள்">
        <button type="button" onClick={onSave} aria-pressed={saved}>{saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}{saved ? 'சேமிக்கப்பட்டது' : 'சேமிக்க'}</button>
        <button type="button" onClick={share}>{copied ? <Check size={17} /> : <Share2 size={17} />}{copied ? 'இணைப்பு நகலானது' : 'பகிர்'}</button>
        {canListen && <button type="button" onClick={listen} aria-pressed={listening}>{listening ? <VolumeX size={17} /> : <Volume2 size={17} />}{listening ? 'நிறுத்து' : 'கேட்க'}</button>}
        <button type="button" onClick={() => setLargeText(!largeText)} aria-pressed={largeText}><Type size={17} />எழுத்து அளவு</button>
        <button type="button" onClick={printStory}><Printer size={17} />அச்சிடு</button>
      </div>
    </div>
    <div className="nr-article-columns"><div className="nr-article-main">
      {article.image && <figure><img src={article.image} alt={article.title} /></figure>}
      <div className={"nr-body-copy" + (largeText ? " nr-large-text" : "")}>{expanded ? paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>) : preview && <p className="nr-preview-copy">{preview}</p>}</div>
      {!expanded && paragraphs.length > 0 && <a href={link(article, true)} className="nr-source" onClick={event => { event.preventDefault(); setExpanded(true); }}>மூலச் செய்தி <ArrowUpRight size={16} /></a>}
    </div>{others.length > 0 && <aside aria-label="தொடர்ந்து வாசிக்க"><h2>தொடர்ந்து வாசிக்க</h2>
      {others.slice(0, 3).map(item => <StoryCard key={item.id} article={item} link={link} />)}
    </aside>}</div>
  </article>;
}

export default function Newsroom({ edition, articles, articleId, full = false }: Props) {
  const location = useSyncExternalStore(subscribeLocation, () => window.location.search + window.location.hash, () => "");
  const preview = new URLSearchParams(location.split("#")[0]).get("preview") === "draft" ? "?preview=draft" : "";
  const home = publicHome + preview;
  const link = (article: Article, complete = false) => publicHome + "/story/" + encodeURIComponent(article.id) + preview + (complete ? (preview ? "&" : "?") + "full=1" : "");
  const sections = edition.sections.filter(section => section.visible);
  const byId = new Map(articles.map(article => [article.id, article]));
  const itemsFor = (ids: string[]) => ids.flatMap(id => { const article = byId.get(id); return article ? [article] : []; });
  const visibleArticles = itemsFor([...new Set(sections.flatMap(section => section.articleIds))]);
  const districts = [...new Set(visibleArticles.map(article => article.district).filter(Boolean))];
  const article = articleId ? byId.get(articleId) : undefined;
  const latestDate = visibleArticles.map(item => item.date).filter(Boolean).sort().at(-1) || article?.date || "";
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [ticker, setTicker] = useState(0);
  const latest = [...visibleArticles].sort((a, b) => b.date.localeCompare(a.date));
  const tickerItem = latest.length > 0 ? latest[ticker % latest.length] : undefined;
  const [panel, setPanel] = useState<"search" | "index" | "saved">("index");
  const [query, setQuery] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const previousTrigger = useRef<HTMLElement | null>(null);
  const searchTerm = query.trim().toLocaleLowerCase("ta-IN");
  const results = visibleArticles.filter(item => [item.title, item.summary, item.body, item.category, item.district, item.author].some(value => value.toLocaleLowerCase("ta-IN").includes(searchTerm)));
  const savedArticles = savedIds.flatMap(id => { const item = byId.get(id); return item ? [item] : []; });
  const sectionLink = (id: string) => home + "#nr-section-" + encodeURIComponent(id);
  function openPanel(value: "search" | "index" | "saved", term = "") {
    if (!dialog.current?.open) previousTrigger.current = document.activeElement as HTMLElement;
    setPanel(value);
    setQuery(term);
    dialog.current?.showModal();
    if (value === "search") requestAnimationFrame(() => searchInput.current?.focus());
  }
  useEffect(() => {
    const element = dialog.current;
    return () => element?.close();
  }, []);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('shaba:saved') || '[]');
      if (Array.isArray(stored)) setSavedIds(stored.filter((id): id is string => typeof id === 'string'));
    } catch { /* Ignore invalid browser storage. */ }
  }, []);
  function toggleSaved(id: string) {
    const next = savedIds.includes(id) ? savedIds.filter(item => item !== id) : [id, ...savedIds];
    setSavedIds(next);
    try { localStorage.setItem('shaba:saved', JSON.stringify(next)); } catch { /* Reading remains available without storage. */ }
  }
  return <div className="nr" lang="ta" id="nr-top" data-density={edition.density} style={{ "--nr-accent": edition.accent } as CSSProperties}>
    <a className="nr-skip" href="#nr-content">செய்திகளுக்குச் செல்ல</a>
    <header>
      <div className="nr-utility"><div className="nr-wrap nr-utility-inner">
        <span><CalendarDays size={13} />{latestDate ? formatDate(latestDate, true) : "தமிழ் இணையப் பதிப்பு"}</span>
        <span><Globe2 size={14} /><span className="nr-region">தமிழ்நாடு</span><i /><span className="nr-utility-edition">{edition.name}</span></span>
      </div></div>
      <div className="nr-wrap nr-mast">
        <button className="nr-menu" type="button" onClick={() => openPanel("index")} aria-label="பிரிவுகள் மற்றும் மாவட்டங்கள்" aria-haspopup="dialog"><Menu size={19} /><span>பிரிவுகள்</span></button>
        <a className="nr-logo-link" href={home} aria-label="ஷபா நியூஸ் தமிழ் முகப்பு"><Wordmark /></a>
        <div className="nr-header-actions">
          <button className="nr-saved-action" type="button" aria-label="சேமித்த செய்திகள்" aria-haspopup="dialog" onClick={() => openPanel("saved")}><Bookmark size={19} /><span>சேமித்தவை</span>{savedArticles.length > 0 && <b>{savedArticles.length}</b>}</button>
          <button className="nr-mobile-search" aria-label="செய்திகளைத் தேடுக" aria-haspopup="dialog" onClick={() => openPanel("search")}><Search size={21} /></button>
        </div>
      </div>
      <div className="nr-nav-frame"><div className="nr-wrap nr-nav-inner">
        <nav aria-label="செய்திப் பிரிவுகள்"><a className={"nr-home-nav" + (!articleId && !location.includes("#nr-section-") ? " nr-active" : "")} href={home}><House size={16} />முகப்பு</a>
          {sections.map(section => <a key={section.id} className={location.endsWith("#nr-section-" + encodeURIComponent(section.id)) ? "nr-active" : ""} href={sectionLink(section.id)}>{section.title}</a>)}
        </nav><button className="nr-nav-search" aria-haspopup="dialog" onClick={() => openPanel("search")}><Search size={17} /><span>தேடுக</span></button>
      </div></div>
    </header>
    <main className="nr-wrap nr-main" id="nr-content">
      {articleId ? article ? <StoryPage article={article} others={visibleArticles.filter(item => item.id !== articleId)} link={link} home={home} full={full} saved={savedIds.includes(article.id)} onSave={() => toggleSaved(article.id)} />
        : <div className="nr-empty"><h1>செய்தி கிடைக்கவில்லை</h1><a href={home}>முகப்பிற்குத் திரும்புக <ArrowRight size={16} /></a></div> : <>
        {tickerItem && <div className="nr-ticker"><span className="nr-ticker-label"><CircleDot size={14} />புதியவை</span>
          <a href={link(tickerItem)}>{tickerItem.title}</a>
          {visibleArticles.length > 1 && <div className="nr-ticker-arrows"><button aria-label="முந்தைய தலைப்பு" onClick={() => setTicker((ticker + visibleArticles.length - 1) % visibleArticles.length)}><ChevronLeft size={16} /></button><button aria-label="அடுத்த தலைப்பு" onClick={() => setTicker((ticker + 1) % visibleArticles.length)}><ChevronRight size={16} /></button></div>}
        </div>}
        {districts.length > 0 && <div className="nr-quickbar"><span>மாவட்டச் செய்திகள்</span><div>{districts.map(district => <button key={district} type="button" onClick={() => openPanel("search", district)}>{district}</button>)}</div></div>}
        <h1 className="nr-visually-hidden">ஷபா நியூஸ் தமிழ் – {edition.name}</h1>
        {sections.map(section => {
          const items = itemsFor(section.articleIds);
          return <section key={section.id} className={"nr-section nr-type-" + section.type} id={"nr-section-" + section.id}>
            <div className="nr-section-heading"><h2><i aria-hidden="true" />{section.title}</h2><span className="nr-section-line" /><span className="nr-section-count">{items.length} செய்திகள்</span></div>
            {!items.length ? <p className="nr-section-empty">இந்தப் பிரிவில் இன்னும் செய்திகள் இல்லை.</p>
              : section.type === "lead" ? <div className={"nr-lead-grid" + (items.length === 1 ? " nr-single" : "")}>
                <Cover article={items[0]} href={link(items[0])} />{items.length > 1 && <Digest items={items.slice(1)} link={link} />}</div>
              : <div className="nr-stories">{items.map(item => <StoryCard key={item.id} article={item} link={link} />)}</div>}
          </section>;
        })}
        {!sections.length && <p className="nr-empty">இந்தப் பதிப்பில் இன்னும் செய்திகள் இல்லை.</p>}
      </>}
    </main>
    <footer><div className="nr-wrap nr-footer"><a href={home} aria-label="ஷபா நியூஸ் தமிழ் முகப்பு"><img className="nr-official-mark" src="/shaba-mark.webp" width="95" height="62" alt="ஷபா நியூஸ் தமிழ்" loading="lazy" /></a><span>{edition.name}</span><a className="nr-top-link" href="#nr-top">மேலே செல்ல <ArrowUp size={16} /></a></div></footer>
    <dialog ref={dialog} className="nr-dialog" aria-labelledby="nr-dialog-heading" onClose={() => previousTrigger.current?.focus({ preventScroll: true })} onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
      <div className="nr-dialog-inner"><div className="nr-dialog-title"><h2 id="nr-dialog-heading">{panel === "search" ? "செய்திகளைத் தேடுக" : panel === "saved" ? "சேமித்த செய்திகள்" : "செய்தி வழிகாட்டி"}</h2><button aria-label="மூடுக" onClick={() => dialog.current?.close()}><X size={21} /></button></div>
        {panel === "index" ? <><h3>செய்திப் பிரிவுகள்</h3><div className="nr-section-links">{sections.map(section => <a key={section.id} href={sectionLink(section.id)} onClick={() => dialog.current?.close()}>{section.title}<ArrowDownRight size={17} /></a>)}</div>
          {districts.length > 0 && <><h3>மாவட்டச் செய்திகள்</h3><div className="nr-districts">{districts.map(district => <button onClick={() => openPanel("search", district)} key={district}><MapPin size={14} />{district}</button>)}</div></>}
        </> : panel === "saved" ? savedArticles.length ? <div className="nr-results">{savedArticles.map(item => <a key={item.id} href={link(item)}><div><span className="nr-kicker">{item.category} · {item.district}</span><strong>{item.title}</strong></div></a>)}</div> : <p className="nr-section-empty">சேமித்த செய்திகள் இன்னும் இல்லை. செய்தியைத் திறந்து சேமிக்கவும்.</p> : <><label className="nr-searchbox"><Search size={20} /><input ref={searchInput} value={query} onChange={e => setQuery(e.target.value)} aria-label="செய்தி, மாவட்டம் அல்லது பிரிவு" placeholder="செய்தி, மாவட்டம் அல்லது பிரிவு…" /></label>
          <p className="nr-result-count" aria-live="polite">{results.length} செய்திகள்</p><div className="nr-results">{results.map(item => <a key={item.id} href={link(item)}><div><span className="nr-kicker">{item.category} · {item.district}</span><strong>{item.title}</strong></div><ArrowUpRight size={17} /></a>)}</div>
          {!results.length && <p className="nr-section-empty">பொருத்தமான செய்திகள் கிடைக்கவில்லை. வேறொரு சொல்லைத் தேடவும்.</p>}</>}
      </div>
    </dialog>
  </div>;
}
