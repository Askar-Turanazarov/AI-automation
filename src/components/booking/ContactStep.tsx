"use client";

import { useI18n } from "@/i18n/client";
import type { ContactForm } from "./types";

export function ContactStep({ form, setForm }: { form: ContactForm; setForm: (form: ContactForm) => void }) {
  const b = useI18n().t.booking;
  return (
    <div className="card grid gap-4 p-6 sm:grid-cols-2">
      <div>
        <label className="label">{b.name} *</label>
        <input className="input" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder={b.namePh} autoComplete="name" />
      </div>
      <div>
        <label className="label">{b.phone} *</label>
        <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={b.phonePh} inputMode="tel" autoComplete="tel" />
      </div>
      <div className="sm:col-span-2">
        <label className="label">{b.car}</label>
        <input className="input" value={form.car} onChange={(e) => setForm({ ...form, car: e.target.value })} placeholder={b.carPh} />
      </div>
      <div className="sm:col-span-2">
        <label className="label">{b.comment}</label>
        <textarea className="input min-h-24" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder={b.commentPh} />
      </div>
    </div>
  );
}
