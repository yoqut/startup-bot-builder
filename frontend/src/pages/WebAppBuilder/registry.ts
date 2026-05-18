import type { WbNodeType, WbStyle } from '@/types/webapp'

export interface PropConfig {
  key: string
  label: string
  type: 'text' | 'number' | 'color' | 'select' | 'toggle' | 'textarea' | 'url'
  options?: string[]
  min?: number
  max?: number
  placeholder?: string
}

export interface ComponentDef {
  type: WbNodeType
  label: string
  icon: string   // lucide icon name (used in palette)
  category: 'layout' | 'basic' | 'form' | 'display'
  canHaveChildren: boolean
  defaultProps: Record<string, unknown>
  defaultStyle: WbStyle
  propsConfig: PropConfig[]
}

export const COMPONENT_REGISTRY: ComponentDef[] = [
  // ── Layout ────────────────────────────────────────────────────────────────
  {
    type: 'box',
    label: 'Box',
    icon: 'Square',
    category: 'layout',
    canHaveChildren: true,
    defaultProps: {},
    defaultStyle: {
      display: 'flex',
      flexDir: 'column',
      gap: 8,
      padding: 12,
      bg: 'rgba(255,255,255,0.04)',
      borderRadius: 12,
      width: '100%',
    },
    propsConfig: [],
  },
  {
    type: 'row',
    label: 'Row',
    icon: 'Columns2',
    category: 'layout',
    canHaveChildren: true,
    defaultProps: {},
    defaultStyle: {
      display: 'flex',
      flexDir: 'row',
      gap: 8,
      width: '100%',
      align: 'center',
    },
    propsConfig: [],
  },
  {
    type: 'card',
    label: 'Card',
    icon: 'RectangleHorizontal',
    category: 'layout',
    canHaveChildren: true,
    defaultProps: {},
    defaultStyle: {
      display: 'flex',
      flexDir: 'column',
      gap: 10,
      padding: 16,
      bg: '#242f3d',
      borderRadius: 16,
      width: '100%',
      shadow: '0 2px 16px rgba(0,0,0,0.25)',
    },
    propsConfig: [],
  },
  // ── Basic ─────────────────────────────────────────────────────────────────
  {
    type: 'text',
    label: 'Text',
    icon: 'Type',
    category: 'basic',
    canHaveChildren: false,
    defaultProps: {
      content: 'Matn kiriting',
      tag: 'p',
    },
    defaultStyle: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: 400,
      lineHeight: 1.5,
      width: '100%',
    },
    propsConfig: [
      { key: 'content', label: 'Matn', type: 'textarea', placeholder: 'Bu yerga matn kiriting' },
      { key: 'tag', label: 'Tag', type: 'select', options: ['p', 'h1', 'h2', 'h3', 'span', 'label'] },
    ],
  },
  {
    type: 'button',
    label: 'Button',
    icon: 'MousePointerClick',
    category: 'basic',
    canHaveChildren: false,
    defaultProps: {
      label: 'Tugma',
      variant: 'primary',
      size: 'md',
      fullWidth: true,
    },
    defaultStyle: {
      borderRadius: 12,
      fontWeight: 600,
      fontSize: 14,
      cursor: 'pointer',
      textAlign: 'center',
    },
    propsConfig: [
      { key: 'label', label: 'Matn', type: 'text', placeholder: 'Tugma matni' },
      { key: 'variant', label: 'Ko\'rinish', type: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
      { key: 'size', label: 'O\'lcham', type: 'select', options: ['sm', 'md', 'lg'] },
      { key: 'fullWidth', label: 'To\'liq kenglik', type: 'toggle' },
    ],
  },
  {
    type: 'image',
    label: 'Image',
    icon: 'Image',
    category: 'basic',
    canHaveChildren: false,
    defaultProps: {
      src: '',
      alt: '',
      fit: 'cover',
    },
    defaultStyle: {
      width: '100%',
      height: 180,
      borderRadius: 12,
      objectFit: 'cover',
      bg: '#1e2d3d',
    },
    propsConfig: [
      { key: 'src', label: 'URL', type: 'url', placeholder: 'https://...' },
      { key: 'alt', label: 'Alt matn', type: 'text', placeholder: 'Rasm tavsifi' },
      { key: 'fit', label: 'Fit', type: 'select', options: ['cover', 'contain', 'fill'] },
    ],
  },
  {
    type: 'spacer',
    label: 'Spacer',
    icon: 'AlignVerticalSpaceAround',
    category: 'basic',
    canHaveChildren: false,
    defaultProps: {},
    defaultStyle: {
      height: 16,
      width: '100%',
    },
    propsConfig: [],
  },
  {
    type: 'divider',
    label: 'Divider',
    icon: 'Minus',
    category: 'basic',
    canHaveChildren: false,
    defaultProps: {},
    defaultStyle: {
      height: 1,
      width: '100%',
      bg: '#253545',
    },
    propsConfig: [],
  },
  {
    type: 'badge',
    label: 'Badge',
    icon: 'Tag',
    category: 'display',
    canHaveChildren: false,
    defaultProps: {
      label: 'Badge',
      color: '#2481cc',
    },
    defaultStyle: {
      display: 'flex',
      padding: [4, 10],
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
    },
    propsConfig: [
      { key: 'label', label: 'Matn', type: 'text' },
      { key: 'color', label: 'Rang', type: 'color' },
    ],
  },
  {
    type: 'avatar',
    label: 'Avatar',
    icon: 'CircleUser',
    category: 'display',
    canHaveChildren: false,
    defaultProps: {
      src: '',
      initials: 'A',
      size: 40,
    },
    defaultStyle: {
      borderRadius: 9999,
      objectFit: 'cover',
      bg: '#2481cc',
    },
    propsConfig: [
      { key: 'src', label: 'Rasm URL', type: 'url' },
      { key: 'initials', label: 'Boshlang\'ich', type: 'text', placeholder: 'AB' },
      { key: 'size', label: 'O\'lcham', type: 'number', min: 24, max: 120 },
    ],
  },
  // ── Form ──────────────────────────────────────────────────────────────────
  {
    type: 'input',
    label: 'Input',
    icon: 'TextCursorInput',
    category: 'form',
    canHaveChildren: false,
    defaultProps: {
      placeholder: 'Kiriting...',
      label: '',
      type: 'text',
    },
    defaultStyle: {
      width: '100%',
      padding: [10, 14],
      bg: '#1e2d3d',
      color: '#ffffff',
      borderRadius: 10,
      border: '1px solid #253545',
      fontSize: 14,
    },
    propsConfig: [
      { key: 'label', label: 'Label', type: 'text' },
      { key: 'placeholder', label: 'Placeholder', type: 'text' },
      { key: 'type', label: 'Tur', type: 'select', options: ['text', 'email', 'number', 'tel', 'password'] },
    ],
  },
  {
    type: 'textarea',
    label: 'Textarea',
    icon: 'AlignLeft',
    category: 'form',
    canHaveChildren: false,
    defaultProps: {
      placeholder: 'Kiriting...',
      label: '',
      rows: 4,
    },
    defaultStyle: {
      width: '100%',
      padding: [10, 14],
      bg: '#1e2d3d',
      color: '#ffffff',
      borderRadius: 10,
      border: '1px solid #253545',
      fontSize: 14,
    },
    propsConfig: [
      { key: 'label', label: 'Label', type: 'text' },
      { key: 'placeholder', label: 'Placeholder', type: 'text' },
      { key: 'rows', label: 'Qatorlar', type: 'number', min: 2, max: 20 },
    ],
  },
]

// Quick lookup by type
export const COMPONENT_DEFAULTS: Partial<Record<WbNodeType, ComponentDef>> = Object.fromEntries(
  COMPONENT_REGISTRY.map((d) => [d.type, d])
)

export const CATEGORIES: { key: ComponentDef['category']; label: string }[] = [
  { key: 'layout', label: 'Layout' },
  { key: 'basic', label: 'Asosiy' },
  { key: 'form', label: 'Form' },
  { key: 'display', label: 'Ko\'rsatish' },
]
