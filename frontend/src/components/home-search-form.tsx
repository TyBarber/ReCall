"use client";

import { FormEvent, useTransition } from "react";
import { useRouter } from "next/navigation";

import { SearchButton } from "@/components/search-button";
import { SearchIcon } from "@/components/ui/search-icon";

export function homeSearchHref(search: string): string {
  const query = search.trim();
  return query
    ? `/recalls?search=${encodeURIComponent(query)}&page=1`
    : "/recalls";
}

export function HomeSearchForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const search = String(data.get("search") ?? "");
    startTransition(() => router.push(homeSearchHref(search)));
  }

  return (
    <div className="command-search home-command-search">
      <form
        className="command-form"
        role="search"
        aria-label="Search food recalls"
        onSubmit={handleSubmit}
      >
        <label className="sr-only" htmlFor="home-search">
          Search current recalls
        </label>
        <div className="command-bar">
          <SearchIcon className="command-icon" />
          <input
            id="home-search"
            name="search"
            type="search"
            placeholder="Search food, brands, companies, reasons, or UPCs"
            autoComplete="off"
          />
          <SearchButton pending={pending} />
        </div>
      </form>
    </div>
  );
}
