import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { SimpleTable } from '../components/SimpleTable';

export default function Website() {
  const { profile } = useAuth();
  const [gallery, setGallery] = useState([]);
  const [pages, setPages] = useState([]);
  const [galleryUrl, setGalleryUrl] = useState('');
  const [pageForm, setPageForm] = useState({ slug: '', title: '', content: '' });

  const load = async () => {
    const [g, p] = await Promise.all([
      supabase.from('gallery_items').select('*').eq('school_id', profile?.school_id).order('created_at', { ascending: false }),
      supabase.from('pages').select('id, slug, title, published').eq('school_id', profile?.school_id)
    ]);
    setGallery(g.data ?? []);
    setPages(p.data ?? []);
  };

  useEffect(() => {
    if (profile?.school_id) load();
  }, [profile?.school_id]);

  const addImage = async (e) => {
    e.preventDefault();
    await supabase.from('gallery_items').insert({ school_id: profile.school_id, image_url: galleryUrl });
    setGalleryUrl('');
    load();
  };

  const addPage = async (e) => {
    e.preventDefault();
    await supabase.from('pages').insert({
      school_id: profile.school_id,
      slug: pageForm.slug,
      title: pageForm.title,
      content: [{ type: 'richtext', value: pageForm.content }],
      published: true
    });
    setPageForm({ slug: '', title: '', content: '' });
    load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Website Manager</h1>
        <p className="text-sm text-slate-500">Gallery, sliders, and custom pages for each school.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-card border border-slate-100 space-y-3">
          <h3 className="font-semibold">Gallery</h3>
          <form onSubmit={addImage} className="flex gap-2 text-sm">
            <input className="border border-slate-200 rounded-lg px-3 py-2 flex-1" placeholder="Image URL" value={galleryUrl} onChange={(e) => setGalleryUrl(e.target.value)} required />
            <button className="rounded-lg bg-brand-600 text-white px-3 py-2 font-semibold">Add</button>
          </form>
          <div className="grid grid-cols-2 gap-2">
            {gallery.map((g) => (
              <img key={g.id} src={g.image_url} alt="gallery" className="rounded-lg border border-slate-200 object-cover h-24 w-full" />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-card border border-slate-100 space-y-3">
          <h3 className="font-semibold">Pages</h3>
          <form onSubmit={addPage} className="grid grid-cols-1 gap-2 text-sm">
            <input className="border border-slate-200 rounded-lg px-3 py-2" placeholder="Slug (e.g., about-us)" value={pageForm.slug} onChange={(e) => setPageForm((f) => ({ ...f, slug: e.target.value }))} required />
            <input className="border border-slate-200 rounded-lg px-3 py-2" placeholder="Title" value={pageForm.title} onChange={(e) => setPageForm((f) => ({ ...f, title: e.target.value }))} required />
            <textarea className="border border-slate-200 rounded-lg px-3 py-2" rows={3} placeholder="Content" value={pageForm.content} onChange={(e) => setPageForm((f) => ({ ...f, content: e.target.value }))} />
            <button className="rounded-lg bg-slate-900 text-white px-3 py-2 font-semibold">Publish</button>
          </form>
          <SimpleTable headers={['Slug', 'Title', 'Published']} rows={pages.map((p) => [p.slug, p.title, p.published ? 'Yes' : 'No'])} />
        </div>
      </div>
    </div>
  );
}
