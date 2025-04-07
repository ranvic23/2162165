"use client";

import { signOut } from "firebase/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { auth } from "../firebase-config";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  Box,
  Ruler,
  Tag,
  Clipboard,
  AlertTriangle,
  FileText,
  ChevronDown,
  PercentCircle,
  Megaphone,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  CircleDollarSign,
  PackageCheck,
  FileBarChart,
} from "lucide-react";

const Sidebar = () => {
  const [isInventoryOpen, setIsInventoryOpen] = useState(false); // Track inventory dropdown state
  const [isContentManagementOpen, setIsContentManagementOpen] = useState(false); // Track content management dropdown state
  const [isOrdersOpen, setIsOrdersOpen] = useState(false); // Add this line
  const router = useRouter(); // Next.js navigation

  const handleLogout = async () => {
    try {
      console.log("Attempting logout...");
      await signOut(auth); // Sign out user
      console.log("Logout successful! Redirecting...");
      router.push("/"); // Redirect to home page
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Logout error:", error.message);
      } else {
        console.error("Unexpected logout error:", error);
      }
    }
  };

  const pathname = usePathname() || ""; // get URL current path
  const hideSidebarRoutes = ["/"]; // hide sidebar on these routes

  if (hideSidebarRoutes.includes(pathname)) return null;

  return (
    <aside className="fixed top-0 left-0 h-screen flex flex-col bg-white text-black p-4 w-[18rem] bg-clip-border shadow-xl shadow-blue-gray-900/5 overflow-y-auto">
      <div className="p-4 mb-2 sticky top-0 bg-white z-10">
        <h5 className="block font-sans text-xl antialiased font-semibold leading-snug tracking-normal text-blue-gray-900">
          BBNKA
        </h5>
      </div>
      <nav className="flex flex-col gap-1 p-2 font-sans text-base font-normal text-blue-gray-700 flex-grow">
        <Link href="/dashboard">
          <div
            role="button"
            className="flex items-center w-full p-3 leading-tight transition-all rounded-lg outline-none text-start hover:bg-bg-light-brown hover:bg-opacity-80 hover:text-white focus:bg-blue-gray-50 focus:bg-opacity-80 focus:text-blue-gray-900 active:bg-blue-gray-50 active:bg-opacity-80 active:text-blue-gray-900"
          >
            <div className="grid mr-4 place-items-center">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            Dashboard
          </div>
        </Link>

        {/* Orders Module with Arrow Dropdown */}
        <div className="relative">
          <div
            role="button"
            onClick={() => setIsOrdersOpen(!isOrdersOpen)}
            className="flex items-center w-full p-3 leading-tight transition-all rounded-lg outline-none text-start hover:bg-bg-light-brown hover:bg-opacity-80 hover:text-white focus:bg-blue-gray-50 focus:bg-opacity-80 focus:text-blue-gray-900 active:bg-blue-gray-50 active:bg-opacity-80 active:text-blue-gray-900"
          >
            <div className="grid mr-4 place-items-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            Orders
            <div
              className={`ml-auto transform transition-transform duration-300 ${
                isOrdersOpen ? "rotate-180" : ""
              }`}
            >
              <ChevronDown className="w-5 h-5" />
            </div>
          </div>

          {/* Orders Dropdown items */}
          {isOrdersOpen && (
            <div className="ml-6 mt-2 space-y-1 max-h-[300px] overflow-y-auto">
              <Link href="/orders">
                <div
                  role="button"
                  className="flex items-center w-full p-3 leading-tight transition-all rounded-lg outline-none text-start hover:bg-bg-light-brown hover:bg-opacity-80 hover:text-white focus:bg-blue-gray-50 focus:bg-opacity-80 focus:text-blue-gray-900 active:bg-blue-gray-50 active:bg-opacity-80 active:text-blue-gray-900"
                >
                  <div className="grid mr-4 place-items-center">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  All Orders
                </div>
              </Link>
              <Link href="/orders/pending-verification">
                <div
                  role="button"
                  className="flex items-center w-full p-3 leading-tight transition-all rounded-lg outline-none text-start hover:bg-bg-light-brown hover:bg-opacity-80 hover:text-white focus:bg-blue-gray-50 focus:bg-opacity-80 focus:text-blue-gray-900 active:bg-blue-gray-50 active:bg-opacity-80 active:text-blue-gray-900"
                >
                  <div className="grid mr-4 place-items-center">
                    <PackageCheck className="w-5 h-5" />
                  </div>
                  Pending Verification
                </div>
              </Link>
              <Link href="/orders/tracking-orders">
                <div
                  role="button"
                  className="flex items-center w-full p-3 leading-tight transition-all rounded-lg outline-none text-start hover:bg-bg-light-brown hover:bg-opacity-80 hover:text-white focus:bg-blue-gray-50 focus:bg-opacity-80 focus:text-blue-gray-900 active:bg-blue-gray-50 active:bg-opacity-80 active:text-blue-gray-900"
                >
                  <div className="grid mr-4 place-items-center">
                    <Package className="w-5 h-5" />
                  </div>
                  Tracking Orders
                </div>
              </Link>
              <Link href="/orders/completed-orders">
                <div
                  role="button"
                  className="flex items-center w-full p-3 leading-tight transition-all rounded-lg outline-none text-start hover:bg-bg-light-brown hover:bg-opacity-80 hover:text-white focus:bg-blue-gray-50 focus:bg-opacity-80 focus:text-blue-gray-900 active:bg-blue-gray-50 active:bg-opacity-80 active:text-blue-gray-900"
                >
                  <div className="grid mr-4 place-items-center">
                    <PackageCheck className="w-5 h-5" />
                  </div>
                  Completed Orders
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* Inventory Module with Arrow Dropdown */}
        <div className="relative">
          <div
            role="button"
            onClick={() => setIsInventoryOpen(!isInventoryOpen)} // Toggle dropdown
            className="flex items-center w-full p-3 leading-tight transition-all rounded-lg outline-none text-start hover:bg-bg-light-brown hover:bg-opacity-80 hover:text-white focus:bg-blue-gray-50 focus:bg-opacity-80 focus:text-blue-gray-900 active:bg-blue-gray-50 active:bg-opacity-80 active:text-blue-gray-900"
          >
            <div className="grid mr-4 place-items-center">
              <Package className="w-5 h-5" />
            </div>
            Inventory
            <div
              className={`ml-auto transform transition-transform duration-300 ${
                isInventoryOpen ? "rotate-180" : ""
              }`}
            >
              <ChevronDown className="w-5 h-5" />
            </div>
          </div>

          {/* Dropdown items */}
          {isInventoryOpen && (
            <div className="ml-6 mt-2 space-y-1 max-h-[300px] overflow-y-auto">
              <Link href="/inventory/products">
                <div
                  role="button"
                  className="flex items-center w-full p-3 leading-tight transition-all rounded-lg outline-none text-start hover:bg-bg-light-brown hover:bg-opacity-80 hover:text-white focus:bg-blue-gray-50 focus:bg-opacity-80 focus:text-blue-gray-900 active:bg-blue-gray-50 active:bg-opacity-80 active:text-blue-gray-900"
                >
                  <div className="grid mr-4 place-items-center">
                    <Box className="w-5 h-5" />
                  </div>
                  Products
                </div>
              </Link>
              <Link href="/inventory/sizes">
                <div
                  role="button"
                  className="flex items-center w-full p-3 leading-tight transition-all rounded-lg outline-none text-start hover:bg-bg-light-brown hover:bg-opacity-80 hover:text-white focus:bg-blue-gray-50 focus:bg-opacity-80 focus:text-blue-gray-900 active:bg-blue-gray-50 active:bg-opacity-80 active:text-blue-gray-900"
                >
                  <div className="grid mr-4 place-items-center">
                    <Ruler className="w-5 h-5" />
                  </div>
                  Sizes
                </div>
              </Link>
              <Link href="/inventory/stock-management">
                <div
                  role="button"
                  className="flex items-center w-full p-3 leading-tight transition-all rounded-lg outline-none text-start hover:bg-bg-light-brown hover:bg-opacity-80 hover:text-white focus:bg-blue-gray-50 focus:bg-opacity-80 focus:text-blue-gray-900 active:bg-blue-gray-50 active:bg-opacity-80 active:text-blue-gray-900"
                >
                  <div className="grid mr-4 place-items-center">
                    <Clipboard className="w-5 h-5" />
                  </div>
                  Stock Management
                </div>
              </Link>
              <Link href="/inventory/inventory-reports">
                <div
                  role="button"
                  className="flex items-center w-full p-3 leading-tight transition-all rounded-lg outline-none text-start hover:bg-bg-light-brown hover:bg-opacity-80 hover:text-white focus:bg-blue-gray-50 focus:bg-opacity-80 focus:text-blue-gray-900 active:bg-blue-gray-50 active:bg-opacity-80 active:text-blue-gray-900"
                >
                  <div className="grid mr-4 place-items-center">
                    <FileBarChart className="w-5 h-5" />
                  </div>
                  Inventory Reports
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* Content Management Module with Arrow Dropdown */}
        <div className="relative">
          <div
            role="button"
            onClick={() => setIsContentManagementOpen(!isContentManagementOpen)} // Toggle dropdown
            className="flex items-center w-full p-3 leading-tight transition-all rounded-lg outline-none text-start hover:bg-bg-light-brown hover:bg-opacity-80 hover:text-white focus:bg-blue-gray-50 focus:bg-opacity-80 focus:text-blue-gray-900 active:bg-blue-gray-50 active:bg-opacity-80 active:text-blue-gray-900"
          >
            <div className="grid mr-4 place-items-center">
              <FileText className="w-5 h-5" />
            </div>
            Content Management
            <div
              className={`ml-auto transform transition-transform duration-300 ${
                isContentManagementOpen ? "rotate-180" : ""
              }`}
            >
              <ChevronDown className="w-5 h-5" />
            </div>
          </div>

          {/* Dropdown items */}
          {isContentManagementOpen && (
            <div className="ml-6 mt-2 space-y-1 max-h-[300px] overflow-y-auto">
              <Link href="/content/promotions">
                <div
                  role="button"
                  className="flex items-center w-full p-3 leading-tight transition-all rounded-lg outline-none text-start hover:bg-bg-light-brown hover:bg-opacity-80 hover:text-white focus:bg-blue-gray-50 focus:bg-opacity-80 focus:text-blue-gray-900 active:bg-blue-gray-50 active:bg-opacity-80 active:text-blue-gray-900"
                >
                  <div className="grid mr-4 place-items-center">
                    <PercentCircle className="w-5 h-5" />
                  </div>
                  Promotions
                </div>
              </Link>
              <Link href="/content/announcements">
                <div
                  role="button"
                  className="flex items-center w-full p-3 leading-tight transition-all rounded-lg outline-none text-start hover:bg-bg-light-brown hover:bg-opacity-80 hover:text-white focus:bg-blue-gray-50 focus:bg-opacity-80 focus:text-blue-gray-900 active:bg-blue-gray-50 active:bg-opacity-80 active:text-blue-gray-900"
                >
                  <div className="grid mr-4 place-items-center">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  Announcements
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* Other Menu Items */}
        <Link href="/users">
          <div
            role="button"
            className="flex items-center w-full p-3 leading-tight transition-all rounded-lg outline-none text-start hover:bg-bg-light-brown hover:bg-opacity-80 hover:text-white focus:bg-blue-gray-50 focus:bg-opacity-80 focus:text-blue-gray-900 active:bg-blue-gray-50 active:bg-opacity-80 active:text-blue-gray-900"
          >
            <div className="grid mr-4 place-items-center">
              <Users className="w-5 h-5" />
            </div>
            Users
          </div>
        </Link>
        <Link href="/settings">
          <div
            role="button"
            className="flex items-center w-full p-3 leading-tight transition-all rounded-lg outline-none text-start hover:bg-bg-light-brown hover:bg-opacity-80 hover:text-white focus:bg-blue-gray-50 focus:bg-opacity-80 focus:text-blue-gray-900 active:bg-blue-gray-50 active:bg-opacity-80 active:text-blue-gray-900"
          >
            <div className="grid mr-4 place-items-center">
              <Settings className="w-5 h-5" />
            </div>
            Settings
          </div>
        </Link>

        {/* Logout Button */}
        <div className="mt-auto">
          <div
            role="button"
            onClick={handleLogout}
            className="flex items-center w-full p-3 leading-tight transition-all rounded-lg outline-none text-start text-secondary-red hover:bg-bg-light-brown hover:bg-opacity-80 hover:text-white hover:text-blue-gray-900 focus:bg-blue-gray-50 focus:bg-opacity-80 focus:text-blue-gray-900 active:bg-blue-gray-50 active:bg-opacity-80 active:text-blue-gray-900"
          >
            <div className="grid mr-4 place-items-center">
              <LogOut className="w-5 h-5" />
            </div>
            Sign Out
          </div>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
