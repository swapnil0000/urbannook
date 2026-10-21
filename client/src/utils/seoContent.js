import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useGetSeoDataQuery } from '../store/api/productsApi';
import { normalizeSeoPath } from './seoMerge';

const paragraphs = (text = '') => text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);

/** Intro paragraphs and FAQs from Admin → SEO Pages for the current URL (empty when none). */
export const useSeoContent = () => {
  const { pathname } = useLocation();
  const { data } = useGetSeoDataQuery(normalizeSeoPath(pathname));
  const seo = data?.data;
  return useMemo(() => ({
    intro: paragraphs(seo?.introContent),
    faqs: (seo?.faqs || []).filter((f) => f?.question && f?.answer).map((f) => ({ q: f.question, a: f.answer })),
  }), [seo]);
};

/** FAQPage schema for FAQs shown on the page (only ever next to the visible FAQs). */
export const faqPageJsonLd = (faqs) => ({
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
});
