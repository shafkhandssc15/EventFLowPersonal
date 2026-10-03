// Curated high-resolution photography for Sri Lankan events and venues
export const EVENT_PHOTOS: Record<string, string> = {
  // Sri Lanka AI & Tech Innovation Summit
  '33333333-0000-0000-0000-000000000001':
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=85',
  // Colombo International Music & Arts Festival
  '33333333-0000-0000-0000-000000000002':
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=85',
  // Ceylon Grand Culinary & Tea Masters Forum
  '33333333-0000-0000-0000-000000000003':
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=85',
  // Lanka Premier Esports Championship Grand Finals
  '33333333-0000-0000-0000-000000000004':
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=85',
  // Galle Heritage & International Design Forum
  '33333333-0000-0000-0000-000000000005':
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=85',
  // Sri Lanka Venture & Diaspora Capital Forum
  '33333333-0000-0000-0000-000000000006':
    'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=85',
};

export const CATEGORY_GRADIENTS: Record<string, string> = {
  Technology: 'from-blue-600 via-indigo-600 to-cyan-500',
  Music: 'from-fuchsia-600 via-pink-600 to-rose-500',
  Food: 'from-amber-500 via-orange-600 to-red-600',
  Sports: 'from-emerald-500 via-teal-600 to-cyan-600',
  Art: 'from-violet-600 via-purple-600 to-pink-500',
  Business: 'from-slate-700 via-slate-800 to-blue-900',
  General: 'from-blue-600 to-indigo-700',
};

export interface StoryHighlight {
  id: string;
  title: string;
  subtitle: string;
  avatar: string;
  image: string;
  location: string;
  badge: string;
  eventId?: string;
}
