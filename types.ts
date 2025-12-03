export interface WeatherData {
  temperature: number | string;
  weathercode: number;
  is_day: number;
}

export interface Reminder {
  type: 'alert' | 'action' | 'info' | 'default';
  text: string;
  time: string;
}

export interface DateInfo {
  day: number;
  weekday: string;
  month: string;
}

export enum NewsCategory {
  POLITICS = 'Politica',
  SPORTS = 'Esportes',
  CULTURE = 'Cultura'
}

export interface NewsItem {
  category: NewsCategory;
  text: string;
}