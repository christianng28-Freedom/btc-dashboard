declare module 'react-simple-maps' {
  import { ReactNode, CSSProperties, MouseEvent } from 'react'

  interface ProjectionConfig {
    scale?: number
    center?: [number, number]
    rotate?: [number, number, number]
  }

  interface ComposableMapProps {
    projectionConfig?: ProjectionConfig
    projection?: string
    width?: number
    height?: number
    style?: CSSProperties
    className?: string
    children?: ReactNode
  }

  interface GeographyFeature {
    rsmKey: string
    id: string | number
    type: string
    geometry: unknown
    properties: Record<string, unknown>
  }

  interface GeographiesProps {
    geography: string | object
    children: (props: { geographies: GeographyFeature[] }) => ReactNode
  }

  interface GeographyProps {
    key?: string
    geography: GeographyFeature
    style?: {
      default?: CSSProperties
      hover?: CSSProperties
      pressed?: CSSProperties
    }
    fill?: string
    stroke?: string
    strokeWidth?: number
    onClick?: (geo: GeographyFeature, evt: MouseEvent) => void
    onMouseEnter?: (geo: GeographyFeature, evt: MouseEvent) => void
    onMouseLeave?: (geo: GeographyFeature, evt: MouseEvent) => void
    className?: string
  }

  interface ZoomableGroupProps {
    center?: [number, number]
    zoom?: number
    minZoom?: number
    maxZoom?: number
    translateExtent?: [[number, number], [number, number]]
    onMoveStart?: (position: { coordinates: [number, number]; zoom: number }) => void
    onMove?: (position: { x: number; y: number; k: number; dragging: boolean }) => void
    onMoveEnd?: (position: { coordinates: [number, number]; zoom: number }) => void
    children?: ReactNode
    style?: CSSProperties
    className?: string
  }

  export function ComposableMap(props: ComposableMapProps): JSX.Element
  export function Geographies(props: GeographiesProps): JSX.Element
  export function Geography(props: GeographyProps): JSX.Element
  export function ZoomableGroup(props: ZoomableGroupProps): JSX.Element
}
