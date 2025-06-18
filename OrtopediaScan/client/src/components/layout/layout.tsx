import { ReactNode } from "react";
import { Header } from "./header";
import { useTheme } from "@/components/theme-provider";

interface LayoutProps {
  children: ReactNode;
  includeHeader?: boolean;
}

export function Layout({ children, includeHeader = false }: LayoutProps) {
  const { theme } = useTheme();
  
  return (
    <div className={`min-h-screen flex flex-col ${theme === 'light' ? 'bg-white' : 'bg-background'}`}>
      {includeHeader && <Header />}
      <main className={`flex-grow ${theme === 'light' ? 'bg-white' : 'bg-background'}`}>
        {children}
      </main>
    </div>
  );
}