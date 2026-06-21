import { type ReactNode } from 'react';

interface HeaderProps {
  title: string;
  children?: ReactNode;
}

const Header = ({ title, children }: HeaderProps) => {
  return (
    <header className="header">
      <h1 className="header-title">{title}</h1>
      <div className="header-actions">
        {children}
      </div>
    </header>
  );
};

export default Header;
