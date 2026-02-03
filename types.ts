export interface UserProfile 
  id: string;
  name: string;
  avatarColor: string;
  status: 'active' | 'idle';
}

export interface Workspace {
  id: string;
  name: string;
  type: 'personal' | 'team';
  memberCount: number;
}

export interface Document {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string;
  status: 'processing' | 'ready' | 'error';
  timestamp: number;
  synthesis?: string; 
  ownerId: string;
  visibility: 'private' | 'shared';
}

export type SupportedLanguage = 
  | 'Afrikaans' | 'Albanian' | 'Amharic' | 'Arabic' | 'Armenian' | 'Assamese' | 'Aymara' | 'Azerbaijani'
  | 'Bambara' | 'Basque' | 'Belarusian' | 'Bengali' | 'Bhojpuri' | 'Bosnian' | 'Bulgarian' | 'Burmese' 
  | 'Catalan' | 'Cebuano' | 'Chichewa' | 'Chinese (Simplified)' | 'Chinese (Traditional)' | 'Corsican' 
  | 'Croatian' | 'Czech' | 'Danish' | 'Dhivehi' | 'Dogri' | 'Dutch' | 'English' | 'Esperanto' | 'Estonian' 
  | 'Ewe' | 'Filipino' | 'Finnish' | 'French' | 'Frisian' | 'Galician' | 'Georgian' | 'German' | 'Greek' 
  | 'Guarani' | 'Gujarati' | 'Haitian Creole' | 'Hausa' | 'Hawaiian' | 'Hebrew' | 'Hindi' | 'Hmong' 
  | 'Hungarian' | 'Icelandic' | 'Igbo' | 'Ilocano' | 'Indonesian' | 'Irish' | 'Italian' | 'Japanese' 
  | 'Javanese' | 'Kannada' | 'Kazakh' | 'Khmer' | 'Kinyarwanda' | 'Konkani' | 'Korean' | 'Krio' 
  | 'Kurdish' | 'Kurdish (Sorani)' | 'Kyrgyz' | 'Lao' | 'Latin' | 'Latvian' | 'Lingala' | 'Lithuanian' 
  | 'Luganda' | 'Luxembourgish' | 'Macedonian' | 'Maithili' | 'Malagasy' | 'Malay' | 'Malayalam' | 'Maltese' 
  | 'Maori' | 'Marathi' | 'Meiteilon (Manipuri)' | 'Mizo' | 'Mongolian' | 'Nepali' | 'Norwegian' | 'Odia (Oriya)' 
  | 'Oromo' | 'Pashto' | 'Persian' | 'Polish' | 'Portuguese' | 'Punjabi' | 'Quechua' | 'Romanian' | 'Russian' 
  | 'Samoan' | 'Sanskrit' | 'Scots Gaelic' | 'Sepedi' | 'Serbian' | 'Sesotho' | 'Shona' | 'Sindhi' | 'Sinhala' 
  | 'Slovak' | 'Slovenian' | 'Somali' | 'Spanish' | 'Sundanese' | 'Swahili' | 'Swedish' | 'Tajik' | 'Tamil' 
  | 'Tatar' | 'Telugu' | 'Thai' | 'Tigrinya' | 'Tsonga' | 'Turkish' | 'Turkmen' | 'Twi' | 'Ukrainian' | 'Urdu' 
  | 'Uyghur' | 'Uzbek' | 'Vietnamese' | 'Welsh' | 'Xhosa' | 'Yiddish' | 'Yoruba' | 'Zulu';

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
  userId?: string;
}

export interface SystemLog {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}
