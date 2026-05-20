interface BrregEnhet {
  navn: string;
  organisasjonsnummer: string;
  forretningsadresse?: {
    adresse?: string[];
    postnummer?: string;
    poststed?: string;
  };
}

export async function slaOppOrgnummer(orgnr: string): Promise<{
  navn: string;
  orgnummer: string;
  adresse: { gate: string; postnummer: string; poststed: string } | null;
} | null> {
  const rent = orgnr.replace(/\s/g, "");
  if (!/^\d{9}$/.test(rent)) return null;

  try {
    const res = await fetch(
      `https://data.brreg.no/enhetsregisteret/api/enheter/${rent}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;

    const data: BrregEnhet = await res.json();
    const adr = data.forretningsadresse;

    return {
      navn: data.navn,
      orgnummer: data.organisasjonsnummer,
      adresse: adr
        ? {
            gate: adr.adresse?.[0] ?? "",
            postnummer: adr.postnummer ?? "",
            poststed: adr.poststed ?? "",
          }
        : null,
    };
  } catch {
    return null;
  }
}
