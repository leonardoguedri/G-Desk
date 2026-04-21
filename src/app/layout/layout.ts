import { Component } from '@angular/core';
import { RouterOutlet, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterModule // 🔥 ESSENCIAL
  ],
  templateUrl: './layout.html',
  styleUrls: ['./layout.css']
})
export class LayoutComponent {

  sidebarMinimizada = false;

  constructor(private router: Router) {}

  toggleSidebar() {
    this.sidebarMinimizada = !this.sidebarMinimizada;
  }

  sair() {
  localStorage.removeItem('usuario');
  this.router.navigate(['/login']);
}
}