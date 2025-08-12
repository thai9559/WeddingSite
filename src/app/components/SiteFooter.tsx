export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-100 py-10 text-center text-[11px] tracking-[0.25em] text-neutral-400">
      © {new Date().getFullYear()} Blush & Bowties · All Rights Reserved
    </footer>
  );
}