const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';

import { ArrowLeft, Calendar } from 'lucide-react';
import moment from 'moment';
import ReactMarkdown from 'react-markdown';

export default function BlogPost() {
  const { t, lang } = useOutletContext();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  const slug = window.location.pathname.split('/blog/')[1];

  useEffect(() => {
    const loadPost = async () => {
      const posts = await db.entities.BlogPost.filter({ slug, published: true });
      if (posts.length > 0) setPost(posts[0]);
      setLoading(false);
    };
    loadPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-32 text-center">
        <p className="text-muted-foreground text-lg">Post not found.</p>
        <Link to="/blog" className="text-primary font-semibold mt-4 inline-block">{t('blog_back')}</Link>
      </div>
    );
  }

  const title = lang === 'vi' && post.title_vi ? post.title_vi : post.title_en;
  const content = lang === 'vi' && post.content_vi ? post.content_vi : post.content_en;

  return (
    <div className="py-16 lg:py-24">
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/blog" className="inline-flex items-center gap-1 text-primary text-sm font-medium mb-8 hover:gap-2 transition-all">
          <ArrowLeft className="h-4 w-4" />
          {t('blog_back')}
        </Link>

        {post.cover_image_url && (
          <div className="rounded-2xl overflow-hidden mb-8">
            <img src={post.cover_image_url} alt={title} className="w-full h-64 lg:h-80 object-cover" />
          </div>
        )}

        <div className="flex items-center gap-3 mb-6">
          <span className="px-3 py-1 rounded-full bg-teal-light text-primary text-xs font-semibold">
            {post.category}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground text-sm">
            <Calendar className="h-3.5 w-3.5" />
            {moment(post.created_date).format('MMMM D, YYYY')}
          </span>
        </div>

        <h1 className="text-3xl lg:text-4xl font-bold text-charcoal mb-8 leading-tight">{title}</h1>

        <div className="prose prose-lg max-w-none prose-headings:text-charcoal prose-p:text-muted-foreground prose-a:text-primary">
          {content && content.startsWith('<') ? (
            <div dangerouslySetInnerHTML={{ __html: content }} />
          ) : (
            <ReactMarkdown>{content || ''}</ReactMarkdown>
          )}
        </div>
      </article>
    </div>
  );
}