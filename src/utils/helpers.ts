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
  'School of Engineering', 'School of ICT', 'School of Business', 
  'School of Hospitality', 'School of Agriculture', 'School of Health Sciences',
  'School of Building & Construction'
];

export const COURSES: Record<string, string[]> = {
  'School of Engineering': [
    'Electrical and Electronics Engineering', 'Mechanical Engineering',
    'Automotive Engineering', 'Civil Engineering', 'Welding and Fabrication'
  ],
  'School of ICT': [
    'Information Communication Technology', 'Computer Science',
    'Software Development', 'Networking and Systems Administration'
  ],
  'School of Business': [
    'Business Management', 'Accounting', 'Supply Chain Management',
    'Human Resource Management', 'Marketing'
  ],
  'School of Hospitality': [
    'Food and Beverage', 'Housekeeping', 'Front Office Operations',
    'Catering and Accommodation'
  ],
  'School of Agriculture': [
    'Agricultural Engineering', 'Crop Production', 'Animal Production',
    'Agribusiness Management'
  ],
  'School of Health Sciences': [
    'Community Health', 'Nutrition and Dietetics', 'Medical Laboratory Technology'
  ],
  'School of Building & Construction': [
    'Building Technology', 'Plumbing', 'Carpentry and Joinery', 'Architecture'
  ],
};

export const ALL_COURSES = Object.values(COURSES).flat();
