"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, ChevronRight, Eye, EyeOff, FileText, Globe, Layers, LayoutTemplate, Monitor, Newspaper, Pencil, Plus, Save, Search, Send, SlidersHorizontal, Trash2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Article, Edition, Section, StudioState } from "../lib/model";
import "./desk.css";

type Site = keyof StudioState["editions"];
type View = "layout" | "articles" | "settings";
type Operation = "save" | "preview" | "publish";
type Placement = { site: Site; sectionId: string; review: boolean };
const sites: Site[] = ["newsroom"];
const siteLabels = { newsroom: "Newsroom" };
const styles: Record<Section["type"], string> = { lead: "Lead package", grid: "Story grid", list: "Headline list", feature: "Feature" };
const signIn = "/editor-login?next=%2Fadmin";
const views = [
  { id: "layout", label: "Page layout", icon: LayoutTemplate },
  { id: "articles", label: "Story library", icon: FileText },
  { id: "settings", label: "Site settings", icon: SlidersHorizontal },
] as const;

function move<T,>(items: T[], index: number, offset: number) {
  const target = index + offset;
  if (index < 0 || target < 0 || target >= items.length) return items;
  const result = [...items];
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}

function safeHttps(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}

function safeImage(value: string) {
  return /^\/photos\/[A-Za-z0-9._-]+$/.test(value) || /^\/media\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(value) || safeHttps(value);
}

function Photo({ src, alt = "" }: { src?: string; alt?: string }) {
  const [failed, setFailed] = useState("");
  if (!src || !safeImage(src) || failed === src) return <span className="ds-photo-blank" aria-hidden="true"><Newspaper size={20} /></span>;
  return <Image alt={alt} src={src} width={160} height={100} unoptimized loading="lazy" onError={() => setFailed(src)} />;
}

function IconButton({ label, children, onClick, disabled }: { label: string; children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" className="ds-icon" aria-label={label} title={label} onClick={onClick} disabled={disabled}>{children}</button>;
}

function Wireframe({ kind }: { kind: Section["type"] }) {
  return <span aria-hidden="true" className={`ds-wire ds-wire-${kind}`}><i /><i /><i /><i /></span>;
}

function Dialog({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const trigger = document.activeElement;
    dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-initial-focus]")?.focus();
    return () => {
      dialog.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);
  return <dialog ref={ref} aria-label={label} className="ds-dialog" onCancel={event => { event.preventDefault(); onClose(); }}>{children}</dialog>;
}

function StoryEditor({ article, state, isNew, site, sectionId, busy, saveError, code, status, onReload, onClose, onApply }: {
  article: Article; state: StudioState; isNew: boolean; site: Site; sectionId: string;
  busy: boolean; saveError: string; code: number; status: string;
  onReload: () => void; onClose: () => void; onApply: (article: Article, placement?: Placement) => void;
}) {
  const [value, setValue] = useState(article);
  const [targetSite, setTargetSite] = useState(site);
  const available = (section: Section) => section.visible && (section.articleIds.length < 100 || section.articleIds.includes(article.id));
  function defaultSection(key: Site, preferred?: string) {
    const choices = state.editions[key].sections.filter(available);
    return (choices.find(section => section.id === preferred) || choices[0])?.id || "";
  }
  const [targetSection, setTargetSection] = useState(() => defaultSection(site, sectionId));
  const sections = state.editions[targetSite].sections;
  const selected = sections.find(section => section.id === targetSection);
  const invalidPlacement = Boolean(targetSection && (!selected || !available(selected)));
  const change = (key: keyof Article, text: string) => setValue(current => ({ ...current, [key]: text }));
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const uploadRequest = useRef<AbortController | null>(null);
  useEffect(() => () => uploadRequest.current?.abort(), []);
  async function uploadCover(file: File) {
    setUploadMessage(""); setError("");
    const accepted = ["image/jpeg", "image/png", "image/webp"];
    if (!accepted.includes(file.type)) return setError("Choose a JPG, PNG or WebP image.");
    if (file.size === 0 || file.size > 5 * 1024 * 1024) return setError("Choose an image between 1 byte and 5 MiB.");
    const controller = new AbortController();
    uploadRequest.current = controller; setUploading(true);
    try {
      const response = await fetch("/api/media", { method: "POST", body: file, headers: { "Content-Type": file.type }, signal: controller.signal });
      const result = await response.json().catch(() => ({})) as { url?: string; error?: string };
      if (response.status === 401) throw new Error("Your session expired. Sign in again before uploading the image.");
      if (response.status === 403) throw new Error("This account needs editor access to upload images.");
      if (!response.ok || !result.url || !safeImage(result.url)) throw new Error(result.error || "Image upload failed. Choose the file again to retry.");
      change("image", result.url);
      setUploadMessage("Cover image uploaded.");
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Image upload failed. Choose the file again to retry.");
    } finally {
      if (!controller.signal.aborted) setUploading(false);
    }
  }
  function cancel() {
    if (busy) return;
    if ((!uploading && JSON.stringify(value) === JSON.stringify(article)) || window.confirm("Discard the edits in this story form?")) onClose();
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (uploading || busy || (isNew && invalidPlacement)) return;
    const clean = Object.fromEntries(Object.entries(value).map(([key, text]) => [key, text.trim()])) as Article;
    if (!clean.title) return setError("Enter a headline.");
    if (!clean.category) return setError("Enter a category.");
    if (clean.image && !safeImage(clean.image)) return setError("Use an HTTPS image URL or a local image path such as /photos/story.webp.");
    if (clean.sourceUrl && !safeHttps(clean.sourceUrl)) return setError("Use an HTTPS source link without embedded credentials.");
    setError("");
    const review = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "review";
    onApply(clean, isNew ? { site: targetSite, sectionId: targetSection, review } : undefined);
  }
  return <Dialog label={isNew ? "Add news" : "Edit story"} onClose={cancel}>
    <form onSubmit={submit} onInvalidCapture={event => { const details = (event.target as Element).closest("details"); if (details) details.open = true; }}>
      <div className="ds-dialog-head"><div><span className="ds-kicker">{isNew ? "Editorial desk" : "Story library"}</span><h2>{isNew ? "Add news" : "Edit story"}</h2></div><IconButton label="Close story editor" onClick={cancel} disabled={busy}><X size={18}/></IconButton></div>
      <fieldset className="ds-dialog-body ds-fields ds-compose" disabled={busy}>
        <label>Headline<input required maxLength={240} data-initial-focus value={value.title} onChange={e => change("title", e.target.value)} /></label>
        <label>Story text<textarea rows={isNew ? 5 : 6} maxLength={18000} value={value.body} onChange={e => change("body", e.target.value)} /></label>
        {isNew && <div className="ds-placement">
          <div className="ds-form-grid">
            <label>Edition<select value={targetSite} onChange={e => { const key = e.target.value as Site; setTargetSite(key); setTargetSection(defaultSection(key)); }}>{sites.map(key => <option key={key} value={key}>{siteLabels[key]}</option>)}</select></label>
            <label>Section<select value={targetSection} onChange={e => setTargetSection(e.target.value)}>
              <option value="">Library only</option>
              {targetSection && !selected && <option disabled value={targetSection}>Section removed</option>}
              {sections.map(section => <option key={section.id} value={section.id} disabled={!available(section)}>{section.title || "Untitled section"}{!section.visible ? " (hidden)" : !available(section) ? " (full)" : ""}</option>)}
            </select></label>
          </div>
          <small>{invalidPlacement ? "Choose another section or save to the library." : selected ? "The new story will appear first in this section when the edition is published." : "Library-only stories stay off the front page until you place them in a section."}</small>
        </div>}
        <div className="ds-compose-photo">
          {value.image && safeImage(value.image) && <span className="ds-cover-preview"><Photo src={value.image} alt="Cover image preview"/></span>}
          <div className="ds-upload">
            <label>Upload cover image<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} aria-describedby="ds-upload-info" onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void uploadCover(file); }}/></label>
            <small id="ds-upload-info">JPG, PNG or WebP · Up to 5 MiB</small>
            <span role="status" className="ds-upload-status">{uploading ? "Uploading image…" : uploadMessage}</span>
          </div>
        </div>
        <details className="ds-compose-details" open={isNew ? undefined : true}>
          <summary>More details</summary>
          <div className="ds-fields">
            <label>Summary<textarea rows={2} maxLength={1200} value={value.summary} onChange={e => change("summary", e.target.value)} /></label>
            <div className="ds-form-grid">
              <label>Category<input required maxLength={100} value={value.category} onChange={e => change("category", e.target.value)} /></label>
              <label>District<input maxLength={100} value={value.district} onChange={e => change("district", e.target.value)} /></label>
              <label>Author<input maxLength={150} value={value.author} onChange={e => change("author", e.target.value)} /></label>
              <label>Story date<input type="date" required value={value.date} onChange={e => change("date", e.target.value)} /></label>
            </div>
            <label>Cover image<input disabled={uploading} list="ds-existing-photos" maxLength={2048} value={value.image} onChange={e => change("image", e.target.value)} placeholder="https://… or choose a library image" /></label>
            <datalist id="ds-existing-photos">{[...new Set(state.articles.map(a => a.image).filter(url => url && safeImage(url)))].map(url => <option key={url} value={url}>{state.articles.find(a => a.image === url)?.title}</option>)}</datalist>
            <label>Source link<input type="url" maxLength={2048} value={value.sourceUrl} onChange={e => change("sourceUrl", e.target.value)} placeholder="https://…" /></label>
          </div>
        </details>
      </fieldset>
      {(error || saveError) && <div className="ds-compose-error" role="alert"><span>{error || saveError}</span>
        {code === 409 && <button type="button" className="ds-btn ds-small" onClick={onReload} disabled={busy}>Load latest draft</button>}
        {code === 401 && <a className="ds-btn ds-small" href={signIn} target="_blank" rel="noreferrer">Sign in <ArrowUpRight size={14}/></a>}
      </div>}
      {isNew && status && <p className="ds-compose-status" role="status">{status}</p>}
      <div className="ds-dialog-foot"><button type="button" className="ds-btn" onClick={cancel} disabled={busy}>Cancel</button>
        <button type="submit" value="save" disabled={uploading || busy || (isNew && invalidPlacement)} className="ds-btn ds-primary">{busy ? "Saving…" : isNew ? "Save draft" : "Apply changes"}</button>
        {isNew && <button type="submit" value="review" className="ds-btn" disabled={uploading || busy || !selected || invalidPlacement} title={selected ? "Save the draft and review publication of this edition" : "Choose a section to publish this story"}>Review &amp; publish</button>}
      </div>
    </form>
  </Dialog>;
}

function SectionEditor({ section, articles, change, remove }: { section: Section; articles: Article[]; change: (patch: Partial<Section>) => void; remove: () => void }) {
  const options = articles.filter(article => !section.articleIds.includes(article.id));
  return <div className="ds-section-fields ds-fields">
    <div className="ds-form-grid"><label>Section label<input maxLength={240} value={section.title} onChange={e => change({ title: e.target.value })} /></label>
      <label>Layout style<select value={section.type} onChange={e => change({ type: e.target.value as Section["type"] })}>{Object.entries(styles).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label></div>
    <div><div className="ds-field-label">Stories in reading order</div>
      {section.articleIds.length === 0 && <p className="ds-muted">Choose the first story for this section.</p>}
      <ol className="ds-assigned">{section.articleIds.map((id, index) => {
        const title = articles.find(article => article.id === id)?.title || id;
        return <li key={id}><small>{index + 1}</small><span>{title}</span><div className="ds-icon-group">
          <IconButton label={`Move story up: ${title}`} disabled={index === 0} onClick={() => change({ articleIds: move(section.articleIds, index, -1) })}><ArrowUp size={15}/></IconButton>
          <IconButton label={`Move story down: ${title}`} disabled={index === section.articleIds.length - 1} onClick={() => change({ articleIds: move(section.articleIds, index, 1) })}><ArrowDown size={15}/></IconButton>
          <IconButton label={`Remove story from section: ${title}`} onClick={() => change({ articleIds: section.articleIds.filter(item => item !== id) })}><X size={15}/></IconButton>
        </div></li>;
      })}</ol>
    </div>
    <label>Add a story<select value="" disabled={!options.length || section.articleIds.length >= 100} onChange={e => { if (e.target.value) change({ articleIds: [...section.articleIds, e.target.value] }); }}><option value="">{section.articleIds.length >= 100 ? "Section limit reached (100)" : options.length ? "Choose from story library…" : "All stories are assigned"}</option>{options.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}</select></label>
    <button type="button" className="ds-remove" onClick={remove}><Trash2 size={15}/> Remove section</button>
  </div>;
}

function PageMap({ edition, site, articles }: { edition: Edition; site: Site; articles: Article[] }) {
  const visible = edition.sections.filter(section => section.visible);
  return <aside className="ds-side">
    <div className="ds-panel ds-map">
      <div className="ds-map-title"><Monitor size={17}/><h2>Page preview</h2><span>Desktop</span></div>
      <div className={`ds-canvas ds-canvas-${site}`} style={{ "--ds-site": edition.accent } as CSSProperties}>
        <div className={`ds-page ds-density-${edition.density}`}>
          <div className="ds-paper-brand">{edition.name || siteLabels[site]}</div>
          {visible.map(section => {
            const stories = section.articleIds.map(id => articles.find(a => a.id === id)).filter((a): a is Article => Boolean(a));
            return <div key={section.id} className={`ds-mini ds-mini-${section.type}`}>
              <div className="ds-mini-label">{section.title || styles[section.type]}</div>
              {!stories.length && <div className="ds-empty-mini">No stories</div>}
              <div className="ds-mini-stories">{stories.slice(0, 3).map((a, i) => <div className="ds-mini-story" key={a.id}>
                <div className="ds-mini-img"><Photo src={a.image}/></div><div><b>{a.title}</b>{i === 0 && section.type === "lead" && <p>{a.summary}</p>}</div>
              </div>)}</div>
              {stories.length > 3 && <p className="ds-more">+{stories.length - 3} more</p>}
            </div>;
          })}
          {!visible.length && <p className="ds-empty-mini">No visible sections</p>}
        </div>
      </div>
      <div className="ds-map-foot"><span>{visible.length} visible {visible.length === 1 ? "section" : "sections"}</span><a href={`/${site}`} target="_blank" rel="noreferrer">Published site <ArrowUpRight size={14}/></a></div>
    </div>
  </aside>;
}

export default function Desk() {
  const router = useRouter();
  const [state, setState] = useState<StudioState | null>(null);
  const [revision, setRevision] = useState(0);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const [site, setSite] = useState<Site>("newsroom");
  const [view, setView] = useState<View>("layout");
  const [sectionId, setSectionId] = useState("");
  const [story, setStory] = useState<{article: Article; isNew: boolean} | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<Operation | null>(null);
  const saving = useRef(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [code, setCode] = useState(0);
  const [loadKey, setLoadKey] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setError(""); setCode(0);
      try {
        const response = await fetch("/api/studio", { cache: "no-store", signal: controller.signal });
        if (!response.ok) {
          setCode(response.status);
          throw new Error(response.status === 401 ? "Sign in with the editor account to open this workspace." : response.status === 403 ? "Ask the site owner to grant this account editor access." : "The studio could not load. Try again.");
        }
        const data = await response.json() as { state: StudioState; revision: number };
        if (controller.signal.aborted) return;
        setState(data.state); setRevision(data.revision); setDirty(false); dirtyRef.current = false; setStatus("");
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "The studio could not load. Try again.");
      }
    }
    void load();
    return () => controller.abort();
  }, [loadKey]);
  useEffect(() => {
    function protect(event: BeforeUnloadEvent) { if (dirtyRef.current || story) { event.preventDefault(); event.returnValue = ""; } }
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [story]);

  function changeState(next: StudioState) {
    setState(next); setDirty(true); dirtyRef.current = true; setStatus("");
  }
  function changeEdition(patch: Partial<Edition>) {
    if (!state) return;
    changeState({ ...state, editions: { ...state.editions, [site]: { ...state.editions[site], ...patch } } });
  }
  function changeSection(id: string, patch: Partial<Section>) {
    if (state) changeEdition({ sections: state.editions[site].sections.map(s => s.id === id ? { ...s, ...patch } : s) });
  }
  async function persist(operation: Operation, next = state, targetSite = site) {
    if (!next || saving.current) return false;
    if (operation === "preview" && !dirty) { router.push(`/${site}?preview=draft`); return; }
    for (const key of sites) {
      const edition = next.editions[key];
      const missing = edition.sections.find(section => !section.title.trim());
      if (!edition.name.trim() || missing) {
        if (story?.isNew) { changeState(next); setStory(null); }
        setSite(key); setView(missing ? "layout" : "settings"); setSectionId(missing?.id || "");
        const issue = missing ? "Enter a label for the open section before saving." : "Enter a site name before saving.";
        setError(story?.isNew ? "Your story is in the unsaved draft. " + issue : issue); setCode(0); setPublishOpen(false);
        return;
      }
    }
    saving.current = true; setBusy(operation); setError(""); setStatus(""); setPublishOpen(false); setCode(0);
    try {
      const response = await fetch("/api/studio", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: next, revision, action: operation === "publish" ? "publish" : "save", edition: targetSite }) });
      if (!response.ok) {
        setCode(response.status);
        if (response.status === 409 && story?.isNew) throw new Error("Another editor saved a newer draft. Load it here, then save your story again.");
        if (response.status === 409) throw new Error("Another editor saved a newer draft. Your edits are still here. Copy the changes you want to keep before reloading.");
        if (response.status === 401) throw new Error("Your session expired. Sign in again, then retry.");
        if (response.status === 403) throw new Error("This account needs editor access. Contact the site owner.");
        const failure = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(typeof failure.error === "string" ? failure.error : "Could not save the draft. Your changes are still here.");
      }
      const data = await response.json() as { revision: number };
      setState(next); setRevision(data.revision); setDirty(false); dirtyRef.current = false;
      setStatus(operation === "publish" ? `${siteLabels[site]} is published.` : "Draft saved.");
      if (operation === "preview") router.push(`/${site}?preview=draft`);
      return true;
    } catch (err) { setError(err instanceof Error ? err.message : "Connection failed. Try again."); }
    finally { saving.current = false; setBusy(null); }
  }
  async function reloadForStory() {
    if (saving.current || (dirty && !window.confirm("Replace other unsaved desk edits with the latest draft? The story you are writing will stay open."))) return;
    saving.current = true; setBusy("save");
    try {
      const response = await fetch("/api/studio", {cache: "no-store"});
      if (!response.ok) throw new Error("Could not load the latest draft. Your story is still open.");
      const data = await response.json() as {state: StudioState; revision: number};
      setState(data.state); setRevision(data.revision); setDirty(false); dirtyRef.current = false;
      setCode(0); setError(""); setStatus("Latest draft loaded. Check the section and save your story.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load the latest draft."); }
    finally { saving.current = false; setBusy(null); }
  }
  async function applyStory(article: Article, placement?: Placement) {
    if (!state || saving.current) return;
    const exists = state.articles.some(a => a.id === article.id);
    if (!exists && state.articles.length >= 250) { setError("The library has reached its 250-story limit."); return; }
    const next = {...state, articles: exists ? state.articles.map(a => a.id === article.id ? article : a) : [article, ...state.articles]};
    if (placement) {
      const {site: key, sectionId: id, review} = placement;
      const edition = state.editions[key];
      if (id) {
        const section = edition.sections.find(s => s.id === id);
        if (!section || !section.visible || (section.articleIds.length >= 100 && !section.articleIds.includes(article.id))) {
          setError("Choose another section or save to the library."); return;
        }
        next.editions = {...state.editions, [key]: {...edition, sections: edition.sections.map(s => s.id === id ? {...s, articleIds: [article.id, ...s.articleIds.filter(existing => existing !== article.id)]} : s)}};
      }
      if (!await persist("save", next, key)) return;
      setSite(key); setSectionId(id); setPublishOpen(review && Boolean(id));
      setStatus(id ? `Story saved to the ${siteLabels[key]} draft.` : "Story saved to the library.");
    } else changeState(next);
    setSearch(""); setStory(null);
  }
  function reload() {
    if (dirty && !window.confirm("Discard your local edits and load the latest saved draft?")) return;
    setState(null); setError(""); setLoadKey(k => k + 1);
  }

  const mark = <Link className="ds-brand" href="/" prefetch={false} target="_blank" rel="noreferrer"><span className="ds-mark" aria-hidden="true"><Newspaper size={23}/></span><strong>Shaba<span>.</span></strong><i/><span>Editorial Studio</span></Link>;
  if (!state) return <div className="ds-studio"><header className="ds-header">{mark}</header><div className="ds-gate"><div className="ds-gate-icon"><Layers size={28}/></div><h1>{error ? "Editor workspace" : "Opening the studio…"}</h1>{error && <><p role="alert">{error}</p><div className="ds-actions">{code === 401 && <a className="ds-btn ds-primary" href={signIn}>Sign in as editor <ArrowUpRight size={15}/></a>}<button className="ds-btn" onClick={reload}>Try again</button></div></>}</div></div>;

  const edition = state.editions[site];
  const sections = edition.sections;
  const articles = state.articles.filter(article => [article.title, article.category, article.district, article.author].some(s => s.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())));
  function newStory() {
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    setError(""); setCode(0); setStatus("");
    setStory({isNew: true, article: { id: crypto.randomUUID(), title: "", summary: "", body: "", category: "பொது", district: "", author: "", date, image: "", sourceUrl: "" }});
  }
  return <div className="ds-studio">
    <header className="ds-header">{mark}<span className="ds-header-note"><span className="ds-dot"/> Editor workspace</span></header>
    <fieldset disabled={Boolean(busy)} className="ds-work">
      <div className="ds-topline"><span>Studio</span><ChevronRight size={14}/><strong>{siteLabels[site]}</strong></div>
      <div className="ds-heading"><div><div className="ds-title-row"><h1>Editorial desk</h1><button className="ds-btn ds-primary ds-add-news" disabled={state.articles.length >= 250} title={state.articles.length >= 250 ? "The library can hold up to 250 stories" : undefined} onClick={newStory}><Plus size={17}/>Add news</button></div><p>Manage stories and shape your front page.</p></div>
        <div className="ds-actions">
          <button className="ds-btn" onClick={() => void persist("preview")} title={dirty ? "Save your changes and open the draft preview" : "Open the saved draft preview"}><Eye size={16}/>{busy === "preview" ? "Opening…" : "Preview draft"}</button>
          <button className="ds-btn" disabled={!dirty} onClick={() => void persist("save")}><Save size={15}/>{busy === "save" ? "Saving…" : "Save draft"}</button>
          <button className="ds-btn ds-primary" onClick={() => setPublishOpen(true)}><Send size={15}/>{busy === "publish" ? "Publishing…" : "Publish edition"}</button>
        </div>
      </div>
      <div className="ds-bar"><nav className="ds-views" aria-label="Studio views">{views.map(({ id, label, icon: Icon }) => <button key={id} aria-pressed={view === id} className={view === id ? "is-current" : ""} onClick={() => setView(id)}><Icon size={16}/>{label}</button>)}</nav>
        <span className={`ds-save-state ${dirty ? "is-dirty" : ""}`} role="status"><span className="ds-dot"/>{busy ? "Working…" : dirty ? "Unsaved changes" : status || "Draft saved"}</span>
      </div>
      {error && <div className="ds-alert" role="alert"><span>{error}</span>{code === 409 && <button className="ds-btn" onClick={reload}>Reload latest draft</button>}{code === 401 && <a className="ds-btn" href={signIn} target="_blank" rel="noreferrer">Sign in <ArrowUpRight size={14}/></a>}</div>}
      {view === "layout" && <div className="ds-columns">
        <section className="ds-panel"><div className="ds-panel-head"><div><h2>Front-page sections</h2><p>Arrange sections in reading order.</p></div><button className="ds-btn ds-small" disabled={sections.length >= 40} title={sections.length >= 40 ? "Each edition can have up to 40 sections" : undefined} onClick={() => { const id = crypto.randomUUID(); changeEdition({ sections: [...sections, { id, title: "New section", type: "grid", articleIds: [], visible: true }] }); setSectionId(id); }}><Plus size={16}/>Add section</button></div>
          <div className="ds-section-list">{sections.map((section, index) => {
            const expanded = sectionId === section.id;
            return <article key={section.id} className={`ds-section ${expanded ? "is-open" : ""} ${section.visible ? "" : "is-hidden"}`}>
              <div className="ds-section-head"><button className="ds-section-select" aria-expanded={expanded} aria-controls={expanded ? `section-${section.id}` : undefined} onClick={() => setSectionId(expanded ? "" : section.id)}>
                <Wireframe kind={section.type}/><span><strong>{section.title || "Untitled section"}</strong><small>{styles[section.type]} · {section.articleIds.length} {section.articleIds.length === 1 ? "story" : "stories"}{!section.visible && " · Hidden"}</small></span>
              </button>
              <div className="ds-icon-group"><IconButton label={`Move section up: ${section.title}`} disabled={index === 0} onClick={() => changeEdition({ sections: move(sections, index, -1) })}><ArrowUp size={16}/></IconButton>
                <IconButton label={`Move section down: ${section.title}`} disabled={index === sections.length - 1} onClick={() => changeEdition({ sections: move(sections, index, 1) })}><ArrowDown size={16}/></IconButton>
                <IconButton label={`${section.visible ? "Hide" : "Show"} section: ${section.title}`} onClick={() => changeSection(section.id, { visible: !section.visible })}>{section.visible ? <Eye size={16}/> : <EyeOff size={16}/>}</IconButton>
                <IconButton label={`${expanded ? "Close" : "Edit"} section: ${section.title}`} onClick={() => setSectionId(expanded ? "" : section.id)}>{expanded ? <X size={15}/> : <Pencil size={15}/>}</IconButton>
              </div></div>
              {expanded && <div id={`section-${section.id}`}><SectionEditor section={section} articles={state.articles} change={patch => changeSection(section.id, patch)} remove={() => { if (window.confirm(`Remove “${section.title}” from this edition? Its stories will stay in the library.`)) { changeEdition({ sections: sections.filter(item => item.id !== section.id) }); setSectionId(""); } }}/></div>}
            </article>;
          })}{!sections.length && <p className="ds-empty">Add a section to start building this front page.</p>}</div>
        </section>
        <PageMap edition={edition} site={site} articles={state.articles}/>
      </div>}
      {view === "articles" && <section className="ds-panel ds-library"><div className="ds-panel-head"><div><h2>Story library</h2><p>{state.articles.length} {state.articles.length === 1 ? "story" : "stories"} in the editorial library.</p></div></div>
        <label className="ds-search"><Search size={16}/><input type="search" aria-label="Search stories" placeholder="Search by headline, category, district or author" value={search} onChange={e => setSearch(e.target.value)}/></label>
        <ul className="ds-library-list">{articles.map(article => <li key={article.id}><button onClick={() => { setError(""); setCode(0); setStatus(""); setStory({article, isNew: false}); }}><span className="ds-library-photo"><Photo src={article.image}/></span><span className="ds-story-copy"><small>{[article.category, article.district].filter(Boolean).join(" · ")}</small><strong>{article.title}</strong><span>{[article.author, article.date].filter(Boolean).join(" · ")}</span></span><Pencil size={16}/></button></li>)}</ul>
        {!articles.length && <p className="ds-empty">{search ? "No stories match this search." : "Add the first story to the library."}</p>}
      </section>}
      {view === "settings" && <div className="ds-columns"><section className="ds-panel"><div className="ds-panel-head"><div><h2>Site settings</h2><p>Set the identity and spacing of {siteLabels[site]}.</p></div><Globe size={19}/></div>
        <div className="ds-fields ds-settings"><label>Site name<input maxLength={100} value={edition.name} onChange={e => changeEdition({ name: e.target.value })}/></label>
          <label>Accent color<span className="ds-color"><input type="color" value={edition.accent} onChange={e => changeEdition({ accent: e.target.value })}/><span>{edition.accent.toUpperCase()}</span></span></label>
          <label>Page density<select value={edition.density} onChange={e => changeEdition({ density: e.target.value as Edition["density"] })}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label></div>
        </section><PageMap edition={edition} site={site} articles={state.articles}/></div>}
    </fieldset>
    {story && <StoryEditor article={story.article} isNew={story.isNew} state={state} site={site} sectionId={sectionId} busy={Boolean(busy)} saveError={error} code={code} status={status} onReload={() => void reloadForStory()} onClose={() => setStory(null)} onApply={(a, placement) => void applyStory(a, placement)}/>}
    {publishOpen && <Dialog label="Confirm publication" onClose={() => setPublishOpen(false)}><div className="ds-dialog-head"><div><span className="ds-kicker">Publish edition</span><h2>Publish {siteLabels[site]}?</h2></div><IconButton label="Close" onClick={() => setPublishOpen(false)}><X size={17}/></IconButton></div>
      <div className="ds-dialog-body"><p>Readers at <strong>/{site}</strong> will see this edition’s current stories, layout and site settings.</p></div>
      <div className="ds-dialog-foot"><button className="ds-btn" data-initial-focus onClick={() => setPublishOpen(false)}>Cancel</button><button className="ds-btn ds-primary" onClick={() => void persist("publish")}><Send size={15}/>Publish {siteLabels[site]}</button></div></Dialog>}
  </div>;
}
