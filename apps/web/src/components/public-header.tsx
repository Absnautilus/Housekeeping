import { Link } from 'react-router-dom'
import { Logo } from '@/components/logo'

export function PublicHeader() {
  return (
    <div className="mx-auto flex w-full max-w-xl items-center justify-between px-4 pt-6">
      <Link to="/g" className="hover:opacity-80">
        <Logo />
      </Link>
    </div>
  )
}
