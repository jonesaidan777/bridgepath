"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Compass,
  FolderOpen,
  UserRound,
  Target,
  FileText,
  Menu,
  X,
} from "lucide-react";
import { navigation } from "@/lib/navigation";

const icons = [Compass, Target, FileText, FolderOpen, UserRound];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const parentPage = navigation.find(
    (item) =>
      pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  const currentPage =
    pathname.startsWith("/career-insights/") ||
    pathname.startsWith("/my-opportunities/")
      ? "Internship details"
      : pathname.startsWith("/my-projects/")
        ? "Project details"
        : (parentPage?.label ?? "BridgePath");

  function closeMenu() {
    setOpen(false);
    menuButton.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (pathname === "/onboarding" || pathname === "/discover-opportunities") {
    return (
      <div className="onboarding-shell">
        <header className="onboarding-topbar">
          <Link href="/career-insights" className="brand">
            BridgePath
            <span className="brand-mark" aria-hidden="true">
              ↗
            </span>
          </Link>
          {pathname === "/discover-opportunities" && <span>Internship discovery</span>}
        </header>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {open && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={closeMenu}
        />
      )}
      <aside
        id="sidebar"
        className={`sidebar ${open ? "is-open" : ""}`}
        aria-label="Application sidebar"
      >
        <Link href="/career-insights" className="brand" onClick={() => setOpen(false)}>
          BridgePath
          <span className="brand-mark" aria-hidden="true">
            ↗
          </span>
        </Link>
        <button
          ref={closeButton}
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={closeMenu}
        >
          <X size={20} />
        </button>
        <nav aria-label="Main navigation">
          {navigation.map((item, index) => {
            const Icon = icons[index];
            const active = parentPage?.href === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={
                  active
                    ? pathname === item.href
                      ? "page"
                      : "location"
                    : undefined
                }
                className={`nav-item ${active ? "active" : ""}`}
                onClick={() => setOpen(false)}
              >
                <Icon size={20} strokeWidth={1.5} />
                {item.label}
                {active && <span className="nav-indicator" />}
              </Link>
            );
          })}
        </nav>
        <p className="sidebar-bottom">
          Career exploration,
          <br />
          grounded in research.
        </p>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="topbar-left">
            <button
              ref={menuButton}
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              aria-controls="sidebar"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb">
              <strong>{currentPage}</strong>
            </span>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer>
          <span>BridgePath</span>
          <span>From potential to proof.</span>
        </footer>
      </div>
    </div>
  );
}
