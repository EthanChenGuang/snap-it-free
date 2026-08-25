type InlineScriptProps = {
  id?: string;
  html: string;
};

/** Inline script that runs during HTML parse without React 19 client-render warnings. */
export function InlineScript({ id, html }: InlineScriptProps) {
  return (
    <script
      id={id}
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
