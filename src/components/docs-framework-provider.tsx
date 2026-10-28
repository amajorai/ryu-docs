"use client";

import { type Framework, FrameworkProvider } from "fumadocs-core/framework";
import NextImage from "next/image";
import NextLink from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { publicDocsPathname } from "@/lib/docs-pathname";
import { normalizeDocsNavigationPathname } from "@/lib/docs-version";

export function useDocsNavigationPathname(): string {
  return normalizeDocsNavigationPathname(publicDocsPathname(usePathname()));
}

const DocsLink: NonNullable<Framework["Link"]> = ({ href, ...props }) =>
  href === undefined ? <a {...props} /> : <NextLink {...props} href={href} />;

const DocsImage: NonNullable<Framework["Image"]> = ({
  src,
  alt,
  width,
  height,
  ...props
}) =>
  src === undefined ? null : (
    <NextImage
      {...props}
      src={src}
      alt={alt ?? ""}
      width={width === undefined ? undefined : Number(width)}
      height={height === undefined ? undefined : Number(height)}
    />
  );

/** Keep Fumadocs tree selection on the visible URL during Next locale rewrites. */
export function DocsFrameworkProvider({ children }: { children: ReactNode }) {
  return (
    <FrameworkProvider
      Image={DocsImage}
      Link={DocsLink}
      useParams={useParams}
      usePathname={useDocsNavigationPathname}
      useRouter={useRouter}
    >
      {children}
    </FrameworkProvider>
  );
}
