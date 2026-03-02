import React from "react";
import BottomNav from "@/components/BottomNav";
import DesktopSidebar from "@/components/DesktopSidebar";

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      <DesktopSidebar />
      <div className="pb-24 lg:pb-8 lg:pl-56">
        <div className="mx-auto max-w-md px-4 pt-6 lg:max-w-4xl xl:max-w-5xl">
          {children}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
