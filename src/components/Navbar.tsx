'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Mail, FileText, Settings, Database } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/', label: 'Email Editor', icon: Mail },
    { href: '/companies', label: 'Companies', icon: Database },
    { href: '/smtp', label: 'SMTP Config', icon: Settings },
    { href: '/logs', label: 'Logs', icon: FileText },
  ];

  return (
    <>
      {/* Top Header - Hidden on Mobile */}
      <nav className="sticky top-0 z-50 w-full border-b border-[#eaeaea] bg-white/90 backdrop-blur-md hidden md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-[#171717] font-bold text-white shadow-sm">
              J
            </div>
            <span className="font-bold text-[#171717] text-lg tracking-tight">
              JobMail AI
            </span>
          </div>

          <div className="hidden items-center gap-1 md:flex">
            {links.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center gap-2 rounded-[6px] px-3 py-1.5 text-sm font-medium transition-all ${
                    isActive ? 'text-[#171717] bg-[#f2f2f2]' : 'text-[#4d4d4d] hover:text-[#171717] hover:bg-[#fafafa]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-around border-t border-[#eaeaea] py-2.5 md:hidden bg-white/95 backdrop-blur-md shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center py-1 text-[10px] font-semibold transition-all ${
                isActive ? 'text-[#006bff]' : 'text-[#8f8f8f] hover:text-[#171717]'
              }`}
            >
              <Icon className="h-5 w-5 mb-0.5" />
              {link.label.split(' ')[0]}
            </Link>
          );
        })}
      </div>
    </>
  );
}
