export default function PlayDesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        header, footer, .page-grid::before {
          display: none !important;
        }
        .page-grid {
          min-height: auto;
        }
        #content {
          min-height: 100vh;
        }
        body {
          background: none !important;
          background-image: none !important;
        }
      `}</style>
      {children}
    </>
  );
}
