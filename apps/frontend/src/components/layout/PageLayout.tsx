import { NavLink } from 'react-router-dom';

interface PageLayoutProps {
  children: React.ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="bg-gray-50 flex flex-col">
      <header className="border-black-200 top-0">
        <nav className="px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="font-semibold text-black">
            El Farol
          </span>
          <div className="flex items-center gap-2">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#fbe6c6] text-black'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-[#f4bb73]'
                }`
              }
            >
              О проблеме
            </NavLink>
            <NavLink
              to="/simulation"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#fbe6c6] text-black'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-[#f4bb73]'
                }`
              }
            >
              Симуляция
            </NavLink>
          </div>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
