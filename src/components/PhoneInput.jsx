import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import { countries } from "@/lib/countryCodes";

function FlagIcon({ iso2, className = "h-3.5 w-5" }) {
    return (
        <img
            src={`https://flagcdn.com/24x18/${iso2.toLowerCase()}.png`}
            alt=""
            className={`shrink-0 rounded-sm object-cover ${className}`}
            loading="lazy"
        />
    );
}

export default function PhoneInput({
                                       id,
                                       name,
                                       countryIso2,
                                       onCountryChange,
                                       value,
                                       onChange,
                                       ariaInvalid,
                                       ariaDescribedBy,
                                   }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const containerRef = useRef(null);

    // Close on outside click — a dropdown that only closes via its own button
    // is a common but real usability papercut.
    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
                setQuery("");
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Also close on Escape, for keyboard users
    useEffect(() => {
        function handleEscape(e) {
            if (e.key === "Escape") {
                setOpen(false);
                setQuery("");
            }
        }
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, []);

    const selected = countries.find((c) => c.iso2 === countryIso2) || countries[0];
    const filtered = countries.filter((c) =>
        c.name.toLowerCase().includes(query.trim().toLowerCase())
    );

    return (
        <div ref={containerRef} className="relative">
            <div className="flex items-stretch overflow-hidden rounded-md border border-input bg-secondary shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    className="flex items-center gap-1.5 border-r border-input px-3 text-sm text-foreground hover:bg-muted/60"
                >
                    <FlagIcon iso2={selected.iso2} />
                    <span className="text-muted-foreground">{selected.callingCode}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <input
                    id={id}
                    name={name}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="9xx xxx xxxx"
                    value={value}
                    onChange={onChange}
                    aria-invalid={ariaInvalid}
                    aria-describedby={ariaDescribedBy}
                    className="h-11 w-full bg-transparent px-3 text-base text-foreground placeholder:text-muted-foreground outline-none md:text-sm"
                />
            </div>

            {open && (
                <div className="absolute z-20 mt-1 w-full min-w-[18rem] overflow-hidden rounded-md border border-border bg-card shadow-lg">
                    <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search"
                            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                        />
                    </div>
                    <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
                        {filtered.length === 0 && (
                            <li className="px-3 py-2 text-sm text-muted-foreground">
                                No matches.
                            </li>
                        )}
                        {filtered.map((c) => (
                            <li key={c.iso2}>
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={c.iso2 === countryIso2}
                                    onClick={() => {
                                        onCountryChange(c.iso2);
                                        setOpen(false);
                                        setQuery("");
                                    }}
                                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
                                >
                  <span className="flex items-center gap-2">
                    <FlagIcon iso2={c.iso2} />
                      {c.name}
                  </span>
                                    <span className="text-muted-foreground">{c.callingCode}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}