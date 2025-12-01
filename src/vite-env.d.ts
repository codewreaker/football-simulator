/// <reference types="vite/client" />

declare module '*.svg?react' {
  import * as React from 'react'
  const SVGComponent: React.VFC<React.SVGProps<SVGSVGElement> & { title?: string }>
  export default SVGComponent
}
