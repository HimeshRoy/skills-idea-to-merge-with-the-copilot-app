import { useEffect, useRef, useState } from 'preact/hooks';

type Bookmark = {
  url: string;
  slug: string;
};

const storageKey = 'mona-bookmarks';
const slugCharacters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function isBookmark(value: unknown): value is Bookmark {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.url === 'string'
    && isValidUrl(candidate.url)
    && typeof candidate.slug === 'string'
    && /^mona-[0-9a-zA-Z]{6}$/.test(candidate.slug);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error.';
}

function generateSlug(bookmarks: Bookmark[]): string {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const randomValues = new Uint32Array(6);
    window.crypto.getRandomValues(randomValues);
    const suffix = Array.from(randomValues, (value) => slugCharacters[value % slugCharacters.length]).join('');
    const slug = `mona-${suffix}`;
    if (!bookmarks.some((bookmark) => bookmark.slug === slug)) return slug;
  }

  throw new Error('A unique bookmark slug could not be generated. Please try again.');
}

export default function BookmarksApp() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [status, setStatus] = useState<{ message: string; isError: boolean }>({
    message: '',
    isError: false,
  });
  const urlInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === null) return;

      const parsed: unknown = JSON.parse(stored);
      if (
        !Array.isArray(parsed)
        || !parsed.every(isBookmark)
        || new Set(parsed.map((bookmark) => bookmark.slug)).size !== parsed.length
      ) {
        throw new Error('Saved bookmarks have an unexpected format.');
      }

      setBookmarks(parsed);
    } catch (error) {
      setStatus({ message: `Saved bookmarks could not be loaded: ${errorMessage(error)}`, isError: true });
    }
  }, []);

  function saveBookmarks(nextBookmarks: Bookmark[]): boolean {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextBookmarks));
      setStatus({ message: '', isError: false });
      return true;
    } catch (error) {
      setStatus({ message: `Bookmarks could not be saved: ${errorMessage(error)}`, isError: true });
      return false;
    }
  }

  function handleSubmit(event: JSX.TargetedEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    const originalUrl = urlInput.current?.value.trim() ?? '';

    if (!isValidUrl(originalUrl)) {
      setStatus({ message: 'Enter a valid HTTP or HTTPS URL.', isError: true });
      urlInput.current?.focus();
      return;
    }

    try {
      const nextBookmarks = [...bookmarks, { url: originalUrl, slug: generateSlug(bookmarks) }];
      if (!saveBookmarks(nextBookmarks)) return;

      setBookmarks(nextBookmarks);
      event.currentTarget.reset();
      urlInput.current?.focus();
    } catch (error) {
      setStatus({ message: errorMessage(error), isError: true });
    }
  }

  async function copySlug(slug: string) {
    try {
      await window.navigator.clipboard.writeText(slug);
      setStatus({ message: `Copied ${slug} to the clipboard.`, isError: false });
    } catch (error) {
      setStatus({ message: `Could not copy the slug: ${errorMessage(error)}`, isError: true });
    }
  }

  function clearBookmarks() {
    if (!window.confirm('Clear all saved bookmarks?')) return;

    try {
      window.localStorage.removeItem(storageKey);
      setBookmarks([]);
      setStatus({ message: '', isError: false });
    } catch (error) {
      setStatus({ message: `Bookmarks could not be cleared: ${errorMessage(error)}`, isError: true });
    }
  }

  return (
    <>
      <form id="add-bookmark" onSubmit={handleSubmit}>
        <div class="field">
          <label for="url">Link to save</label>
          <input
            ref={urlInput}
            id="url"
            name="url"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://example.com"
            required
          />
        </div>
        <button type="submit">Add bookmark</button>
      </form>

      <p class="hint">
        Paste a URL and select <strong>Add bookmark</strong> to generate its short <code>mona-</code> slug.
      </p>
      <p id="status" role="status" aria-live="polite" data-error={status.isError} hidden={!status.message}>
        {status.message}
      </p>

      {bookmarks.length === 0 ? (
        <p id="empty-state" class="empty">No bookmarks yet — add your first link above.</p>
      ) : (
        <>
          <div id="list-header">
            <h2 class="list-title">Saved bookmarks</h2>
            <button id="clear-all" type="button" class="clear" onClick={clearBookmarks}>
              Clear all
            </button>
          </div>

          <ul id="bookmark-list" aria-label="Saved bookmarks" aria-live="polite">
            {bookmarks.map((bookmark) => (
              <li class="bookmark" key={bookmark.slug}>
                <a class="url" href={bookmark.url} target="_blank" rel="noopener noreferrer">
                  {bookmark.url}
                </a>
                <span class="slug">{bookmark.slug}</span>
                <button
                  class="copy"
                  type="button"
                  aria-label={`Copy slug ${bookmark.slug}`}
                  onClick={() => void copySlug(bookmark.slug)}
                >
                  Copy
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
