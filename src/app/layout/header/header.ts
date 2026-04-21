import { Component } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  template: `
    <header class="header">
      <h2>Sistema de Gestão</h2>
    </header>
  `,
  styleUrls: ['./header.css']
})
export class HeaderComponent {}
