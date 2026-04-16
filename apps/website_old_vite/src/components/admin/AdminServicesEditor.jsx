import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';

// Default services data matching the existing site
const DEFAULT_SERVICES = {
  tax: {
    label: 'Tax & Business',
    color: 'bg-amber-50 border-amber-200',
    headerColor: 'bg-amber-100',
    items: [
      { name: 'Individual Tax Preparation (Simple)', price: '$150 – $250' },
      { name: 'Individual Tax Preparation (Complex)', price: '$250 – $400' },
      { name: 'Extension Filing (Form 4868)', price: '$50 – $75' },
      { name: 'Business Tax (LLC/S-Corp)', price: '$400 – $800' },
      { name: 'LLC Setup (Full Package)', price: '$300 – $500 + state fee' },
    ],
  },
  insurance: {
    label: 'Insurance & Finance',
    color: 'bg-blue-50 border-blue-200',
    headerColor: 'bg-blue-100',
    items: [
      { name: 'Term Life Insurance', price: 'Free Consultation' },
      { name: 'Whole Life Insurance', price: 'Free Consultation' },
      { name: 'Indexed Universal Life (IUL)', price: 'Free Consultation' },
      { name: 'Annuity Plans', price: 'Free Consultation' },
      { name: 'Retirement Planning', price: 'Free Consultation' },
      { name: 'Auto / Home Insurance (P&C)', price: 'Custom Quote' },
    ],
  },
  immigration: {
    label: 'Immigration',
    color: 'bg-green-50 border-green-200',
    headerColor: 'bg-green-100',
    items: [
      { name: 'I-90 Green Card Renewal (Paper)', price: '$250 + $465 USCIS = $715' },
      { name: 'I-90 Green Card Renewal (Online)', price: '$250 + $415 USCIS = $665' },
      { name: 'N-400 Citizenship (Paper)', price: '$550 + $760 USCIS = $1,310' },
      { name: 'N-400 Citizenship (Online)', price: '$550 + $710 USCIS = $1,260' },
      { name: 'I-130 Family Petition', price: '$425 + $675 USCIS = $1,100' },
      { name: 'I-485 Adjustment of Status', price: '$650 + $1,440 USCIS = $2,090' },
      { name: 'I-765 Work Permit / EAD (Paper)', price: '$250 + $520 USCIS = $770' },
      { name: 'I-131 Travel Document', price: '$250 + $630 USCIS = $880' },
      { name: 'I-751 Remove Conditions', price: '$550 + $750 USCIS = $1,300' },
      { name: 'I-912 Fee Waiver', price: '$150 + $0 USCIS = $150' },
      { name: 'AR-11 Change of Address', price: '$50 + $0 USCIS = $50' },
      { name: 'Certified Translation (per page)', price: '$25/page' },
      { name: '⭐ Marriage Green Card Bundle', price: '$1,085 + $2,115 USCIS = $3,200' },
      { name: 'Citizenship Fast-Track Bundle', price: '$590 + $760 USCIS = $1,350' },
      { name: 'GC Renewal + Travel Doc Bundle', price: '$305 + $1,095 USCIS = $1,400' },
      { name: 'Remove Conditions + EAD Bundle', price: '$580 + $1,220 USCIS = $1,800' },
    ],
  },
  ai: {
    label: 'AI / Automation',
    color: 'bg-purple-50 border-purple-200',
    headerColor: 'bg-purple-100',
    items: [
      { name: 'Workflow Automation', price: 'Custom Quote' },
      { name: 'AI Tools for Small Businesses', price: 'Custom Quote' },
      { name: 'Business Digitization', price: 'Custom Quote' },
      { name: 'Monthly Retainer Support', price: 'Starting $200/mo' },
      { name: 'Free Discovery Call', price: 'Free' },
    ],
  },
};

const STORAGE_KEY = 'mannaos_services';

function getServices() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    // Merge with defaults so new categories/items always appear
    const merged = {};
    for (const key of Object.keys(DEFAULT_SERVICES)) {
      merged[key] = {
        ...DEFAULT_SERVICES[key],
        items: stored[key]?.items ?? DEFAULT_SERVICES[key].items,
      };
    }
    return merged;
  } catch { return DEFAULT_SERVICES; }
}

export function saveServices(data) {
  const toStore = {};
  for (const key of Object.keys(data)) {
    toStore[key] = { items: data[key].items };
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
}

export { getServices };

export default function AdminServicesEditor({ onDirty }) {
  const [services, setServices] = useState(getServices);
  const [open, setOpen] = useState({ tax: true, insurance: false, immigration: false, ai: false });

  function setItems(cat, items) {
    setServices(prev => ({ ...prev, [cat]: { ...prev[cat], items } }));
    onDirty?.();
  }

  function addItem(cat) {
    setItems(cat, [...services[cat].items, { name: '', price: '' }]);
  }

  function removeItem(cat, idx) {
    setItems(cat, services[cat].items.filter((_, i) => i !== idx));
  }

  function updateItem(cat, idx, field, value) {
    const items = services[cat].items.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item
    );
    setItems(cat, items);
  }

  function moveItem(cat, idx, dir) {
    const items = [...services[cat].items];
    const swap = idx + dir;
    if (swap < 0 || swap >= items.length) return;
    [items[idx], items[swap]] = [items[swap], items[idx]];
    setItems(cat, items);
  }

  // Expose save function to parent
  AdminServicesEditor.save = () => saveServices(services);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground bg-surface border border-border rounded-xl p-3">
        Add, edit, reorder or remove individual services under each category. Changes are saved when you click <strong>Save Changes</strong> above.
      </p>

      {Object.entries(services).map(([cat, { label, color, headerColor, items }]) => (
        <div key={cat} className={`rounded-2xl border ${color} overflow-hidden shadow-sm`}>
          {/* Category header */}
          <button
            onClick={() => setOpen(o => ({ ...o, [cat]: !o[cat] }))}
            className={`w-full flex items-center justify-between px-5 py-3 ${headerColor} text-left`}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-charcoal text-sm">{label}</span>
              <span className="text-xs text-muted-foreground">({items.length} services)</span>
            </div>
            {open[cat] ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {open[cat] && (
            <div className="p-4 space-y-2 bg-white/60">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white rounded-xl border border-border px-3 py-2 group">
                  {/* Reorder */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button onClick={() => moveItem(cat, idx, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-charcoal disabled:opacity-30">
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button onClick={() => moveItem(cat, idx, 1)} disabled={idx === items.length - 1} className="text-muted-foreground hover:text-charcoal disabled:opacity-30">
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Name */}
                  <Input
                    value={item.name}
                    onChange={e => updateItem(cat, idx, 'name', e.target.value)}
                    placeholder="Service name"
                    className="text-sm h-8 flex-1"
                  />

                  {/* Price */}
                  <Input
                    value={item.price}
                    onChange={e => updateItem(cat, idx, 'price', e.target.value)}
                    placeholder="Price / range"
                    className="text-sm h-8 w-44 shrink-0"
                  />

                  {/* Delete */}
                  <button
                    onClick={() => removeItem(cat, idx)}
                    className="shrink-0 p-1 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              <Button
                size="sm"
                variant="outline"
                onClick={() => addItem(cat)}
                className="w-full rounded-xl border-dashed gap-2 text-xs mt-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Service to {label}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}