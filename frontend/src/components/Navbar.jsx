import ApiStatusBadge from './ApiStatusBadge.jsx'

const NAV_LINKS = [
  { label: 'Product', href: '#product' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Technology', href: '#technology' },
  { label: 'Demo', href: '#search' },
]

function LensMark() {
  // Custom mark: an aperture-like bracket standing in for "lens over code",
  // built from primitives rather than a stock/generic icon.
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="30" height="30" rx="9" fill="#1C1530" />
      <circle cx="15" cy="15" r="6.25" stroke="#BDA3F0" strokeWidth="1.6" />
      <path d="M15 6.5V10M15 20V23.5M6.5 15H10M20 15H23.5" stroke="#F5F2FA" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-canvas/80 backdrop-blur-md">
      <div className="container-page grid h-[76px] grid-cols-[1fr_auto_1fr] items-center">
        <div className="flex items-center gap-3 justify-self-start">
          <a href="#top" className="flex items-center gap-2.5">
            <LensMark />
            <span className="text-[1.05rem] font-semibold tracking-tight text-ink">
              CodeLens
            </span>
          </a>
          <ApiStatusBadge className="hidden lg:inline-flex" />
        </div>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-8 rounded-full border border-line/80 bg-white/60 px-7 py-2.5 md:flex"
        >
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-[0.88rem] text-ink/70 transition-colors hover:text-ink"
            >
              {label}
            </a>
          ))}
        </nav>

        <a
          href="#search"
          className="justify-self-end rounded-full bg-ink px-5 py-2.5 text-[0.88rem] font-medium text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-soft"
        >
          Try CodeLens
        </a>
      </div>
    </header>
  )
}
