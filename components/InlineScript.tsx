import Script from 'next/script';

type InlineScriptProps = {
  id: string;
  html: string;
};

/** Critical inline scripts via next/script (React 19 disallows raw <script> in components). */
export function InlineScript({ id, html }: InlineScriptProps) {
  return (
    <Script id={id} strategy="beforeInteractive">
      {html}
    </Script>
  );
}
