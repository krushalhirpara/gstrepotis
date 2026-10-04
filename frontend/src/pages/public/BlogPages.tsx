import React, { useState, useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { SEO } from '../../components/common/SEO';
import { Breadcrumbs } from '../../components/common/Breadcrumbs';
import { blogArticles, topicClusters, getArticleBySlug, getRelatedArticles, type BlogArticle } from '../../data/blogArticles';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ArrowRight, Search, Clock, Calendar, BookOpen, Layers } from 'lucide-react';

export const BlogIndexPage: React.FC = () => {
  const [selectedCluster, setSelectedCluster] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredArticles = useMemo(() => {
    return blogArticles.filter((article) => {
      const matchesCluster =
        selectedCluster === 'all' ||
        article.cluster.toLowerCase() === selectedCluster.toLowerCase();
      const matchesSearch =
        searchQuery.trim() === '' ||
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.summary.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCluster && matchesSearch;
    });
  }, [selectedCluster, searchQuery]);

  const breadcrumbs = [
    { label: 'Home', path: '/' },
    { label: 'Blog', path: '/blog' },
  ];

  return (
    <div className="bg-white text-[#111111] min-h-screen py-12 sm:py-16">
      <SEO
        title="GST & Accounting Automation Blog | GSTRepotis"
        description="Practical guides, reconciliation workflows, GST audit checklists, and Tally automation strategies for CA firms, tax accountants, and finance teams."
        canonical="https://gstrepotis.com/blog"
        type="website"
        breadcrumbs={breadcrumbs}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={breadcrumbs} className="mb-6" />

        {/* Header / Hero */}
        <div className="max-w-3xl">
          <Badge variant="outline" className="mb-4">
            Knowledge Base & Practical Guides
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#111111]">
            GST Compliance & Accounting Insights
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[#555555] leading-relaxed">
            In-depth guides on GSTR-2B reconciliation, ITC optimization, GST audit checklists, bank statement conversion, and CA firm productivity workflows.
          </p>
        </div>

        {/* Search & Topic Cluster Filters */}
        <div className="mt-10 pt-6 border-t border-[#E5E5E5] space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
            {/* Search Input */}
            <div className="relative max-w-md w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888888]" />
              <input
                type="text"
                placeholder="Search articles by keyword, topic, or section..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white text-xs font-mono text-[#111111] rounded-lg border border-[#D4D4D4] pl-10 pr-4 py-2.5 outline-none focus:border-black"
              />
            </div>

            <span className="text-xs font-mono text-[#666666]">
              Showing {filteredArticles.length} of {blogArticles.length} articles
            </span>
          </div>

          {/* Cluster Buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={() => setSelectedCluster('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                selectedCluster === 'all'
                  ? 'bg-black text-white font-bold'
                  : 'bg-[#F7F7F7] border border-[#E5E5E5] text-[#555555] hover:text-black hover:border-black'
              }`}
            >
              All Topics ({blogArticles.length})
            </button>
            {topicClusters.map((cluster) => {
              const count = blogArticles.filter((a) => a.cluster === cluster.name).length;
              return (
                <button
                  key={cluster.id}
                  onClick={() => setSelectedCluster(cluster.name)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    selectedCluster === cluster.name
                      ? 'bg-black text-white font-bold'
                      : 'bg-[#F7F7F7] border border-[#E5E5E5] text-[#555555] hover:text-black hover:border-black'
                  }`}
                >
                  {cluster.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Articles Grid */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article) => (
            <Card
              key={article.slug}
              className="flex flex-col justify-between p-6 hover:border-black transition-all group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-mono text-[10px] text-[#555555] uppercase tracking-wider font-bold bg-[#F7F7F7] border border-[#E5E5E5] px-2 py-0.5 rounded">
                    {article.cluster.toUpperCase()}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-[#888888]">
                    <Clock className="w-3 h-3" /> {article.readingTime}
                  </span>
                </div>

                <Link to={`/blog/${article.slug}`}>
                  <h2 className="text-lg font-bold text-[#111111] group-hover:underline line-clamp-2">
                    {article.title}
                  </h2>
                </Link>

                <p className="mt-2.5 text-xs text-[#666666] line-clamp-3 leading-relaxed">
                  {article.summary}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E5E5E5] flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-[11px] text-[#666666] font-mono">
                  <Calendar className="w-3 h-3" /> {article.publishedDate}
                </span>
                <Link
                  to={`/blog/${article.slug}`}
                  className="font-bold text-black flex items-center gap-1 hover:gap-2 transition-all"
                >
                  Read Guide <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Card>
          ))}
        </div>

        {filteredArticles.length === 0 && (
          <div className="text-center py-16 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl mt-8">
            <BookOpen className="w-10 h-10 text-[#888888] mx-auto mb-3" />
            <p className="text-sm font-bold text-[#111111]">No articles found</p>
            <p className="text-xs text-[#666666] mt-1">Try searching with a different term or select another category filter.</p>
          </div>
        )}

        {/* Bottom Hub / Product Navigation */}
        <div className="mt-20 p-8 bg-[#FAFAFA] border border-[#E5E5E5] rounded-2xl">
          <h2 className="text-xl font-bold text-[#111111] mb-2">Explore GSTRepotis Software Modules</h2>
          <p className="text-xs text-[#555555] mb-6">
            Put these reconciliation and accounting automation guides into practice with our dedicated tools.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <Link
              to="/gstr-2b-reconciliation"
              className="p-4 bg-white border border-[#E5E5E5] rounded-xl hover:border-black transition-colors"
            >
              <p className="font-bold text-[#111111]">GSTR-2B Reconciliation</p>
              <p className="text-[11px] text-[#666666] mt-1">Reconcile purchase register vs 2B with mismatch reports.</p>
            </Link>
            <Link
              to="/gst-audit-software"
              className="p-4 bg-white border border-[#E5E5E5] rounded-xl hover:border-black transition-colors"
            >
              <p className="font-bold text-[#111111]">GST Audit Workspace</p>
              <p className="text-[11px] text-[#666666] mt-1">Working papers, exception logs, and compliance checklist.</p>
            </Link>
            <Link
              to="/bank-statement-to-tally"
              className="p-4 bg-white border border-[#E5E5E5] rounded-xl hover:border-black transition-colors"
            >
              <p className="font-bold text-[#111111]">Bank Statement to Tally</p>
              <p className="text-[11px] text-[#666666] mt-1">Convert 18+ bank PDF formats into direct Tally XML vouchers.</p>
            </Link>
            <Link
              to="/gst-software-for-ca"
              className="p-4 bg-white border border-[#E5E5E5] rounded-xl hover:border-black transition-colors"
            >
              <p className="font-bold text-[#111111]">CA Firm Workspace</p>
              <p className="text-[11px] text-[#666666] mt-1">Manage multiple GST clients, staff workflows, and returns.</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export const BlogDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const article = useMemo(() => (slug ? getArticleBySlug(slug) : undefined), [slug]);
  const relatedArticles: BlogArticle[] = useMemo(
    () => (slug && article ? getRelatedArticles(slug, article.cluster) : []),
    [slug, article]
  );

  if (!article) {
    return <Navigate to="/blog" replace />;
  }

  const breadcrumbs = [
    { label: 'Home', path: '/' },
    { label: 'Blog', path: '/blog' },
    { label: article.title, path: `/blog/${article.slug}` },
  ];

  return (
    <div className="bg-white text-[#111111] min-h-screen py-12 sm:py-16">
      <SEO
        title={article.metaTitle || `${article.title} | GSTRepotis`}
        description={article.metaDescription || article.summary}
        canonical={`https://gstrepotis.com/blog/${article.slug}`}
        type="article"
        breadcrumbs={breadcrumbs}
        articleData={{
          publishedTime: article.publishedDate,
          modifiedTime: article.lastUpdatedDate,
          author: article.author.name,
          section: article.cluster,
        }}
      />

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={breadcrumbs} className="mb-6" />

        {/* Article Header */}
        <header className="border-b border-[#E5E5E5] pb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-mono text-[10px] text-[#555555] uppercase tracking-wider font-bold bg-[#F7F7F7] border border-[#E5E5E5] px-2.5 py-1 rounded">
              {article.cluster.toUpperCase()}
            </span>
            <span className="flex items-center gap-1 font-mono text-xs text-[#888888]">
              <Clock className="w-3.5 h-3.5" /> {article.readingTime}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#111111] leading-tight">
            {article.h1 || article.title}
          </h1>

          <p className="mt-4 text-base sm:text-lg text-[#555555] leading-relaxed">
            {article.summary}
          </p>

          {/* Author & Meta Bar */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#F0F0F0] text-xs text-[#666666] font-mono">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-black text-white font-bold flex items-center justify-center text-xs">
                GR
              </div>
              <div>
                <p className="font-bold text-[#111111]">{article.author.name}</p>
                <p className="text-[11px] text-[#888888]">{article.author.role}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-[11px]">
              <span>Published: {article.publishedDate}</span>
              <span>•</span>
              <span>Updated: {article.lastUpdatedDate}</span>
            </div>
          </div>
        </header>

        {/* Article Body HTML Content */}
        <div
          className="py-10 prose prose-neutral max-w-none text-sm sm:text-base leading-relaxed text-[#222222] space-y-6 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-[#111111] [&_h2]:tracking-tight [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-[#111111] [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:text-sm sm:[&_p]:text-base [&_p]:text-[#333333] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_li]:text-xs sm:[&_li]:text-sm [&_li]:text-[#333333] [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs sm:[&_table]:text-sm [&_table]:my-6 [&_th]:border [&_th]:border-[#E5E5E5] [&_th]:p-3 [&_th]:bg-[#FAFAFA] [&_th]:font-bold [&_th]:text-left [&_td]:border [&_td]:border-[#E5E5E5] [&_td]:p-3"
          dangerouslySetInnerHTML={{ __html: article.contentHtml }}
        />

        {/* FAQs Section */}
        {article.faqs && article.faqs.length > 0 && (
          <section className="space-y-4 pt-8 border-t border-[#E5E5E5]">
            <h2 className="text-2xl font-bold text-[#111111] tracking-tight">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3 pt-2">
              {article.faqs.map((faq, fidx) => (
                <div key={fidx} className="border border-[#E5E5E5] rounded-lg overflow-hidden bg-white">
                  <button
                    onClick={() => setOpenFaq(openFaq === fidx ? null : fidx)}
                    className="w-full px-5 py-3.5 text-left font-bold text-xs sm:text-sm text-[#111111] flex items-center justify-between hover:bg-[#F7F7F7] cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    <span className="font-mono text-sm">{openFaq === fidx ? '−' : '+'}</span>
                  </button>
                  {openFaq === fidx && (
                    <div className="px-5 pb-4 text-xs sm:text-sm text-[#555555] leading-relaxed border-t border-[#E5E5E5] pt-3">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related Product Tools Callout */}
        {article.relatedProducts && article.relatedProducts.length > 0 && (
          <div className="mt-10 p-6 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl">
            <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider mb-3">
              Relevant GSTRepotis Tools
            </h3>
            <div className="flex flex-wrap gap-2">
              {article.relatedProducts.map((prod, pidx) => (
                <Link
                  key={pidx}
                  to={prod.path}
                  className="px-3.5 py-1.5 bg-white border border-[#E5E5E5] hover:border-black rounded-lg text-xs font-bold text-[#111111] transition-colors flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5 text-[#555555]" />
                  {prod.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* E-E-A-T Author & Editorial Review Box */}
        <div className="p-6 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mt-8">
          <div>
            <span className="text-[10px] font-mono uppercase text-[#888888] block font-bold">
              EDITORIAL INTEGRITY & REVIEW
            </span>
            <p className="text-xs font-bold text-[#111111] mt-0.5">
              Authored by {article.author.name} ({article.author.role})
            </p>
            <p className="text-[11px] text-[#666666] mt-1 max-w-xl">
              Content is prepared strictly according to GST Acts, CGST Rules, CBIC notifications, and standard Indian ICAI auditing guidance.
            </p>
          </div>
          <Link to="/contact">
            <Button size="sm" variant="outline">
              Report Feedback
            </Button>
          </Link>
        </div>

        {/* Product CTA Banner */}
        <div className="mt-12 p-8 bg-black text-white rounded-2xl text-center">
          <Badge variant="neutral" className="bg-neutral-800 text-white border-neutral-700 mb-3">
            GSTREPOTIS PLATFORM
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Automate Your GST Returns & Reconciliations
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-neutral-400 max-w-lg mx-auto">
            Try GSTRepotis for fast GSTR-2B matching, bank-to-Tally XML export, and comprehensive multi-client GST compliance.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/login">
              <Button variant="outline" className="bg-white !text-black hover:bg-neutral-100 font-bold border-white">
                Sign In to Workspace
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="ghost" className="text-white hover:bg-neutral-800">
                View Pricing Plans
              </Button>
            </Link>
          </div>
        </div>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div className="mt-16 pt-10 border-t border-[#E5E5E5]">
            <h3 className="text-xl font-bold text-[#111111] mb-6">Related Guides & Articles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatedArticles.map((rel) => (
                <Link
                  key={rel.slug}
                  to={`/blog/${rel.slug}`}
                  className="p-4 bg-white border border-[#E5E5E5] rounded-xl hover:border-black transition-colors group block"
                >
                  <span className="text-[10px] font-mono text-[#888888] uppercase block mb-1 font-bold">
                    {rel.readingTime}
                  </span>
                  <h4 className="font-bold text-sm text-[#111111] group-hover:underline">
                    {rel.title}
                  </h4>
                  <p className="text-xs text-[#666666] mt-1.5 line-clamp-2">{rel.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
};
