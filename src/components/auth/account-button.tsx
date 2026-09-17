"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

export function NotificationButton() {
  return (
    <Link className="notification-button" href="/my-football" aria-label="Notifications">
      <Bell size={20} strokeWidth={1.8} aria-hidden="true" />
      <span aria-label="3 unread notifications">3</span>
    </Link>
  );
}

export function AccountButton() {
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  useEffect(() => {
    let active = true;
    void fetch("/api/auth", { cache: "no-store" })
      .then((r) => r.json())
      .then((user) => {
        if (active) {
          setSignedIn(Boolean(user.email));
          setEmail(typeof user.email === "string" ? user.email : "");
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return (
    signedIn ? (
      <details className="account-menu">
        <summary>
          <span className="account-avatar">
            {email.slice(0, 2).toUpperCase()}
          </span>
          <span className="account-copy">
            <strong>My account</strong>
            <small>View profile</small>
          </span>
          <span className="account-chevron" aria-hidden="true" />
        </summary>
        <div className="account-menu-panel">
          <Link href="/my-football">View profile</Link>
        </div>
      </details>
    ) : (
      <Link className="header-login" href="/login">
        Log in ↗
      </Link>
    )
  );
}
