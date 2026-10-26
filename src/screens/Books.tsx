import { useState } from 'react';
import { useData } from '../lib/store';
import { pagesPerBook, uid } from '../lib/logic';
import { NumberInput, Progress } from '../components/ui';

export function Books() {
  const { data, update } = useData();
  const [title, setTitle] = useState('');
  const [total, setTotal] = useState<number | null>(null);
  const perBook = pagesPerBook(data);

  const add = () => {
    const t = title.trim();
    if (!t || !total) return;
    update((d) => void d.books.push({ id: uid(), title: t, totalPages: total, finished: false }));
    setTitle('');
    setTotal(null);
  };

  const reading = data.books.filter((b) => !b.finished);
  const finished = data.books.filter((b) => b.finished);

  const BookRow = ({ id }: { id: string }) => {
    const b = data.books.find((x) => x.id === id)!;
    const read = perBook.get(b.id) ?? 0;
    return (
      <li className="book">
        <div className="book-main">
          <div className="book-top">
            <strong>{b.title}</strong>
            <span className="muted">
              {read} / {b.totalPages} pages · {Math.min(100, Math.round((read / b.totalPages) * 100))}%
            </span>
          </div>
          <Progress value={read} target={b.totalPages} color="var(--c-reading)" />
        </div>
        <button className="btn small" onClick={() => update((d) => void (d.books.find((x) => x.id === id)!.finished = !b.finished))}>
          {b.finished ? 'Reading again' : 'Mark finished'}
        </button>
        <button
          className="icon-btn ghost"
          aria-label="Delete book"
          onClick={() => {
            if (confirm(`Delete "${b.title}"? Pages already logged stay in your history as "Other reading".`)) {
              update((d) => {
                d.books = d.books.filter((x) => x.id !== id);
                for (const day of Object.values(d.days)) for (const r of day.reading) if (r.bookId === id) r.bookId = null;
              });
            }
          }}
        >
          ✕
        </button>
      </li>
    );
  };

  return (
    <div className="screen narrow">
      <div className="screen-head">
        <h1>Books</h1>
      </div>
      <section className="card">
        <header className="card-head">
          <h3>Add a book</h3>
        </header>
        <div className="row">
          <input className="text-input grow" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <NumberInput value={total} onChange={setTotal} min={1} placeholder="total pages" className="w-md" />
          <button className="btn primary" onClick={add}>
            Add
          </button>
        </div>
      </section>
      <section className="card">
        <header className="card-head">
          <h3>Currently reading</h3>
        </header>
        <ul className="book-list">
          {reading.map((b) => (
            <BookRow key={b.id} id={b.id} />
          ))}
          {!reading.length && <li className="empty">No books in progress.</li>}
        </ul>
      </section>
      {finished.length > 0 && (
        <section className="card">
          <header className="card-head">
            <h3>Finished</h3>
          </header>
          <ul className="book-list">
            {finished.map((b) => (
              <BookRow key={b.id} id={b.id} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
