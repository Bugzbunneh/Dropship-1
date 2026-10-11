type SiteFooterProps = {
  storeName: string;
};

const SiteFooter = ({ storeName }: SiteFooterProps) => (
  <footer className="mt-16 border-t border-muted">
    <div className="mx-auto max-w-5xl px-4 py-6 text-sm opacity-70">
      <p>&copy; {storeName}</p>
    </div>
  </footer>
);

export default SiteFooter;
