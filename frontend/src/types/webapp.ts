export type WbNodeId = string

export type WbNodeType =
  | 'screen'    // root page container (always exists, can't delete)
  | 'box'       // flex container
  | 'row'       // horizontal flex
  | 'text'      // paragraph / heading
  | 'button'    // tappable button
  | 'image'     // img element
  | 'input'     // text input
  | 'textarea'  // multiline input
  | 'card'      // styled surface
  | 'divider'   // horizontal rule
  | 'spacer'    // empty gap
  | 'badge'     // small label chip
  | 'avatar'    // circular image/initials

export interface WbStyle {
  width?: string | number
  height?: string | number
  minHeight?: number
  maxWidth?: number
  flex?: number
  padding?: number | number[]
  margin?: number | number[]
  bg?: string
  color?: string
  fontSize?: number
  fontWeight?: 300 | 400 | 500 | 600 | 700 | 800
  lineHeight?: number
  textAlign?: 'left' | 'center' | 'right'
  letterSpacing?: number
  borderRadius?: number | number[]
  border?: string
  shadow?: string
  opacity?: number
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto'
  display?: 'flex' | 'block' | 'grid' | 'none'
  flexDir?: 'row' | 'column'
  gap?: number
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline'
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around'
  wrap?: 'wrap' | 'nowrap'
  position?: 'relative' | 'absolute' | 'fixed' | 'sticky'
  top?: number
  bottom?: number
  left?: number
  right?: number
  zIndex?: number
  backdropFilter?: string
  cursor?: string
  transition?: string
  objectFit?: 'cover' | 'contain' | 'fill' | 'none'
}

export interface WbNode {
  id: WbNodeId
  type: WbNodeType
  parentId: WbNodeId | null
  children: WbNodeId[]
  order: number
  props: Record<string, unknown>
  style: WbStyle
  meta?: {
    name?: string
    locked?: boolean
    hidden?: boolean
  }
}

export interface WbPage {
  id: string
  name: string
  slug: string
  rootNodeId: WbNodeId
  nodes: Record<WbNodeId, WbNode>
  bgColor?: string
}

export interface WbTheme {
  primary: string
  bg: string
  surface: string
  text: string
  subtext: string
  border: string
  radius: number
}

export interface WbApp {
  id: string
  botId: string
  name: string
  pages: WbPage[]
  theme: WbTheme
  updatedAt: number
}

export const DEFAULT_THEME: WbTheme = {
  primary: '#2481cc',
  bg: '#17212b',
  surface: '#242f3d',
  text: '#ffffff',
  subtext: '#7d9ab5',
  border: '#253545',
  radius: 12,
}
