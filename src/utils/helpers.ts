import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `Letvc@${password}`;
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const KENYA_COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa',
  'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi',
  'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu', 'Machakos',
  'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa', 'Murang\'a',
  'Nairobi', 'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri',
  'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi', 'Trans Nzoia',
  'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot'
];

export const DEPARTMENTS = [
  'Business Department',
  'ICT',
  'Building and Construction',
  'Electrical Engineering',
  'Hospitality/Fashion/Cosmetology',
  'Mechanical',
  'Automotive',
];

export const COURSES: Record<string, string[]> = {
  'Business Department': [
    'Supply Chain Management',
    'Social Work and Community Development',
    'Accountancy',
    'Secretarial Studies/Office Administration',
  ],
  'ICT': [
    'Information Communication Technology',
  ],
  'Building and Construction': [
    'Building Technology',
    'Water Technology',
    'Plumbing',
    'Masonry',
  ],
  'Electrical Engineering': [
    'Electronics Engineering',
    'Electrical Installation',
  ],
  'Hospitality/Fashion/Cosmetology': [
    'Tourism Management',
    'Tours and Travels Operations',
    'Food and Beverage',
    'Catering and Accommodation Management',
    'Fashion Design and Clothing Technology',
    'Cosmetology',
  ],
  'Mechanical': [
    'Welding and Fabrication',
  ],
  'Automotive': [
    'Automotive Engineering',
  ],
};

export const ALL_COURSES = Object.values(COURSES).flat();
