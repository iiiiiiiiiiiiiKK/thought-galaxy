import type { NodeData, EdgeData, DailyThoughtData } from '../utils/types';
import { dateKey } from '../utils/format';

const DAY = 86_400_000;

/** Demonstration dataset. Every record carries `isDemo: true` so it can be purged safely. */
export function makeDemoNodes(): NodeData[] {
  const now = Date.now();
  const nodes: Array<Omit<NodeData, 'createdAt' | 'updatedAt'>> = [
    {
      id: 'demo-ai',
      type: 'idea',
      title: '通用人工智能的幻想',
      body: '假设一台机器能把一个人的全部笔记串成一张星图，知识会变成什么样子？',
      tags: ['AI', 'Demo', '幻想'],
      color: '#3b82f6',
      x: 100,
      y: -100,
      size: 1.25,
      isPinned: false,
      isDemo: true,
    },
    {
      id: 'demo-internet',
      type: 'note',
      title: '互联网的演进：从文档到星系',
      body: '早期网页像一座座孤立的静态星球，现代应用更像有轨道的星系。Web 本应是把知识铺在空间里，而不是塞进一层层的文件夹里。',
      tags: ['互联网', 'Demo'],
      color: '#22c55e',
      x: -150,
      y: 30,
      size: 1.0,
      isPinned: false,
      isDemo: true,
    },
    {
      id: 'demo-startup',
      type: 'project',
      title: '星系笔记创业计划',
      body: 'Thought Galaxy 不是文件夹，而是一张无限画布上的知识宇宙。',
      tags: ['创业', 'Demo'],
      color: '#f59e0b',
      x: -50,
      y: -280,
      size: 1.15,
      isPinned: false,
      isDemo: true,
    },
    {
      id: 'demo-design',
      type: 'article',
      title: '无限画布的视觉语言',
      body: '深空背景、低对比度连线、选中时的光晕。视觉应当服务于探索，而不是装饰。每一颗星球都必须对应一条真实内容。',
      tags: ['设计', 'Demo'],
      color: '#a855f7',
      x: 250,
      y: 160,
      size: 0.9,
      isPinned: false,
      isDemo: true,
    },
    {
      id: 'demo-crypto',
      type: 'inspiration',
      title: '加密货币与去中心化知识',
      body: '用户应当拥有自己的数据：本地优先、无需登录、可完整导出备份。',
      tags: ['加密货币', 'Demo'],
      color: '#ec4899',
      x: -250,
      y: -120,
      size: 1.0,
      isPinned: false,
      isDemo: true,
    },
    {
      id: 'demo-learning',
      type: 'goal',
      title: '学习 React 与 Canvas 渲染',
      body: '目标：\n\n- [x] 用 Canvas 绘制星球\n- [x] 支持缩放与平移\n- [ ] 支持 1000+ 星球的流畅渲染',
      tags: ['学习', 'Demo'],
      color: '#06b6d4',
      x: 330,
      y: -330,
      size: 0.8,
      isPinned: false,
      isDemo: true,
    },
  ];

  return nodes.map((node, index) => ({
    ...node,
    createdAt: now - DAY * (45 - index * 5),
    updatedAt: now - DAY * (12 - index),
  }));
}

export function makeDemoEdges(): EdgeData[] {
  const now = Date.now();
  const u = (days: number) => now - days * DAY;
  return [
    { id: 'demo-edge-1', source: 'demo-ai', target: 'demo-internet', relation: 'extends', createdAt: u(40) },
    { id: 'demo-edge-2', source: 'demo-ai', target: 'demo-crypto', relation: 'reference', createdAt: u(35) },
    { id: 'demo-edge-3', source: 'demo-internet', target: 'demo-design', relation: 'related', createdAt: u(25) },
    { id: 'demo-edge-4', source: 'demo-startup', target: 'demo-ai', relation: 'inspiration', createdAt: u(15) },
    { id: 'demo-edge-5', source: 'demo-learning', target: 'demo-design', relation: 'causal', createdAt: u(3) },
  ];
}

export function makeDemoThoughts(): DailyThoughtData[] {
  const now = Date.now();
  const offsets = [6, 5, 4, 2, 1];
  return offsets.map((offset, index) => {
    const stamp = now - offset * DAY;
    return {
      id: `demo-thought-${index + 1}`,
      date: dateKey(stamp),
      content: `今日灵感 ${index + 1}：放弃文件夹，把笔记当作星球来看。`,
      createdAt: stamp,
    };
  });
}