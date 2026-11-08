import { useEffect, useMemo, useRef, useState } from 'react';
import { Globe, Loader2, Save, Sparkles } from 'lucide-react';
import { useGalaxyStore } from '../../store/galaxy';
import { useUIStore } from '../../store/ui';
import { Button, Field, TextArea, TextInput } from '../ui/primitives';
import { Sheet } from '../ui/Sheet';
import { Markdown } from '../ui/Markdown';
import { NODE_TYPE_COLORS, NODE_TYPE_LABELS, type NodeType } from '../../utils/types';
import { TAG_PALETTE } from '../../utils/colors';

const TYPES = Object.keys(NODE_TYPE_LABELS) as NodeType[];

/** Best-effort URL metadata. Everything is optional and never fabricated. */
async function fetchPageMeta(url: string): Promise<{ title: string; description: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, { signal: controller.signal, mode: 'cors', credentials: 'omit' });
    if (!response.ok) return null;
    const html = (await response.text()).slice(0, 400_000);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const og = (name: string) =>
      doc.querySelector(`meta[property="${name}"],meta[name="${name}"]`)?.getAttribute('content') ?? '';
    const title = og('og:title') || doc.querySelector('title')?.textContent?.trim() || '';
    const description = og('og:description') || og('description') || '';
    if (!title && !description) return null;
    return { title: title.slice(0, 200), description: description.slice(0, 500) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function NodeEditorPanel() {
  const nodes = useGalaxyStore((s) => s.nodes);
  const createNode = useGalaxyStore((s) => s.createNode);
  const updateNode = useGalaxyStore((s) => s.updateNode);

  const editingNodeId = useUIStore((s) => s.editingNodeId);
  const closePanel = useUIStore((s) => s.closePanel);
  const selectNode = useUIStore((s) => s.selectNode);
  const pushToast = useUIStore((s) => s.pushToast);
  const viewport = useUIStore((s) => s.viewport);

  const existing = useMemo(
    () => (editingNodeId ? nodes.find((node) => node.id === editingNodeId) : undefined),
    [editingNodeId, nodes],
  );

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<NodeType>('idea');
  const [tags, setTags] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [size, setSize] = useState(1);
  const [url, setUrl] = useState('');
  const [metaBusy, setMetaBusy] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setBody(existing.body);
      setType(existing.type);
      setTags(existing.tags.join(', '));
      setColor(existing.color);
      setSize(existing.size);
      setUrl(typeof existing.meta?.url === 'string' ? (existing.meta.url as string) : '');
    } else {
      setTitle('');
      setBody('');
      setType('idea');
      setTags('');
      setColor('#3b82f6');
      setSize(1);
      setUrl('');
    }
    setShowPreview(false);
    setError(null);
    const timer = setTimeout(() => titleRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, [existing, editingNodeId]);

  const handlePaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = event.clipboardData.getData('text').trim();
    if (!/^https?:\/\/\S+$/.test(text)) return;
    event.preventDefault();
    setUrl(text);
    setType('webpage');
    if (!title) {
      setMetaBusy(true);
      const meta = await fetchPageMeta(text);
      setMetaBusy(false);
      if (meta) {
        setTitle(meta.title || text);
        if (!body && meta.description) setBody(`> ${meta.description}`);
        pushToast('已获取网页标题与描述', 'success');
      } else {
        setTitle((current) => current || text);
        pushToast('无法自动获取网页信息（可能受跨域限制），请手动填写标题与描述', 'error');
      }
    }
  };

  const handleFetchMeta = async () => {
    if (!/^https?:\/\/\S+$/.test(url)) {
      setError('请输入有效的 http(s) 链接');
      return;
    }
    setMetaBusy(true);
    const meta = await fetchPageMeta(url);
    setMetaBusy(false);
    if (meta) {
      if (meta.title) setTitle(meta.title);
      if (meta.description && !body.trim()) setBody(`> ${meta.description}`);
      pushToast('已获取网页信息', 'success');
    } else {
      pushToast('无法获取网页元数据（跨域受限），请手动填写', 'error');
    }
  };

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('请填写标题');
      titleRef.current?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    const tagList = [...new Set(tags.split(/[,，#\s]+/).map((tag) => tag.trim()).filter(Boolean))];
    const meta =
      type === 'webpage' && url
        ? { ...(existing?.meta ?? {}), url }
        : existing?.meta;

    try {
      if (existing) {
        await updateNode(existing.id, {
          title: trimmed,
          body,
          type,
          tags: tagList,
          color,
          size,
          meta,
        });
        pushToast('星球已更新', 'success');
        selectNode(existing.id);
      } else {
        const node = await createNode({
          title: trimmed,
          body,
          type,
          tags: tagList,
          color,
          size,
          meta,
          x: (window.innerWidth / 2 - viewport.x) / viewport.zoom,
          y: (window.innerHeight / 2 - viewport.y) / viewport.zoom,
        });
        pushToast('已创建新星球', 'success');
        selectNode(node.id);
      }
      setSaving(false);
    } catch (cause) {
      setSaving(false);
      setError(cause instanceof Error ? cause.message : '保存失败，请重试');
    }
  };

  const charCount = body.length;

  return (
    <Sheet
      title={existing ? '编辑星球' : '新建星球'}
      subtitle={existing ? existing.title : '每一条内容都是一颗星球'}
      icon={<Sparkles className="h-4 w-4 text-sky-400" />}
      onClose={closePanel}
      testId="node-editor"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="primary" className="flex-1" onClick={handleSave} disabled={saving} data-testid="save-node">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {existing ? '保存修改' : '创建星球'}
          </Button>
          <Button variant="ghost" onClick={() => setShowPreview((v) => !v)}>
            {showPreview ? '编辑' : '预览'}
          </Button>
        </div>
      }
    >
      {error ? (
        <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">{error}</p>
      ) : null}

      <div className="space-y-3.5">
        <Field label="标题" required>
          <TextInput
            ref={titleRef}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="给这颗星球起个名字"
            maxLength={160}
            data-testid="node-title"
          />
        </Field>

        <Field label="内容类型">
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((option) => {
              const active = option === type;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setType(option);
                    setColor(NODE_TYPE_COLORS[option]);
                  }}
                  className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition ${
                    active
                      ? 'border-sky-400/60 bg-sky-500/15 text-sky-200'
                      : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200'
                  }`}
                >
                  {NODE_TYPE_LABELS[option]}
                </button>
              );
            })}
          </div>
        </Field>

        {type === 'webpage' ? (
          <Field label="网页链接" hint="粘贴链接后会自动尝试获取标题与描述；获取失败时请手动填写，不会伪造信息。">
            <div className="flex gap-1.5">
              <TextInput
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/article"
                inputMode="url"
              />
              <Button size="sm" onClick={handleFetchMeta} disabled={metaBusy} className="shrink-0">
                {metaBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
                获取
              </Button>
            </div>
          </Field>
        ) : null}

        <Field label="正文（支持 Markdown）" hint={`${charCount} 字符 · 支持 #标题、- 列表、**粗体**、> 引用、\`代码\``}>
          {showPreview ? (
            <div className="min-h-[220px] rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              {body.trim() ? <Markdown source={body} /> : <p className="text-xs italic text-slate-600">还没有内容</p>}
            </div>
          ) : (
            <TextArea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              onPaste={handlePaste}
              rows={12}
              placeholder={'写下你的想法…\n\n支持 Markdown，粘贴网页链接可快速收藏。'}
              data-testid="node-body"
            />
          )}
        </Field>

        <Field label="标签" hint="用逗号或空格分隔，例如：AI, 读书, 创业">
          <TextInput
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="AI, 读书, 创业"
            data-testid="node-tags"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="星球颜色">
            <div className="flex flex-wrap gap-1.5">
              {TAG_PALETTE.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => setColor(swatch)}
                  aria-label={`颜色 ${swatch}`}
                  className={`h-6 w-6 rounded-full border transition ${
                    color === swatch ? 'scale-110 border-white' : 'border-white/20 hover:scale-105'
                  }`}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
          </Field>
          <Field label={`星球大小 ${size.toFixed(1)}×`}>
            <input
              type="range"
              min={0.6}
              max={2.2}
              step={0.1}
              value={size}
              onChange={(event) => setSize(Number(event.target.value))}
              className="mt-2 w-full accent-sky-500"
            />
          </Field>
        </div>
      </div>
    </Sheet>
  );
}