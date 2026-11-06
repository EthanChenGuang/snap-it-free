/** Vitest stand-in for `next/font/google`: every font loader returns empty class names. */
const loader = () => ({ className: '', variable: '', style: { fontFamily: '' } });

export const Bricolage_Grotesque = loader;
export const Inter = loader;
