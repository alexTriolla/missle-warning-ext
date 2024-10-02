// Define the structure of an alert item from the API
export interface AlertItem {
    id: string;
    alertid: string;
    time: string; // Date string format
    category: string;
    header: string;
    text: string;
    ttlseconds: string;
    redwebno: string;
    title: string;
  }
  
  // Define the structure of the API response
  export interface AlertResponse {
    date: string;
    status: number;
    items: AlertItem[];
  }