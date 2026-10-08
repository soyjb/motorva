"use client";

import Link from "next/link";
import { useAuth } from "./auth-provider";

export default function AccountLink() {
  const { session, ready } = useAuth();
  return <Link href="/account" className="account-link">{ready && session ? "My account" : "Sign in"}</Link>;
}
