import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/site-settings";
import { getSiteName } from "@/utils/site-settings";
import { getRequestTenant } from "@/lib/server/tenant-context";
import { BACKEND_URL } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/images";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

interface ProductMeta {
  name: string;
  description?: string;
  image?: string;
  price?: number;
  stock?: number;
  brand?: string;
  category?: string;
  sku?: string;
}

async function fetchProductForMetadata(id: string): Promise<ProductMeta | null> {
  try {
    const tenant = await getRequestTenant();
    const headers: Record<string, string> = {};

    if (tenant.organizationId) headers["x-org-id"] = String(tenant.organizationId);
    if (tenant.companyId) headers["x-company-id"] = String(tenant.companyId);
    if (tenant.slug) headers["x-tenant-slug"] = tenant.slug;

    const res = await fetch(`${BACKEND_URL}/api/public/products/${id}`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) return null;

    const p = await res.json();
    return {
      name: p.name ?? "",
      description: p.description ?? undefined,
      image: p.image ?? (p.images?.[0] ?? undefined),
      price: typeof p.price === "number" ? p.price : undefined,
      stock: typeof p.stock === "number" ? p.stock : undefined,
      brand: p.brand?.name ?? undefined,
      category: p.category?.name ?? (typeof p.category === "string" ? p.category : undefined),
      sku: p.sku ?? undefined,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { id } = await params;
  const [product, { settings }] = await Promise.all([
    fetchProductForMetadata(id),
    getSiteSettings(),
  ]);

  const siteName = getSiteName(settings);

  if (!product) {
    return { title: `Producto no encontrado | ${siteName}` };
  }

  const title = `${product.name} | ${siteName}`;
  const description =
    product.description?.slice(0, 160) ||
    settings.seo.defaultDescription?.trim() ||
    "";
  const imageUrl = product.image
    ? resolveImageUrl(product.image)
    : settings.seo.ogImage?.trim() || undefined;
  const baseUrl = settings.seo.baseSlug?.trim() || "";
  const productUrl = baseUrl ? `${baseUrl}/store/${id}` : undefined;

  return {
    title,
    description,
    openGraph: {
      type: "website",
      siteName,
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
      url: productUrl,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function StoreProductLayout({ children, params }: LayoutProps) {
  const { id } = await params;
  const [product, { settings }] = await Promise.all([
    fetchProductForMetadata(id),
    getSiteSettings(),
  ]);

  const siteName = getSiteName(settings);
  const baseUrl = settings.seo.baseSlug?.trim() || "";

  // Build JSON-LD structured data for product
  const jsonLd = product
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description || undefined,
        image: product.image ? resolveImageUrl(product.image) : undefined,
        sku: product.sku || `PROD-${id}`,
        brand: product.brand
          ? { "@type": "Brand", name: product.brand }
          : undefined,
        category: product.category || undefined,
        url: baseUrl ? `${baseUrl}/store/${id}` : undefined,
        offers: product.price != null
          ? {
              "@type": "Offer",
              price: product.price,
              priceCurrency: "PEN",
              availability:
                product.stock != null && product.stock > 0
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
              seller: { "@type": "Organization", name: siteName },
            }
          : undefined,
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
