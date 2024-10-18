import React from 'react';
import '@/styles/navbar.css';
import HorizontalNavbar from './horizontal-navbar';

type NavbarProps = {
  navHeader?: string;
};

const Navbar: React.FC<NavbarProps> = ({ navHeader }) => {
  return (
    <div className="flex align-items-center justify-content-between w-full factory-navbar">
      <div className="flex align-items-center flex-grow-1">
        <h2 className="nav-header mr-7">{navHeader}</h2>
        <div className="flex-grow-1 flex justify-content-end pr-7 pt-2 ">
          <HorizontalNavbar />
        </div>
      </div>
    </div>
  );
};

export default Navbar;