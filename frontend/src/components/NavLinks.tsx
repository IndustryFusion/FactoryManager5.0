import { useRouter } from 'next/router';
import Link from 'next/link';
import React from 'react';

interface NavLinkProps {
 to: string;
 children: React.ReactNode;
}

const NavLink: React.FC<NavLinkProps> = ({ to, children }) => {
 const router = useRouter();

 return <Link href={to}>{React.cloneElement(children as React.ReactElement)}</Link>;
};

export default NavLink;
