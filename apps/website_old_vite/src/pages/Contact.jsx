const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Phone, Facebook, MapPin, Send, Calendar, CheckCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Contact() {
  const { t } = useOutletContext();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', service_type: '', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await db.entities.ContactSubmission.create({ ...form, status: 'new' });
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h1 className="text-4xl lg:text-5xl font-bold text-charcoal mb-3">{t('contact_page_title')}</h1>
          <p className="text-muted-foreground text-lg">{t('contact_page_desc')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-8 shadow-sm">
            <h2 className="text-xl font-bold text-charcoal mb-6">{t('contact_form_title')}</h2>
            
            {submitted ? (
              <div className="text-center py-12">
                <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
                <p className="text-charcoal font-semibold text-lg">{t('contact_form_success')}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1.5">{t('contact_form_name')}</label>
                    <Input 
                      required
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      className="rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1.5">{t('contact_form_phone')}</label>
                    <Input 
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="rounded-lg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1.5">{t('contact_form_email')}</label>
                    <Input 
                      type="email" 
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1.5">{t('contact_form_service')}</label>
                    <Select onValueChange={(v) => setForm({ ...form, service_type: v })} required>
                      <SelectTrigger className="rounded-lg">
                        <SelectValue placeholder={t('contact_select_service')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tax">{t('services_tax_title')}</SelectItem>
                        <SelectItem value="insurance">{t('services_insurance_title')}</SelectItem>
                        <SelectItem value="immigration">{t('services_immigration_title')}</SelectItem>
                        <SelectItem value="ai">{t('services_ai_title')}</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1.5">{t('contact_form_message')}</label>
                  <Textarea 
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="rounded-lg"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-primary hover:bg-teal-dark text-white rounded-full gap-2"
                  size="lg"
                >
                  <Send className="h-4 w-4" />
                  {loading ? '...' : t('contact_form_submit')}
                </Button>
              </form>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Book */}
            <div className="bg-teal-light rounded-2xl p-6 border border-primary/20">
              <Calendar className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-bold text-charcoal text-lg mb-2">{t('contact_book_title')}</h3>
              <p className="text-muted-foreground text-sm mb-4">{t('contact_book_desc')}</p>
              <Button className="w-full bg-primary hover:bg-teal-dark text-white rounded-full gap-2">
                <Calendar className="h-4 w-4" />
                {t('contact_book_btn')}
              </Button>
            </div>

            {/* Direct Contact */}
            <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="font-bold text-charcoal text-lg mb-4">{t('contact_direct_title')}</h3>
              <div className="space-y-4">
                <a href="tel:3468524454" className="flex items-center gap-3 p-3 rounded-xl hover:bg-teal-light transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-charcoal font-semibold text-sm">346-852-4454</p>
                  </div>
                </a>
                <a href="https://facebook.com/mannaonesolution" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl hover:bg-teal-light transition-colors">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <Facebook className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Facebook</p>
                    <p className="text-charcoal font-semibold text-sm">Manna One Solution</p>
                  </div>
                </a>
                <div className="flex items-center gap-3 p-3 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-charcoal font-semibold text-sm">Houston, TX</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}