import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/app/components/AppHeader";
import { CoffeeButton } from "@/app/components/CoffeeButton";
import { getPostBySlug, getAllPosts } from "@/app/lib/blog";

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  return {
    title: `${post.title} | LandKoala Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="landkoala-shell">
      <AppHeader />
      <main className="landkoala-home-wrapper">
        <article className="blog-article">
          <header className="blog-article-header">
            <Link href="/blog" className="blog-back-link">
              ← Back to Blog
            </Link>
            <h1 className="blog-article-title">{post.title}</h1>
            <div className="blog-article-meta">
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <span className="blog-article-author">by {post.author}</span>
            </div>
          </header>

          <div
            className="blog-article-content"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />

          <footer className="blog-article-footer">
            <div className="blog-article-cta">
              <h3>Ready to analyze your business location?</h3>
              <p>
                Use LandKoala&apos;s free location intelligence tool to score
                neighborhoods using Census data and OpenStreetMap competition
                analysis.
              </p>
              <Link
                href="/"
                className="coffee-button coffee-button-medium"
                style={{ textDecoration: "none", marginTop: "1rem" }}
              >
                <span className="coffee-text">Try LandKoala Free</span>
              </Link>
            </div>
          </footer>
        </article>

        <footer className="landkoala-footer">
          <div className="footer-content">
            <CoffeeButton />
          </div>
        </footer>
      </main>
    </div>
  );
}
