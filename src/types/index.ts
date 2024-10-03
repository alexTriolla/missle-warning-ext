// src/types.ts

export interface AlertResponse {
  items: AlertItem[];
}

export interface AlertItem {
  id: string;
  alertid: string;
  time: string;
  category: string;
  header: string;
  text: string;
  ttlseconds: string;
  redwebno: string;
  title: string;
}
