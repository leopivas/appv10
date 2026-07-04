import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth, authFetch } from "@/context/auth-context";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  UploadCloud, Search, Grid3x3, List, Star, Copy, Pencil, Trash2,
  Image, CheckCircle2, XCircle, Loader2, FolderOpen, HardDrive, X, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  category: string;
  size: number;
  mimeType: string;
  width: number | null;
  height: number | null;
  createdAt: string;
}

interface UploadTask {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

const CATEGORIES = ["Todos", "Geral", "Banners", "Logos", "QR Codes", "Thumbnails"];
const CATEGORY_OPTS = ["Geral", "Banners", "Logos", "QR Codes", "Thumbnails"];

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Album() {
  const { user, token } = useAuth();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<UploadTask[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("media_favorites") ?? "[]") as string[]); }
    catch { return new Set(); }
  });
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [storage, setStorage] = useState<{ used: number; limit: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fileUrl = useCallback((item: MediaItem) =>
    `${window.location.origin}/api/media/files/${user?.id}/${item.filename}`, [user?.id]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await authFetch("/media", token) as { items: MediaItem[] };
      setItems(data.items ?? []);
    } catch { /* ignore */ }
    try {
      const s = await authFetch(`/media/storage?plan=${user?.plan ?? "free"}`, token) as { used: number; limit: number };
      setStorage(s);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token, user?.plan]);

  useEffect(() => { void load(); }, [load]);

  function saveFavorites(next: Set<string>) {
    setFavorites(next);
    localStorage.setItem("media_favorites", JSON.stringify([...next]));
  }

  function toggleFav(id: string) {
    const next = new Set(favorites);
    next.has(id) ? next.delete(id) : next.add(id);
    saveFavorites(next);
  }

  function copyUrl(item: MediaItem) {
    void navigator.clipboard.writeText(fileUrl(item));
    setCopied(item.id);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleDelete() {
    if (!deleteTarget || !token) return;
    await authFetch(`/media/${deleteTarget.id}`, token, { method: "DELETE" });
    setItems((prev) => prev.filter((it) => it.id !== deleteTarget.id));
    setStorage((prev) => prev ? { ...prev, used: prev.used - deleteTarget.size } : prev);
    setDeleteTarget(null);
  }

  async function commitRename() {
    if (!renaming || !token) return;
    const { id, value } = renaming;
    setRenaming(null);
    if (!value.trim()) return;
    await authFetch(`/media/${id}`, token, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: value.trim() }),
    });
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, originalName: value.trim() } : it));
  }

  async function changeCategory(id: string, cat: string) {
    if (!token) return;
    await authFetch(`/media/${id}`, token, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: cat }),
    });
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, category: cat } : it));
  }

  function uploadFiles(files: File[]) {
    const allowed = files.filter((f) =>
      ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(f.type)
    );
    if (!allowed.length) return;

    const tasks: UploadTask[] = allowed.map((f) => ({
      id: Math.random().toString(36).slice(2),
      name: f.name,
      progress: 0,
      status: "uploading",
    }));
    setUploads((prev) => [...tasks, ...prev]);

    allowed.forEach((file, i) => {
      const taskId = tasks[i].id;
      const xhr = new XMLHttpRequest();
      const fd = new FormData();
      fd.append("file", file);
      fd.append("plan", user?.plan ?? "free");

      xhr.upload.addEventListener("progress", (e) => {
        if (!e.lengthComputable) return;
        const pct = Math.round((e.loaded / e.total) * 100);
        setUploads((prev) => prev.map((t) => t.id === taskId ? { ...t, progress: pct } : t));
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          try {
            const { item } = JSON.parse(xhr.responseText) as { item: MediaItem };
            setItems((prev) => [item, ...prev]);
            setStorage((prev) => prev ? { ...prev, used: prev.used + item.size } : prev);
            setUploads((prev) => prev.map((t) =>
              t.id === taskId ? { ...t, status: "done", progress: 100 } : t));
          } catch {
            setUploads((prev) => prev.map((t) =>
              t.id === taskId ? { ...t, status: "error", error: "Resposta inválida" } : t));
          }
        } else {
          try {
            const { error } = JSON.parse(xhr.responseText) as { error: string };
            setUploads((prev) => prev.map((t) =>
              t.id === taskId ? { ...t, status: "error", error } : t));
          } catch {
            setUploads((prev) => prev.map((t) =>
              t.id === taskId ? { ...t, status: "error", error: `Erro ${xhr.status}` } : t));
          }
        }
        setTimeout(() => {
          setUploads((prev) => prev.filter((t) => t.id !== taskId));
        }, 3000);
      });

      xhr.addEventListener("error", () => {
        setUploads((prev) => prev.map((t) =>
          t.id === taskId ? { ...t, status: "error", error: "Falha de conexão" } : t));
        setTimeout(() => {
          setUploads((prev) => prev.filter((t) => t.id !== taskId));
        }, 3000);
      });

      const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      xhr.open("POST", `${base}/api/media/upload`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.send(fd);
    });
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    uploadFiles(files);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    uploadFiles(files);
  }

  const filtered = items
    .filter((it) => category === "Todos" || it.category === category)
    .filter((it) => !search || it.originalName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const fa = favorites.has(a.id) ? 0 : 1;
      const fb = favorites.has(b.id) ? 0 : 1;
      if (fa !== fb) return fa - fb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const storePct = storage ? Math.min(100, Math.round((storage.used / storage.limit) * 100)) : 0;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white">Biblioteca de Mídia</h1>
        <p className="text-sm text-zinc-400">Faça upload de imagens para usar em overlays e alertas.</p>
      </div>

      {/* Storage bar */}
      {storage && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-zinc-300">
              <HardDrive className="w-4 h-4 text-purple-400" />
              Armazenamento
            </span>
            <span className="text-zinc-400">
              {formatBytes(storage.used)} / {formatBytes(storage.limit)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", storePct > 90 ? "bg-red-500" : "bg-purple-500")}
              style={{ width: `${storePct}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500">
            {items.length} arquivo{items.length !== 1 ? "s" : ""} · {storePct}% usado
          </p>
        </div>
      )}

      {/* Upload zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors",
          dragging
            ? "border-purple-500 bg-purple-500/10"
            : "border-zinc-700 hover:border-zinc-500 bg-zinc-900/40"
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        aria-label="Área de upload"
      >
        <UploadCloud className={cn("w-10 h-10 transition-colors", dragging ? "text-purple-400" : "text-zinc-500")} />
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-300">
            {dragging ? "Solte para fazer upload" : "Arraste imagens ou clique para selecionar"}
          </p>
          <p className="text-xs text-zinc-500 mt-1">PNG, JPG, GIF, WebP · máx. 50 MB por arquivo</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          multiple
          className="hidden"
          onChange={onFileInput}
        />
      </div>

      {/* Upload progress tasks */}
      {uploads.length > 0 && (
        <div className="flex flex-col gap-2">
          {uploads.map((t) => (
            <div key={t.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-3">
              {t.status === "uploading" && <Loader2 className="w-4 h-4 text-purple-400 animate-spin shrink-0" />}
              {t.status === "done" && <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />}
              {t.status === "error" && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-300 truncate">{t.name}</p>
                {t.status === "uploading" && (
                  <div className="mt-1.5 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all"
                      style={{ width: `${t.progress}%` }}
                    />
                  </div>
                )}
                {t.status === "error" && <p className="text-xs text-red-400 mt-0.5">{t.error}</p>}
                {t.status === "done" && <p className="text-xs text-green-400 mt-0.5">Upload concluído!</p>}
              </div>
              {t.status === "uploading" && (
                <span className="text-xs text-zinc-500 shrink-0">{t.progress}%</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Filters & view toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome..."
            className="pl-9 bg-zinc-900 border-zinc-700 text-sm"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap",
                category === cat
                  ? "bg-purple-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          <button
            onClick={() => setView("grid")}
            className={cn(
              "p-2 rounded-lg transition-colors",
              view === "grid" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "p-2 rounded-lg transition-colors",
              view === "list" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-zinc-500 gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Carregando mídia...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          {items.length === 0 ? (
            <>
              <Image className="w-12 h-12 text-zinc-700" />
              <p className="text-zinc-400 font-medium">Nenhuma mídia ainda</p>
              <p className="text-zinc-600 text-sm">Faça upload de imagens para começar</p>
            </>
          ) : (
            <>
              <FolderOpen className="w-12 h-12 text-zinc-700" />
              <p className="text-zinc-400 font-medium">Nenhum resultado</p>
              <p className="text-zinc-600 text-sm">Tente outro filtro ou termo de busca</p>
            </>
          )}
        </div>
      )}

      {/* Grid view */}
      {!loading && filtered.length > 0 && view === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              url={fileUrl(item)}
              isFav={favorites.has(item.id)}
              isCopied={copied === item.id}
              isRenaming={renaming?.id === item.id}
              renameValue={renaming?.id === item.id ? renaming.value : ""}
              onFav={() => toggleFav(item.id)}
              onCopy={() => copyUrl(item)}
              onDelete={() => setDeleteTarget(item)}
              onRenameStart={() => setRenaming({ id: item.id, value: item.originalName })}
              onRenameChange={(v) => setRenaming((r) => r ? { ...r, value: v } : r)}
              onRenameCommit={() => void commitRename()}
              onRenameCancel={() => setRenaming(null)}
              onCategoryChange={(cat) => void changeCategory(item.id, cat)}
            />
          ))}
        </div>
      )}

      {/* List view */}
      {!loading && filtered.length > 0 && view === "list" && (
        <div className="flex flex-col gap-1">
          {filtered.map((item) => (
            <ListRow
              key={item.id}
              item={item}
              url={fileUrl(item)}
              isFav={favorites.has(item.id)}
              isCopied={copied === item.id}
              isRenaming={renaming?.id === item.id}
              renameValue={renaming?.id === item.id ? renaming.value : ""}
              onFav={() => toggleFav(item.id)}
              onCopy={() => copyUrl(item)}
              onDelete={() => setDeleteTarget(item)}
              onRenameStart={() => setRenaming({ id: item.id, value: item.originalName })}
              onRenameChange={(v) => setRenaming((r) => r ? { ...r, value: v } : r)}
              onRenameCommit={() => void commitRename()}
              onRenameCancel={() => setRenaming(null)}
              onCategoryChange={(cat) => void changeCategory(item.id, cat)}
            />
          ))}
        </div>
      )}

      {/* Delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Excluir arquivo?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              <strong className="text-zinc-300">{deleteTarget?.originalName}</strong> será excluído permanentemente.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface CardProps {
  item: MediaItem;
  url: string;
  isFav: boolean;
  isCopied: boolean;
  isRenaming: boolean;
  renameValue: string;
  onFav: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onRenameStart: () => void;
  onRenameChange: (v: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
  onCategoryChange: (cat: string) => void;
}

function MediaCard({
  item, url, isFav, isCopied, isRenaming, renameValue,
  onFav, onCopy, onDelete, onRenameStart, onRenameChange, onRenameCommit, onRenameCancel, onCategoryChange,
}: CardProps) {
  return (
    <div className="group relative bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-600 transition-colors">
      {/* Thumbnail */}
      <div className="aspect-square bg-zinc-800 relative overflow-hidden">
        <img
          src={url}
          alt={item.originalName}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
          <div className="flex justify-between">
            <button
              onClick={onFav}
              className={cn("p-1 rounded-md", isFav ? "text-yellow-400" : "text-white/70 hover:text-yellow-400")}
            >
              <Star className="w-4 h-4" fill={isFav ? "currentColor" : "none"} />
            </button>
            <button onClick={onDelete} className="p-1 rounded-md text-white/70 hover:text-red-400">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-1">
            <button
              onClick={onCopy}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-xs font-medium transition-colors",
                isCopied
                  ? "bg-green-600 text-white"
                  : "bg-white/10 text-white hover:bg-white/20"
              )}
            >
              {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {isCopied ? "Copiado!" : "URL"}
            </button>
            <button
              onClick={onRenameStart}
              className="p-1.5 rounded-md bg-white/10 text-white hover:bg-white/20"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-2">
        {isRenaming ? (
          <div className="flex gap-1">
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => onRenameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onRenameCommit();
                if (e.key === "Escape") onRenameCancel();
              }}
              className="flex-1 min-w-0 bg-zinc-800 text-white text-xs px-1.5 py-1 rounded border border-purple-500 outline-none"
            />
            <button onClick={onRenameCommit} className="text-green-400 hover:text-green-300">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={onRenameCancel} className="text-zinc-500 hover:text-zinc-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <p className="text-xs text-zinc-300 truncate font-medium" title={item.originalName}>
            {item.originalName}
          </p>
        )}
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-zinc-600">
            {formatBytes(item.size)}
            {item.width && item.height ? ` · ${item.width}×${item.height}` : ""}
          </span>
          <Select value={item.category} onValueChange={onCategoryChange}>
            <SelectTrigger className="h-5 text-[10px] px-1.5 py-0 bg-zinc-800 border-zinc-700 w-auto gap-1 min-w-0 max-w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              {CATEGORY_OPTS.map((c) => (
                <SelectItem
                  key={c}
                  value={c}
                  className="text-xs text-zinc-300 focus:bg-zinc-800 focus:text-white"
                >
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function ListRow({
  item, url, isFav, isCopied, isRenaming, renameValue,
  onFav, onCopy, onDelete, onRenameStart, onRenameChange, onRenameCommit, onRenameCancel, onCategoryChange,
}: CardProps) {
  return (
    <div className="group flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 hover:border-zinc-600 transition-colors">
      <img
        src={url}
        alt={item.originalName}
        className="w-10 h-10 rounded-lg object-cover shrink-0 bg-zinc-800"
        loading="lazy"
      />

      {/* Name */}
      <div className="flex-1 min-w-0">
        {isRenaming ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => onRenameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onRenameCommit();
                if (e.key === "Escape") onRenameCancel();
              }}
              className="flex-1 min-w-0 bg-zinc-800 text-white text-sm px-2 py-1 rounded border border-purple-500 outline-none"
            />
            <button onClick={onRenameCommit} className="text-green-400 hover:text-green-300">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={onRenameCancel} className="text-zinc-500 hover:text-zinc-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <p className="text-sm text-zinc-200 truncate font-medium">{item.originalName}</p>
        )}
        <p className="text-xs text-zinc-500">
          {formatDate(item.createdAt)} · {formatBytes(item.size)}
          {item.width && item.height ? ` · ${item.width}×${item.height}` : ""}
        </p>
      </div>

      {/* Category */}
      <Select value={item.category} onValueChange={onCategoryChange}>
        <SelectTrigger className="h-7 text-xs px-2 bg-zinc-800 border-zinc-700 w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-700">
          {CATEGORY_OPTS.map((c) => (
            <SelectItem
              key={c}
              value={c}
              className="text-xs text-zinc-300 focus:bg-zinc-800 focus:text-white"
            >
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Badge */}
      <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400 shrink-0">
        {item.mimeType.split("/")[1].toUpperCase()}
      </Badge>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onFav}
          className={cn("p-1.5 rounded-lg", isFav ? "text-yellow-400" : "text-zinc-600 hover:text-yellow-400")}
        >
          <Star className="w-4 h-4" fill={isFav ? "currentColor" : "none"} />
        </button>
        <button
          onClick={onCopy}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            isCopied ? "text-green-400" : "text-zinc-600 hover:text-zinc-300"
          )}
          title="Copiar URL"
        >
          {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
        <button
          onClick={onRenameStart}
          className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
