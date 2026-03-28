"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { usePathname } from "next/navigation";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isLanding = pathname === "/";

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(/[_\s]+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logoLink}>
        <span className={styles.logoIcon}>🎓</span>
        <span className={styles.logoText}>MentorConnect</span>
      </Link>

      <div className={styles.navRight}>
        {user ? (
          <>
            <Link
              href="/dashboard"
              className={`${styles.navLink} ${pathname === "/dashboard" ? styles.navLinkActive : ""}`}
            >
              Dashboard
            </Link>

            <div ref={dropdownRef} className={styles.profileWrapper}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={styles.avatarButton}
              >
                <div className={`${styles.avatar} ${dropdownOpen ? styles.avatarActive : ""}`}>
                  {getInitials(user.username)}
                </div>
              </button>

              {dropdownOpen && (
                <div className={styles.dropdown}>
                  <div className={styles.dropdownUserInfo}>
                    <p className={styles.dropdownUsername}>{user.username}</p>
                    <p className={styles.dropdownEmail}>{user.email}</p>
                    <span
                      className={`${styles.roleBadge} ${
                        user.role === "MENTOR" ? styles.roleMentor : styles.roleStudent
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>
                  <div className={styles.dropdownMenu}>
                    <Link
                      href="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className={styles.dropdownItem}
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {!isLanding && (
              <Link href="/" className={styles.navLink}>
                Home
              </Link>
            )}
            <Link href="/login" className={styles.navLink}>
              Login
            </Link>
            <Link href="/register">
              <button className={`btn-primary ${styles.getStartedBtn}`}>
                Get Started
              </button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
