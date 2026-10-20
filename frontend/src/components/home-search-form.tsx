"use client";

import Link from "next/link";
import { FormEvent, useTransition } from "react";
import { useRouter } from "next/navigation";

import { BarcodeScanner } from "@/components/barcode-scanner";
import { SearchButton } from "@/components/search-button";

export function homeSearchHref(search: string): string {
  const query = search.trim();
  return query
    ? `/recalls?search=${encodeURIComponent(query)}&page=1`
    : "/recalls";
}

type HomeSearchFormProps = {
  /** Quick searches printed under the box. */
  suggestions?: string[];
};

export function HomeSearchForm({ suggestions = [] }: HomeSearchFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const search = String(data.get("search") ?? "");
    startTransition(() => router.push(homeSearchHref(search)));
  }

  return (
    <div className="home-search">
      <form
        className="lookup-form"
        role="search"
        aria-label="Search food recalls"
        onSubmit={handleSubmit}
      >
        <label className="r-label" htmlFor="home-search">
          Look up an item
        </label>
        <div className="lookup">
          <input
            id="home-search"
            name="search"
            type="search"
            placeholder="Peanut butter, Tyson, barcode"
            autoComplete="off"
          />
          <SearchButton pending={pending} />
        </div>
      </form>
      <BarcodeScanner />
      {suggestions.length > 0 ? (
        <p className="hint">
          Common:{" "}
          {suggestions.map((label) => (
            <Link href={homeSearchHref(label)} key={label}>
              {label.toLowerCase()}
            </Link>
          ))}
        </p>
      ) : null}
    </div>
  );
}
