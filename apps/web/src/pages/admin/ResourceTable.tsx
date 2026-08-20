import { useMemo, useState } from 'react';
import {
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Copy, Download, Pencil, Search, Trash2,
} from 'lucide-react';
import { MediaImage } from '../../components/ui';
import ConfirmDialog from './ConfirmDialog';
import { tableFields, BOOLEAN_FIELDS, IMG_FIELDS, type Field, type Resource } from './adminConfig';

const PAGE_SIZE = 50;

/** Booleans the table lets you flip in place (optimistic PATCH). */
const TOGGLEABLE = ['active', 'featured', 'verified'];

/** A field whose value is semantically a flag — real checkbox, a known boolean
 *  column, or a select whose only options are 'true'/'false'. */
const isBoolField = (f: Field) =>
  f.type === 'checkbox' ||
  BOOLEAN_FIELDS.has(f.name) ||
  (f.type === 'select' && (f.options?.length ?? 0) > 0 && f.options!.every((o) => o === 'true' || o === 'false'));

const isOn = (v: unknown) => v === true || v === 'true';

function cellText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  // DateTime columns arrive as ISO strings — the date part is what a human wants.
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:/.test(v)) return v.slice(0, 10);
  return String(v);
}

/** Desktop (lg+) data table over a resource list: search, column sort,
 *  50-row pages, bulk select/delete/flag, inline boolean toggles, per-row
 *  edit/duplicate/delete, CSV export of the current filtered set.
 *  All client-side — the admin API returns full lists. */
export default function ResourceTable({
  conf,
  items,
  onEdit,
  onDuplicate,
  onDeleteMany,
  onSetMany,
  onToggle,
}: {
  conf: Resource;
  items: any[];
  onEdit: (item: any) => void;
  onDuplicate: (item: any) => void;
  onDeleteMany: (ids: string[]) => void;
  onSetMany: (ids: string[], field: string, value: boolean) => void;
  onToggle: (item: any, field: string, value: boolean) => void;
}) {
  const columns = useMemo(() => tableFields(conf), [conf]);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ col: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState<{ kind: 'row'; item: any } | { kind: 'bulk'; ids: string[] } | null>(null);

  const needle = q.trim().toLowerCase();
  const filtered = useMemo(
    () => (needle ? items.filter((it) => columns.some((c) => cellText(it[c.name]).toLowerCase().includes(needle))) : items),
    [items, needle, columns],
  );

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const { col, dir } = sort;
    return [...filtered].sort((a, b) => {
      const av = a[col];
      const bv = b[col];
      if (av == null && bv == null) return 0;
      if (av == null) return 1; // empties sink to the bottom either way
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      if (typeof av === 'boolean' || typeof bv === 'boolean') return ((av ? 1 : 0) - (bv ? 1 : 0)) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [filtered, sort]);

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const cur = Math.min(page, pages - 1);
  const rows = sorted.slice(cur * PAGE_SIZE, (cur + 1) * PAGE_SIZE);

  const pageIds = rows.map((r) => String(r.id));
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const selectedIds = [...selected].filter((id) => items.some((it) => String(it.id) === id));

  const hasActive = conf.fields.some((f) => f.name === 'active');
  const hasFeatured = conf.fields.some((f) => f.name === 'featured');

  const headerClick = (name: string) =>
    setSort((s) => (s?.col === name ? { col: name, dir: s.dir === 1 ? -1 : 1 } : { col: name, dir: 1 }));

  const toggleAllOnPage = () =>
    setSelected((s) => {
      const next = new Set(s);
      if (allOnPage) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });

  const toggleOne = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const bulkSet = (field: string, value: boolean) => {
    onSetMany(selectedIds, field, value);
    setSelected(new Set());
  };

  /** Export the CURRENT filtered set (all pages, visible columns). The BOM is
   *  what makes Arabic open correctly in Excel. */
  const exportCsv = () => {
    const esc = (s: string) => (/[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const head = columns.map((c) => esc(c.label)).join(',');
    const body = filtered.map((it) => columns.map((c) => esc(cellText(it[c.name]))).join(','));
    const blob = new Blob(['﻿' + [head, ...body].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${conf.key}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      {/* Toolbar: search + count on the left, bulk actions + export on the right */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            placeholder="Search…"
            className="w-full rounded-full border border-gray-200 bg-white py-1.5 ps-9 pe-3 text-sm outline-none focus:border-gray-400"
          />
        </div>
        <span className="text-sm text-gray-500">
          {filtered.length} item{filtered.length === 1 ? '' : 's'}
          {needle && filtered.length !== items.length ? ` (of ${items.length})` : ''}
        </span>

        <div className="ms-auto flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 && (
            <>
              <span className="text-sm font-semibold">{selectedIds.length} selected</span>
              {hasActive && (
                <>
                  <button onClick={() => bulkSet('active', true)} className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-gray-50">
                    Set active
                  </button>
                  <button onClick={() => bulkSet('active', false)} className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-gray-50">
                    Set inactive
                  </button>
                </>
              )}
              {hasFeatured && (
                <>
                  <button onClick={() => bulkSet('featured', true)} className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-gray-50">
                    Feature
                  </button>
                  <button onClick={() => bulkSet('featured', false)} className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-gray-50">
                    Unfeature
                  </button>
                </>
              )}
              <button
                onClick={() => setConfirming({ kind: 'bulk', ids: selectedIds })}
                className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                Delete ({selectedIds.length})
              </button>
            </>
          )}
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
          >
            <Download size={13} /> CSV
          </button>
        </div>
      </div>

      {/* Table */}
      {/* Horizontal-only scroll: an inner vertical scroller doubled up with the
          page scrollbar. Sticky headers now pin against the page scroll. */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky top-0 z-10 w-10 border-b border-gray-200 bg-gray-50 px-3 py-2.5">
                <input
                  type="checkbox"
                  aria-label="Select all on page"
                  className="h-4 w-4 accent-brand-orange"
                  checked={allOnPage}
                  onChange={toggleAllOnPage}
                />
              </th>
              {columns.map((c) => (
                <th
                  key={c.name}
                  onClick={() => headerClick(c.name)}
                  className="sticky top-0 z-10 cursor-pointer select-none whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2.5 text-start text-xs font-bold uppercase tracking-wide text-gray-500 hover:text-gray-800"
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label.split('(')[0].split('—')[0].trim() || c.name}
                    {sort?.col === c.name && (sort.dir === 1 ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </span>
                </th>
              ))}
              <th className="sticky top-0 z-10 w-28 border-b border-gray-200 bg-gray-50 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((it) => (
              <tr
                key={it.id}
                onClick={() => onEdit(it)}
                className="cursor-pointer border-b border-gray-100 last:border-b-0 odd:bg-white even:bg-gray-50/60 hover:bg-amber-50/60"
              >
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label="Select row"
                    className="h-4 w-4 accent-brand-orange"
                    checked={selected.has(String(it.id))}
                    onChange={() => toggleOne(String(it.id))}
                  />
                </td>
                {columns.map((c) => (
                  <td key={c.name} className="px-3 py-2">
                    <Cell field={c} item={it} onToggle={onToggle} />
                  </td>
                ))}
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1 text-gray-400">
                    <button onClick={() => onEdit(it)} title="Edit" className="rounded-md p-1.5 hover:bg-gray-100 hover:text-gray-700">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => onDuplicate(it)} title="Duplicate" className="rounded-md p-1.5 hover:bg-gray-100 hover:text-gray-700">
                      <Copy size={15} />
                    </button>
                    <button onClick={() => setConfirming({ kind: 'row', item: it })} title="Delete" className="rounded-md p-1.5 hover:bg-red-50 hover:text-red-600">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 2} className="px-3 py-10 text-center text-gray-400">
                  {needle ? 'Nothing matches this search.' : 'No items yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {sorted.length > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-end gap-3 text-sm text-gray-500">
          <span>
            {cur * PAGE_SIZE + 1}–{Math.min((cur + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={cur === 0}
            className="rounded-full border border-gray-300 bg-white p-1.5 disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
            disabled={cur >= pages - 1}
            className="rounded-full border border-gray-300 bg-white p-1.5 disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      {confirming?.kind === 'row' && (
        <ConfirmDialog
          title={`Delete "${confirming.item[conf.listLabel] || confirming.item.id}"?`}
          message="This cannot be undone."
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            onDeleteMany([String(confirming.item.id)]);
            setSelected((s) => { const n = new Set(s); n.delete(String(confirming.item.id)); return n; });
            setConfirming(null);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}
      {confirming?.kind === 'bulk' && (
        <ConfirmDialog
          title={`Delete ${confirming.ids.length} item${confirming.ids.length === 1 ? '' : 's'}?`}
          message="They will be removed one by one. This cannot be undone."
          confirmLabel={`Delete ${confirming.ids.length}`}
          danger
          onConfirm={() => {
            onDeleteMany(confirming.ids);
            setSelected(new Set());
            setConfirming(null);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}

function Cell({ field, item, onToggle }: { field: Field; item: any; onToggle: (item: any, field: string, value: boolean) => void }) {
  const v = item[field.name];

  if (IMG_FIELDS.includes(field.name)) {
    // Badge icons are emoji, not paths — only path-looking values become thumbnails.
    if (typeof v === 'string' && v && /[./]/.test(v)) return <MediaImage path={v} className="h-8 w-8 rounded-md" />;
    if (v) return <span>{String(v)}</span>;
    return <span className="text-gray-300">—</span>;
  }

  if (isBoolField(field)) {
    const on = isOn(v);
    const dot = <span className={`inline-block h-2.5 w-2.5 rounded-full ${on ? 'bg-emerald-500' : 'bg-gray-300'}`} />;
    if (TOGGLEABLE.includes(field.name)) {
      return (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle(item, field.name, !on); }}
          title={`${field.name}: ${on ? 'on' : 'off'} — click to toggle`}
          className="rounded-md p-1 hover:bg-gray-100"
        >
          {dot}
        </button>
      );
    }
    return <span title={on ? 'yes' : 'no'}>{dot}</span>;
  }

  const text = cellText(v);
  if (!text) return <span className="text-gray-300">—</span>;
  return (
    <span className="block max-w-[260px] truncate" title={text.length > 32 ? text : undefined}>
      {text}
    </span>
  );
}
