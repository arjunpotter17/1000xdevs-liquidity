"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
const WalletMultiButtonDynamic = dynamic(
    () =>
      import("@solana/wallet-adapter-react-ui").then(
        (mod) => mod.WalletMultiButton
      ),
    { ssr: false }
  );

const Navbar = () => {
  const pathname = usePathname(); // Get current route
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const getTabClass = (route: string) => {
    const isActive = pathname === route;
    const isHovered = hoveredTab === route;

    if (isActive || isHovered) {
      return "text-white bg-blue-500";
    }

    return "text-gray-700 bg-gray-200 hover:bg-blue-500 hover:text-white";
  };

  return (
    <nav className="bg-white shadow-md flex justify-between px-4 items-center">
      <ul className="flex justify-center p-4 space-x-4">
        <li
          onMouseEnter={() => setHoveredTab("/")}
          onMouseLeave={() => setHoveredTab(null)}
        >
          <Link
            href="/"
            className={`px-4 py-2 rounded-md font-medium ${getTabClass(
              "/"
            )}`}
          >
            Launch Token
          </Link>
        </li>

        {/* Create Pool Tab */}
        <li
          onMouseEnter={() => setHoveredTab("/create-pool")}
          onMouseLeave={() => setHoveredTab(null)}
        >
          <Link
            href="/create"
            className={`px-4 py-2 rounded-md font-medium ${getTabClass(
              "/create"
            )}`}
          >
            Create Pool
          </Link>
        </li>
        
      </ul>
      {mounted && <WalletMultiButtonDynamic />}
    </nav>
  );
};

export default Navbar;
