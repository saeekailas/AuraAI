
export interface Document {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string;
  status: 'processing' | 'ready' | 'error';
  timestamp: number;
  synthesis?: string; 
}

export type SupportedLanguage = 
  | 'Afrikaans' | 'Albanian' | 'Amharic' | 'Arabic' | 'Armenian' | 'Azerbaijani'
  | 'Bengali' | 'Bosnian' | 'Bulgarian' | 'Burmese' | 'Catalan' | 'Chinese' 
  | 'Croatian' | 'Czech' | 'Danish' | 'Dutch' | 'English' | 'Estonian' 
  | 'Finnish' | 'French' | 'Georgian' | 'German' | 'Greek' | 'Gujarati' 
  | 'Hausa' | 'Hebrew' | 'Hindi' | 'Hungarian' | 'Icelandic' | 'Igbo' 
  | 'Indonesian' | 'Italian' | 'Japanese' | 'Kannada' | 'Kazakh' | 'Khmer' 
  | 'Korean' | 'Lao' | 'Latvian' | 'Lithuanian' | 'Macedonian' | 'Malay' 
  | 'Malayalam' | 'Marathi' | 'Mongolian' | 'Nepali' | 'Norwegian' | 'Pashto' 
  | 'Persian' | 'Polish' | 'Portuguese' | 'Punjabi' | 'Romanian' | 'Russian' 
  | 'Serbian' | 'Slovak' | 'Slovenian' | 'Somali' | 'Spanish' | 'Swahili' 
  | 'Swedish' | 'Tagalog' | 'Tamil' | 'Telugu' | 'Thai' | 'Turkish' 
  | 'Ukrainian' | 'Urdu' | 'Uzbek' | 'Vietnamese' | 'Welsh' | 'Yoruba' | 'Zulu';

export interface Asset {
  id: string;
  name: string;
  data: string; // base64
  mimeType: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  assets?: Asset[];
  groundingUrls?: { uri: string; title: string }[];
}

export interface SystemLog {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}
