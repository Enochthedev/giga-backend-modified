import axios from 'axios';

interface Event {
  name: string;
  service: string;
  payload: Record<string, any>;
}

interface ServiceUrlDict {
    [key: string]: string;
  }

export class EventSender {
    private serviceUrlDict: ServiceUrlDict;
    constructor() {
        // Dictionary to map event services to their base URLs
        this.serviceUrlDict = {
          user: 'https://user-service.herokuapp.com',
          payment: 'https://payment-service.herokuapp.com',
        };
    }
    

    public sendEvent(event: Event): Promise<any> {
    const serviceUrl = this.serviceUrlDict[event.service];

    if (!serviceUrl) {
        console.error('Invalid service:', event.service);
        return Promise.reject('Invalid service');
    }

    try {
        return this.apiCall(event.name,event.payload, serviceUrl);
    } catch (error) {
        return Promise.reject(error);
    }
    }

    private apiCall(name: any ,payload: any, serviceUrl: any ): Promise<any> {
        const url = `${serviceUrl}/${name}`;
        return axios.post(url, payload)
        .then(response => {
            console.log('User created successfully:', response.data);
            return response.data;
        })
        .catch(error => {
            console.error('Error creating user:', error.message);
            throw error;
        });
    }

  // Add more methods for other events
}


