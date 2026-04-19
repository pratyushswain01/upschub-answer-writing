export default function Footer() {
    return (
        <footer className="bg-zinc-950 border-t border-zinc-800 py-8 mt-auto">
            <div className="max-w-2xl mx-auto px-4 text-center text-zinc-500 text-sm">
                <p>© {new Date().getFullYear()} UPSChub. All Rights Reserved.</p>
                <p className="mt-1">Built for Serious UPSC Aspirants</p>
            </div>
        </footer>
    );
}