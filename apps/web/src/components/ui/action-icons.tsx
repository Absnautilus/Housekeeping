import type { SVGProps } from 'react'

// Matches the hand-drawn line style used everywhere else (dashboard-header,
// text-size toggle, empty states): 24x24 viewBox, no fill, 1.8 stroke, round
// caps/joins. One file so every row action button pulls from the same set.
const shared = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export function IconClaim(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...shared} {...props}>
      <path d="M12 4v10" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 19h14" />
    </svg>
  )
}

export function IconUndo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...shared} {...props}>
      <path d="M3 10h11a5 5 0 0 1 5 5v1" />
      <path d="M8 5 3 10l5 5" />
    </svg>
  )
}

export function IconCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...shared} {...props}>
      <path d="M4 12.5 9 17.5 20 6.5" />
    </svg>
  )
}

export function IconX(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...shared} {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  )
}

export function IconTrash(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...shared} {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />
      <path d="M6.5 7 7.3 19a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9L17.5 7" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  )
}

export function IconReturn(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...shared} {...props}>
      <path d="M4 9 12 4l8 5" />
      <path d="M4 9v9.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V9" />
      <path d="M9.5 13.5 12 16l4-4.5" />
    </svg>
  )
}
