const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';

import { Calendar } from 'lucide-react';
import moment from 'moment';

const CATEGORIES = ['all', 'tax', 'insurance', 'immigration', 'ai', 'general'];

export default function Blog() {
  const { t, lang } = useOutletContext();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    const loadPosts = async () => {
      const allPosts = await db.entities.BlogPost.filter({ published: true }, '-created_date');
      setPosts(allPosts);
      setLoading(false);
    };
    loadPosts();
  }, []);

  const categoryLabels = {
    all: t('blog_all'), tax: t('blog_tax'), insurance: t('blog_insurance'),
    immigration: t('blog_immigration'), ai: t('blog_ai'), general: t('blog_general'),
  };

  const filtered = activeCategory === 'all' ? posts : posts.filter(p => p.category === activeCategory);

  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h1 className="text-4xl lg:text-5xl font-bold text-charcoal mb-3">{t('blog_title')}</h1>
          <p className="text-muted-foreground text-lg">{t('blog_subtitle')}</p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-primary text-white'
                  : 'bg-teal-light text-muted-foreground hover:bg-primary/10'
              }`}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">{t('blog_empty')}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
              >
                {post.cover_image_url && (
                  <div className="aspect-video overflow-hidden">
                    <img 
                      src={post.cover_image_url} 
                      alt={lang === 'vi' ? post.title_vi : post.title_en}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-light text-primary text-xs font-semibold">
                      {categoryLabels[post.category] || post.category}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground text-xs">
                      <Calendar className="h-3 w-3" />
                      {moment(post.created_date).format('MMM D, YYYY')}
                    </span>
                  </div>
                  <h2 className="font-bold text-charcoal text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {lang === 'vi' && post.title_vi ? post.title_vi : post.title_en}
                  </h2>
                  <p className="text-muted-foreground text-sm line-clamp-3">
                    {lang === 'vi' && post.excerpt_vi ? post.excerpt_vi : post.excerpt_en}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}