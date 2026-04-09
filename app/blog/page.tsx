import Link from "next/link";
import { Metadata } from "next";
import { AppHeader } from "@/app/components/AppHeader";
import { CoffeeButton } from "@/app/components/CoffeeButton";
import { getAllPosts } from "@/app/lib/blog";

export const metadata: Metadata = {
  title: "Blog | LandKoala - Location Intelligence Insights",
  description:
    "Learn about business location analysis, demographic data, competitor research, and site selection strategies for entrepreneurs and small business owners.",
  openGraph: {
    title: "LandKoala Blog - Location Intelligence Insights",
    description:
      "Expert tips on business location analysis, demographic research, and site selection strategies.",
    type: "website",
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="landkoala-shell">
      <AppHeader />
      <main className="landkoala-home-wrapper">
        <section className="landkoala-hero">
          <div className="landkoala-hero-content">
            <h1>LandKoala Blog</h1>
            <p>
              Insights on business location analysis, demographic research, and
              site selection strategies to help you find the perfect spot for
              your business.
            </p>
          </div>
        </section>

        <section className="landkoala-form-section">
          <div className="blog-posts-list">
            {posts.map((post) => (
              <article key={post.slug} className="blog-post-card">
                <Link href={`/blog/${post.slug}`} className="blog-post-link">
                  <h2 className="blog-post-title">{post.title}</h2>
                  <p className="blog-post-excerpt">{post.excerpt}</p>
                  <div className="blog-post-meta">
                    <span className="blog-post-date">
                      {new Date(post.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                    <span className="blog-post-author">by {post.author}</span>
                  </div>
                  <span className="blog-post-read-more">Read more →</span>
                </Link>
              </article>
            ))}
          </div>
        </section>

        <footer className="landkoala-footer">
          <div className="footer-content">
            <p className="footer-message">
              Want to analyze a business location?
            </p>
            <Link
              href="/"
              className="coffee-button coffee-button-medium"
              style={{ textDecoration: "none" }}
            >
              <span className="coffee-text">Try LandKoala</span>
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
