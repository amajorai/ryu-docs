import type { ReactNode } from "react";
import type { CatalogAttributes } from "@/lib/catalog";

type CatalogMetadataProps = {
  attributes?: CatalogAttributes;
};

function displayKind(kind: CatalogAttributes["kind"]): string {
  return kind === "app" ? "App" : "Plugin";
}

function displaySurface(surface: string): string {
  return surface === "cli"
    ? "CLI"
    : `${surface.slice(0, 1).toUpperCase()}${surface.slice(1)}`;
}

function supportDotClass(support: string): string {
  const normalized = support.toLowerCase();
  if (normalized === "full") {
    return "bg-emerald-500";
  }
  if (normalized === "none") {
    return "bg-rose-500";
  }
  return "bg-yellow-400";
}

type CatalogField = {
  fullWidth?: boolean;
  label: string;
  value: ReactNode;
  code?: boolean;
};

function surfaceValue(surfaces: CatalogAttributes["surfaces"]): ReactNode {
  if (surfaces === undefined) {
    return (
      <span>
        All surfaces <span className="text-fd-muted-foreground">(default)</span>
      </span>
    );
  }

  const entries = Object.entries(surfaces);
  if (entries.length === 0) {
    return "None declared";
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {entries.map(([surface, support]) => (
        <span
          className="inline-flex items-center gap-1.5 whitespace-nowrap"
          key={surface}
          title={`${displaySurface(surface)}: ${support || "none"}`}
        >
          <span
            aria-hidden="true"
            className={`size-2 rounded-full ${supportDotClass(support || "none")}`}
          />
          <span>{displaySurface(surface)}</span>
          <span className="sr-only">: {support || "none"}</span>
        </span>
      ))}
      <span className="inline-flex items-center gap-2 text-fd-muted-foreground text-xs">
        <span className="inline-flex items-center gap-1">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-emerald-500"
          />
          Full
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-yellow-400"
          />
          Limited/list
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-rose-500"
          />
          None
        </span>
      </span>
    </div>
  );
}

export function CatalogMetadata({ attributes }: CatalogMetadataProps) {
  if (!attributes) {
    return null;
  }

  const fields: CatalogField[] = [
    { label: "Type", value: displayKind(attributes.kind) },
    { label: "ID", value: attributes.id, code: true },
    { label: "Category", value: attributes.category },
    { label: "Version", value: attributes.version, code: true },
    { label: "Official", value: attributes.official ? "Yes" : "No" },
    { label: "Built-in", value: attributes.builtIn ? "Yes" : "No" },
    { label: "System", value: attributes.system ? "Yes" : "No" },
    {
      label: "Pre-installed",
      value: attributes.preInstalled ? "Yes" : "No",
    },
    { label: "Stability", value: attributes.stability },
    { label: "Hidden", value: attributes.hidden ? "Yes" : "No" },
    ...(attributes.external ? [{ label: "External", value: "Yes" }] : []),
    ...(attributes.layer ? [{ label: "Layer", value: attributes.layer }] : []),
    {
      label: "Surfaces",
      value: surfaceValue(attributes.surfaces),
      fullWidth: true,
    },
  ];

  return (
    <section
      aria-labelledby="catalog-metadata-title"
      className="not-prose mb-8 rounded-xl bg-fd-muted/40 p-4"
      data-catalog-metadata
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          className="text-sm font-medium text-fd-foreground"
          id="catalog-metadata-title"
        >
          Catalog attributes
        </h2>
        <span className="text-xs text-fd-muted-foreground">
          Marketplace metadata
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
        {fields.map((field) => (
          <div
            className={`min-w-0${field.fullWidth ? " col-span-2 sm:col-span-3 lg:col-span-5" : ""}`}
            key={field.label}
          >
            <dt className="text-xs text-fd-muted-foreground">{field.label}</dt>
            <dd className="mt-1 break-words text-sm font-medium text-fd-foreground">
              {field.code ? <code>{field.value}</code> : field.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
