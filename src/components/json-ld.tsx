type JsonLdData = Record<string, unknown>;

const lessThan = /</g;

export function JsonLd({ data }: { data: JsonLdData | JsonLdData[] }) {
  const items = Array.isArray(data) ? data : [data];

  return (
    <>
      {items.map((item) => {
        const html = JSON.stringify(item).replace(lessThan, "\\u003c");

        return (
          <script
            // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted server-built JSON-LD
            dangerouslySetInnerHTML={{ __html: html }}
            key={html}
            type="application/ld+json"
          />
        );
      })}
    </>
  );
}
