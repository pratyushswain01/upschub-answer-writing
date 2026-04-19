"use client";

import Image from "next/image";
import Link from "next/link";

export default function Header() {
    return (
        <header className="bg-zinc-950 border-b border-zinc-800 sticky top-0 z-50">
            <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3">
                    <Image
                        src="/upschub-logo.png"
                        alt="UPSChub Logo"
                        width={160}
                        height={50}
                        className="object-contain"
                        priority
                    />
                    <span className="text-2xl font-bold tracking-tight">UPSChub</span>
                </Link>
                <div className="text-sm text-zinc-400 hidden sm:block">
                    Answer Writing Practice
                </div>
            </div>
        </header>
    );
}