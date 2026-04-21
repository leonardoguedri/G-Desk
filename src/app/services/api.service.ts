import { Injectable } from '@angular/core';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private api = 'http://localhost:3000';

  constructor(private authService: AuthService) {}

  private headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authService.getToken()}`
    };
  }

  async get(path: string) {
    const res = await fetch(`${this.api}${path}`, {
      headers: this.headers()
    });
    return res.json();
  }

  async post(path: string, body: any) {
    const res = await fetch(`${this.api}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body)
    });
    return res.json();
  }

  async put(path: string, body: any) {
    const res = await fetch(`${this.api}${path}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify(body)
    });
    return res.json();
  }

  async delete(path: string) {
    const res = await fetch(`${this.api}${path}`, {
      method: 'DELETE',
      headers: this.headers()
    });
    return res.json();
  }

  async upload(path: string, formData: FormData) {
    const res = await fetch(`${this.api}${path}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.authService.getToken()}` },
      body: formData
    });
    return res.json();
  }
}