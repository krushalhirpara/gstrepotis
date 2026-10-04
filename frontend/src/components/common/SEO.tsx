import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export type BreadcrumbItem =
  | { name: string; item: string; label?: string; path?: string }
  | { label: string; path: string; name?: string; item?: string };

export interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  noindex?: boolean;
  noIndex?: boolean;
  ogType?: 'website' | 'article' | 'software';
  type?: string;
  ogImage?: string;
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    section?: string;
    tags?: string[];
  };
  articleData?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    section?: string;
    tags?: string[];
  };
  softwareData?: {
    name: string;
    applicationCategory?: string;
    operatingSystem?: string;
    description?: string;
  };
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
  breadcrumbs?: BreadcrumbItem[];
}

const DOMAIN = 'https://gstrepotis.com';
const DEFAULT_OG_IMAGE = 'https://gstrepotis.com/gstrepotis.png';
const SITE_NAME = 'GSTRepotis';

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  canonical,
  noindex = false,
  noIndex = false,
  ogType = 'website',
  type,
  ogImage = DEFAULT_OG_IMAGE,
  article,
  articleData,
  softwareData,
  jsonLd,
  breadcrumbs,
}) => {
  const location = useLocation();
  const shouldNoIndex = noindex || noIndex;
  const resolvedOgType = type || ogType;
  const resolvedArticle = articleData || article;

  const currentCanonical =
    canonical || `${DOMAIN}${location.pathname === '/' ? '/' : location.pathname.replace(/\/+$/, '')}`;

  useEffect(() => {
    // 1. Document Title
    document.title = title;

    // Helper to set or create meta tag
    const setMeta = (nameAttr: 'name' | 'property', attrValue: string, content: string) => {
      let element = document.querySelector(`meta[${nameAttr}="${attrValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(nameAttr, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 2. Primary Meta Tags
    setMeta('name', 'description', description);
    setMeta('name', 'robots', shouldNoIndex ? 'noindex, nofollow' : 'index, follow');

    // 3. Canonical Link Tag
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', currentCanonical);

    // 4. Open Graph Tags
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', currentCanonical);
    setMeta('property', 'og:type', resolvedOgType === 'article' ? 'article' : 'website');
    setMeta('property', 'og:image', ogImage);
    setMeta('property', 'og:site_name', SITE_NAME);

    // 5. Twitter Card Tags
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', ogImage);

    // 6. Article Specific Meta
    if (resolvedArticle) {
      if (resolvedArticle.publishedTime) setMeta('property', 'article:published_time', resolvedArticle.publishedTime);
      if (resolvedArticle.modifiedTime) setMeta('property', 'article:modified_time', resolvedArticle.modifiedTime);
      if (resolvedArticle.author) setMeta('property', 'article:author', resolvedArticle.author);
      if (resolvedArticle.section) setMeta('property', 'article:section', resolvedArticle.section);
    }

    // 7. Structured Data (JSON-LD)
    const existingScript = document.getElementById('json-ld-structured-data');
    if (existingScript) {
      existingScript.remove();
    }

    const schemas: Array<Record<string, unknown>> = [];

    // Homepage schemas
    if (location.pathname === '/') {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'GSTRepotis',
        url: 'https://gstrepotis.com/',
        logo: 'https://gstrepotis.com/gstrepotis.png',
        description: 'All-in-one GST compliance, reconciliation and accounting automation software.',
      });

      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'GSTRepotis',
        url: 'https://gstrepotis.com/',
      });
    }

    // Software schema if applicable
    if (softwareData) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: softwareData.name,
        applicationCategory: softwareData.applicationCategory || 'BusinessApplication',
        operatingSystem: softwareData.operatingSystem || 'Web Browser',
        description: softwareData.description || description,
        url: currentCanonical,
      });
    }

    // Article schema for blog posts
    if (resolvedOgType === 'article' && resolvedArticle) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description: description,
        author: {
          '@type': 'Organization',
          name: resolvedArticle.author || 'GSTRepotis Compliance Team',
        },
        publisher: {
          '@type': 'Organization',
          name: 'GSTRepotis',
          logo: {
            '@type': 'ImageObject',
            url: 'https://gstrepotis.com/gstrepotis.png',
          },
        },
        datePublished: resolvedArticle.publishedTime || '2026-10-04',
        dateModified: resolvedArticle.modifiedTime || '2026-10-04',
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': currentCanonical,
        },
      });
    }

    // Breadcrumbs Schema
    if (breadcrumbs && breadcrumbs.length > 0) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((b, idx) => {
          const name = ('name' in b && b.name ? b.name : 'label' in b && b.label ? b.label : '') as string;
          const item = ('item' in b && b.item ? b.item : 'path' in b && b.path ? b.path : '/') as string;
          return {
            '@type': 'ListItem',
            position: idx + 1,
            name: name,
            item: item.startsWith('http') ? item : `${DOMAIN}${item}`,
          };
        }),
      });
    }

    // Custom injected JSON-LD
    if (jsonLd) {
      if (Array.isArray(jsonLd)) {
        schemas.push(...jsonLd);
      } else {
        schemas.push(jsonLd);
      }
    }

    if (schemas.length > 0) {
      const script = document.createElement('script');
      script.id = 'json-ld-structured-data';
      script.type = 'application/ld+json';
      script.text = JSON.stringify(schemas.length === 1 ? schemas[0] : schemas);
      document.head.appendChild(script);
    }
  }, [title, description, currentCanonical, shouldNoIndex, resolvedOgType, ogImage, resolvedArticle, softwareData, jsonLd, breadcrumbs, location.pathname]);

  return null;
};
