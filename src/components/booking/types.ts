export type Service = { id: string; name: string; category: string; description: string; durationMin: number; price: number; masterIds: string[] };
export type Master = { id: string; name: string; specialty: string; color: string; serviceIds: string[] };
export type Slot = { time: number; masterIds: string[] };
export type Done = { service: string; master: string; date: string; time: string; price: number };
export type ContactForm = { clientName: string; phone: string; car: string; comment: string };
